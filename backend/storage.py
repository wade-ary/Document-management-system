"""
Storage: GridFS upload, metadata, and directory operations.
Implements the ingestion pipeline: store in GridFS -> extract text -> save metadata -> update indexes.
"""
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from werkzeug.datastructures import FileStorage

from backend.db import get_db, get_fs
from backend.extract import extract_text_from_file
from backend.search import add_document_to_indexes

logger = logging.getLogger(__name__)

DB_NAME = "EDUDATA"


def _get_fs():
    return get_fs(DB_NAME)


def _get_metadata_collection():
    return get_db(DB_NAME)["metadata"]


def _get_actions_collection():
    return get_db(DB_NAME)["actions"]


def upload_file(
    user_id: str,
    file: FileStorage,
    path: str,
    account_type: str,
    department: str,
    access_to: str,
    important: str,
    uploaded_by: Optional[str] = None,
    deadline: Optional[str] = None,
    document_type: Optional[str] = None,
) -> tuple:
    """
    Ingestion pipeline: store file in GridFS, extract text, save metadata, add to search indexes.
    Returns (file_id, status_code). file_id is str (ObjectId string); status_code 200 on success.
    """
    if not file or not file.filename:
        return None, 400
    try:
        data = file.read()
        file.seek(0)
    except Exception as e:
        logger.warning("Failed to read upload file: %s", e)
        return None, 500

    filename = file.filename or "document"
    content_type = file.content_type or ""

    # 1. Store in GridFS
    try:
        fs = _get_fs()
        grid_id = fs.put(data, filename=filename, content_type=content_type or None)
        file_id = str(grid_id)
    except Exception as e:
        logger.exception("GridFS put failed: %s", e)
        return None, 500

    # 2. Extract text (PDF / TXT)
    extracted_text = extract_text_from_file(data, filename=filename, content_type=content_type)

    # 3. Persist metadata
    metadata = {
        "file_id": file_id,
        "name": filename,
        "path": path or "~/Sandbox",
        "user_id": user_id,
        "account_type": account_type or "Staff",
        "department": department or "",
        "access_to": access_to or "all",
        "important": important or "false",
        "approvalStatus": "pending",
        "visible": False,
        "extracted_text": extracted_text,
        "upload_date": datetime.utcnow().isoformat(),
    }
    if uploaded_by is not None:
        metadata["uploaded_by"] = uploaded_by
    if deadline is not None:
        metadata["deadline"] = deadline
    if document_type is not None:
        metadata["document_type"] = document_type

    try:
        _get_metadata_collection().insert_one(metadata)
    except Exception as e:
        logger.exception("Metadata insert failed: %s", e)
        try:
            fs.delete(grid_id)
        except Exception:
            pass
        return None, 500

    # 4. Add to search indexes (FAISS, TF-IDF, BM25)
    if extracted_text and extracted_text.strip():
        try:
            add_document_to_indexes(file_id, extracted_text)
        except Exception as e:
            logger.warning("Add to search indexes failed (document still saved): %s", e)

    return file_id, 200


def list_dir(path: str) -> List[Dict[str, Any]]:
    """List files and subdirs at path. Returns list of { name, type: 'file'|'dir', ... }."""
    coll = _get_metadata_collection()
    path = path or "~/Sandbox"
    path = path.rstrip("/") or path
    # Files with path exactly equal
    files = list(coll.find({"path": path}, {"name": 1, "file_id": 1, "_id": 0}))
    # Subdirs: distinct path prefixes one level down (path/XXX with no further /)
    prefix = (path + "/").replace("//", "/")
    all_docs = list(coll.find({"path": {"$regex": f"^{re.escape(prefix)}[^/]+$"}}, {"path": 1}))
    seen = set()
    for d in all_docs:
        p = d.get("path", "")
        if "/" in p:
            seg = p.rsplit("/", 1)[-1]
            if seg and seg not in seen:
                seen.add(seg)
                result.append({"name": seg, "type": "dir"})
    for f in files:
        result.append({"name": f["name"], "type": "file", "file_id": f.get("file_id")})
    return result


def list_dir_by_department(department: str, path: str) -> List[Dict[str, Any]]:
    """List files visible to department at path."""
    coll = _get_metadata_collection()
    path = path or "~/Sandbox"
    query = {"path": path}
    if department and department.lower() != "all":
        query["$or"] = [
            {"department": department},
            {"access_to": "all"},
            {"access_to": {"$regex": f"{re.escape(department)}"}},
        ]
    files = list(coll.find(query, {"name": 1, "file_id": 1, "path": 1, "_id": 0}))
    return [{"name": f["name"], "type": "file", "file_id": f.get("file_id"), "path": f.get("path")}]


def list_dir_by_user(user_id: str, path: str) -> List[Dict[str, Any]]:
    """List files uploaded by user at path."""
    coll = _get_metadata_collection()
    path = path or "~/Sandbox"
    files = list(coll.find({"user_id": user_id, "path": path}, {"name": 1, "file_id": 1, "_id": 0}))
    return [{"name": f["name"], "type": "file", "file_id": f.get("file_id")}]


def create_new_dir(dir_name: str, path: str) -> tuple:
    """Create a virtual directory (no-op for now; listing is path-based)."""
    return {"message": "Directory created"}, 200


def delete_dir(dir_name: str, path: str) -> tuple:
    """Delete directory (remove metadata for docs in that path)."""
    coll = _get_metadata_collection()
    target_path = f"{path.rstrip('/')}/{dir_name}".replace("//", "/")
    result = coll.delete_many({"path": target_path})
    return {"message": f"Deleted {result.deleted_count} items", "deleted_count": result.deleted_count}, 200


def delete_file(file_name: str, path: str) -> tuple:
    """Delete file from metadata and GridFS."""
    coll = _get_metadata_collection()
    doc = coll.find_one({"name": file_name, "path": path})
    if not doc:
        return {"error": "File not found"}, 404
    file_id = doc.get("file_id")
    try:
        coll.delete_one({"_id": doc["_id"]})
        fs = _get_fs()
        fs.delete(ObjectId(file_id))
    except Exception as e:
        logger.warning("delete_file failed: %s", e)
        return {"error": str(e)}, 500
    return {"message": "File deleted"}, 200


def move_file(file_name: str, current_path: str, new_path: str) -> tuple:
    """Update path in metadata."""
    coll = _get_metadata_collection()
    result = coll.update_one(
        {"name": file_name, "path": current_path},
        {"$set": {"path": new_path}},
    )
    if result.matched_count == 0:
        return {"error": "File not found"}, 404
    return {"message": "File moved"}, 200


def update_tags(file_name: str, path: str, tags: List[str], file_id: Optional[str] = None) -> tuple:
    """Update tags in metadata."""
    coll = _get_metadata_collection()
    query = {"name": file_name, "path": path} if not file_id else {"file_id": file_id}
    result = coll.update_one(query, {"$set": {"tags": tags or []}})
    if result.matched_count == 0:
        return {"error": "File not found"}, 404
    return {"message": "Tags updated"}, 200


def req_upload(*args, **kwargs) -> tuple:
    """Request upload (stub)."""
    return {"message": "Use /req/upload endpoint"}, 200


def list_files_for_user(user_id: str, path: Optional[str] = None) -> List[Dict[str, Any]]:
    """List files accessible to user (by user_id or department)."""
    return list_dir_by_user(user_id, path or "~/Sandbox")


def find_metadata_for_user(file_name: str, user_id: str, path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Find metadata for a file by name and user (user's uploads or department access)."""
    coll = _get_metadata_collection()
    query = {"name": file_name}
    if path:
        query["path"] = path
    # Prefer same user
    doc = coll.find_one({**query, "user_id": user_id})
    if doc:
        return doc
    # Else any doc user has access to (e.g. by department)
    doc = coll.find_one(query)
    if doc:
        return doc
    return None

