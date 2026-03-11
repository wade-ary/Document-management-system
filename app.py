"""
KMRL Document Management API — minimal surface.
Only these endpoints: ingest, query_search, doc_search, retrieve_hard_filters, update, delete.
"""
import os
import re
import logging
import secrets

import dotenv
dotenv.load_dotenv()

os.environ.setdefault("ENABLE_MARKSHEET", "1")

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from backend.db import MongoDB
from backend.storage import upload_file, delete_file_by_id
from backend.ingest_errors import IngestHardFailureError
from backend.search import rebuild_search_indexes
from backend.retrieval import single_hop_retrieval
from backend.precedent_finder import find_precedents
from backend.search_init import init_search_engine

logging.getLogger("flask_cors").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY") or secrets.token_urlsafe(16)

CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": "*",
    }
})

# MongoDB
db = MongoDB.get_db("EDUDATA")
metadata_collection = db["metadata"]

try:
    init_search_engine()
except Exception as e:
    logger.exception("Search engine init failed: %s", e)

ALLOWED_EXTENSIONS = {"txt", "docx", "pdf", "md", "ppt", "pptx", "png", "jpg", "jpeg"}


def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.errorhandler(HTTPException)
def handle_http(e):
    return jsonify({"error": e.name, "description": e.description}), e.code


@app.route("/")
def index():
    return jsonify({"service": "KMRL Document API", "endpoints": [
        "POST /api/ingest",
        "POST /api/query_search",
        "POST /api/doc_search",
        "POST /api/retrieve_hard_filters",
        "POST /api/update",
        "POST /api/delete",
    ]}), 200


# ---------------------------------------------------------------------------
# 1. ingest — standard ingestion pipeline for docs
# ---------------------------------------------------------------------------
@app.route("/api/ingest", methods=["POST"])
def api_ingest():
    """
    Standard ingestion: upload file(s), extract text, save metadata, add to search indexes.
    Form: multipart/form-data with 'file' or 'files', plus path, user_id, department, etc.
    Optional: account_type, access_to, important, deadline, document_type.
    """
    try:
        files = request.files.getlist("files") or request.files.getlist("file")
        if not files or (len(files) == 1 and (not files[0] or not files[0].filename)):
            return jsonify({"error": "At least one file is required"}), 400

        path = (request.form.get("path") or "~/Sandbox").strip()
        user_id = (request.form.get("user_id") or "").strip()
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        account_type = request.form.get("account_type") or "Staff"
        department = request.form.get("department") or ""
        access_to = request.form.get("access_to") or "all"
        important = request.form.get("important") or "false"
        deadline = request.form.get("deadline") or None
        document_type = request.form.get("document_type") or None

        results = []
        for f in files:
            if not f or not f.filename or not _allowed_file(f.filename):
                results.append({"filename": getattr(f, "filename", ""), "error": "Invalid or disallowed file"})
                continue
            try:
                file_id, status_code = upload_file(
                    user_id=user_id,
                    file=f,
                    path=path,
                    account_type=account_type,
                    department=department,
                    access_to=access_to,
                    important=important,
                    uploaded_by=None,
                    deadline=deadline,
                    document_type=document_type,
                )
            except IngestHardFailureError as e:
                results.append({"filename": f.filename, "error": e.message})
                continue
            if file_id and status_code == 200:
                metadata_collection.update_one(
                    {"file_id": file_id},
                    {"$set": {"approvalStatus": "approved", "visible": True}},
                )
                results.append({"file_id": file_id, "filename": f.filename, "status": "ingested"})
            else:
                results.append({"filename": f.filename, "error": "Upload failed", "status_code": status_code})

        return jsonify({"message": "Ingestion complete", "results": results}), 200
    except Exception as e:
        logger.exception("ingest: %s", e)
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# 2. query_search — retrieval using a query
# ---------------------------------------------------------------------------
@app.route("/api/query_search", methods=["POST"])
def api_query_search():
    """
    Retrieve documents by semantic/keyword search.
    Body: { "query": str (required), "top_k": int?, "filters": { date_from?, date_to?, department?, file_types? } }
    """
    try:
        data = request.get_json() or {}
        query = (data.get("query") or "").strip()
        if not query:
            return jsonify({"error": "query is required"}), 400
        top_k = max(1, min(int(data.get("top_k", 50)), 200))
        filters = data.get("filters") or {}
        docs = single_hop_retrieval(
            query=query,
            metadata_collection=metadata_collection,
            filters=filters if filters else None,
            final_top_k=top_k,
        )
        return jsonify({"results": docs, "count": len(docs)}), 200
    except Exception as e:
        logger.exception("query_search: %s", e)
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# 3. doc_search — document precedent finder (query using a doc)
# ---------------------------------------------------------------------------
@app.route("/api/doc_search", methods=["POST"])
def api_doc_search():
    """
    Find precedent documents similar to the given document.
    Body: { "file_id": str (required), "top_k": int?, "file_types": list?, "date_range": [from, to]? }
    """
    try:
        data = request.get_json() or {}
        file_id = (data.get("file_id") or "").strip()
        if not file_id:
            return jsonify({"error": "file_id is required"}), 400
        top_k = max(1, min(int(data.get("top_k", 50)), 200))
        file_types = data.get("file_types")
        date_range = data.get("date_range")
        if isinstance(date_range, list) and len(date_range) == 2:
            date_range = tuple(date_range)
        similarity_threshold = float(data.get("similarity_threshold", 0.2))
        result = find_precedents(
            file_id=file_id,
            similarity_threshold=similarity_threshold,
            top_k=top_k,
            file_types=file_types,
            date_range=date_range,
            metadata_collection=metadata_collection,
        )
        if result.get("error"):
            return jsonify(result), 404
        return jsonify(result), 200
    except Exception as e:
        logger.exception("doc_search: %s", e)
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# 4. retrieve_hard_filters — retrieve docs using hard filters on metadata
# ---------------------------------------------------------------------------
@app.route("/api/retrieve_hard_filters", methods=["POST"])
def api_retrieve_hard_filters():
    """
    Retrieve documents by metadata filters only (no semantic search).
    Body: { "filters": { "department"?, "date_from"?, "date_to"?, "file_types"?, "tags"?, "path"?, "user_id"?, ... }, "limit"?, "exclude_extracted_text"? }
    """
    try:
        data = request.get_json() or {}
        filters = data.get("filters") or {}
        limit = max(1, min(int(data.get("limit", 500)), 1000))
        exclude_text = data.get("exclude_extracted_text", True)

        mongo_filter = {}
        if filters.get("department"):
            mongo_filter["department"] = filters["department"]
        if filters.get("path"):
            mongo_filter["path"] = filters["path"]
        if filters.get("user_id"):
            mongo_filter["user_id"] = filters["user_id"]
        if filters.get("approvalStatus"):
            mongo_filter["approvalStatus"] = filters["approvalStatus"]
        if filters.get("visible") is not None:
            mongo_filter["visible"] = bool(filters["visible"])

        if filters.get("date_from") or filters.get("date_to"):
            mongo_filter["upload_date"] = {}
            if filters.get("date_from"):
                mongo_filter["upload_date"]["$gte"] = filters["date_from"]
            if filters.get("date_to"):
                mongo_filter["upload_date"]["$lte"] = filters["date_to"]

        if filters.get("file_types"):
            exts = [e.replace(".", "").lower() for e in filters["file_types"]]
            mongo_filter["name"] = {"$regex": r"\.(" + "|".join(re.escape(e) for e in exts) + r")$", "$options": "i"}

        if filters.get("tags"):
            tags = filters["tags"] if isinstance(filters["tags"], list) else [filters["tags"]]
            mongo_filter["tags"] = {"$in": tags}

        projection = None
        if exclude_text:
            projection = {"extracted_text": 0}

        cursor = metadata_collection.find(mongo_filter, projection).limit(limit)
        docs = list(cursor)
        for d in docs:
            if "_id" in d:
                d["_id"] = str(d["_id"])
        return jsonify({"results": docs, "count": len(docs)}), 200
    except Exception as e:
        logger.exception("retrieve_hard_filters: %s", e)
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# 5. update — update anything about the doc (metadata)
# ---------------------------------------------------------------------------
@app.route("/api/update", methods=["POST", "PUT"])
def api_update():
    """
    Update document metadata by file_id.
    Body: { "file_id": str (required), "updates": { ... } }
    Cannot update _id or file_id. Other fields (tags, department, path, name, etc.) are allowed.
    """
    try:
        data = request.get_json() or {}
        file_id = (data.get("file_id") or "").strip()
        updates = data.get("updates")
        if not file_id:
            return jsonify({"error": "file_id is required"}), 400
        if not updates or not isinstance(updates, dict):
            return jsonify({"error": "updates object is required"}), 400

        disallow = {"_id", "file_id"}
        set_dict = {k: v for k, v in updates.items() if k not in disallow}
        if not set_dict:
            return jsonify({"error": "No allowed fields to update"}), 400

        result = metadata_collection.update_one(
            {"file_id": file_id},
            {"$set": set_dict},
        )
        if result.matched_count == 0:
            return jsonify({"error": "Document not found"}), 404
        return jsonify({"message": "Document updated", "file_id": file_id}), 200
    except Exception as e:
        logger.exception("update: %s", e)
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# 6. delete — delete a doc from all places (metadata, GridFS, search indexes)
# ---------------------------------------------------------------------------
@app.route("/api/delete", methods=["POST", "DELETE"])
def api_delete():
    """
    Delete document by file_id from metadata, GridFS, and search indexes.
    Body: { "file_id": str (required) }
    """
    try:
        data = request.get_json() or {}
        file_id = (data.get("file_id") or "").strip()
        if not file_id:
            return jsonify({"error": "file_id is required"}), 400

        result, status_code = delete_file_by_id(file_id)
        if status_code != 200:
            return jsonify(result), status_code

        rebuild_search_indexes(metadata_collection=metadata_collection)
        return jsonify({"message": "Document deleted", "file_id": file_id}), 200
    except Exception as e:
        logger.exception("delete: %s", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", 7138)), host="0.0.0.0")
