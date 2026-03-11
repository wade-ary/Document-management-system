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
from backend.query_errors import (
    QueryHardFailureError,
    MSG_EMPTY_QUERY,
    MSG_BOTH_INDEXES_UNAVAILABLE,
    MSG_INVALID_FILTER_PARAMS,
    MSG_UNAUTHORIZED_QUERY,
    MSG_REQUEST_TOO_LARGE,
    MSG_DB_CONNECTION,
    MSG_UPDATE_FIELD_EMPTY,
    MSG_UPDATE_FIELD_INVALID,
    MSG_UPDATE_NO_PERMISSION,
    MSG_DELETE_DB_CONNECTION,
    MSG_DELETE_FILE_NOT_FOUND,
    MSG_DELETE_NO_PERMISSION,
)
from backend.query_search_validation import validate_query_filters, validate_retrieve_hard_filters_params
from backend.guardrails import get_search_availability
from backend.search import rebuild_search_indexes
from backend.retrieval import single_hop_retrieval, multi_hop_retrieval
from backend.query_classifier import classify_query, DEFAULT_INTENT_QUERY_SEARCH
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

# Query search limits (hard failure if exceeded)
MAX_QUERY_LENGTH = 10_000
MAX_QUERY_REQUEST_BODY_BYTES = 500_000


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
# Hard failures: empty query, both indexes unavailable, invalid filters, unauthorized, request too large.
# Soft failures: index partial (use available), reranker timeout (fused only), few candidates (expand+rerun),
#                classification failure (multi-hop), metadata parse failure (ignore filter), embedding failure (lexical only).
# ---------------------------------------------------------------------------
@app.route("/api/query_search", methods=["POST"])
def api_query_search():
    """
    Retrieve documents by semantic/keyword search.
    Body: { "query": str (required), "top_k": int?, "filters": { date_from?, date_to?, department?, file_types? }, "user_id"?, "allowed_departments"? }
    """
    try:
        # --- Hard: request size ---
        body = request.get_data()
        if len(body) > MAX_QUERY_REQUEST_BODY_BYTES:
            raise QueryHardFailureError(MSG_REQUEST_TOO_LARGE)
        data = request.get_json() or {}
        query = (data.get("query") or "").strip()

        # --- Hard: empty query ---
        if not query:
            raise QueryHardFailureError(MSG_EMPTY_QUERY)
        if len(query) > MAX_QUERY_LENGTH:
            raise QueryHardFailureError(MSG_REQUEST_TOO_LARGE)

        # --- Hard: both indexes unavailable ---
        availability = get_search_availability()
        if availability.get("status") == "down":
            raise QueryHardFailureError(
                availability.get("message", MSG_BOTH_INDEXES_UNAVAILABLE)
            )

        # --- Hard: invalid filter parameters ---
        raw_filters = data.get("filters") or {}
        try:
            filters = validate_query_filters(raw_filters) if raw_filters else None
        except QueryHardFailureError:
            raise
        # Soft: metadata parsing failure (from query) — if we had query-derived filters and they failed, we would ignore and run general search (no impl yet)
        # if filters is None due to parse failure from query text, we already run without filters here.

        # --- Hard: unauthorized (user requesting docs outside permission scope) ---
        user_id = data.get("user_id")
        allowed_departments = data.get("allowed_departments")
        if user_id and allowed_departments is not None and isinstance(allowed_departments, list):
            req_dept = (raw_filters.get("department") or (raw_filters.get("departments") or [None])[0] if isinstance(raw_filters.get("departments"), list) else None) or raw_filters.get("department")
            if req_dept is not None and str(req_dept).strip() and str(req_dept).strip().lower() not in [str(d).strip().lower() for d in allowed_departments]:
                raise QueryHardFailureError(MSG_UNAUTHORIZED_QUERY)

        top_k = max(1, min(int(data.get("top_k", 50)), 200))

        # --- Soft: query classification failure -> default to multi-hop ---
        classification = classify_query(query, default_on_failure=DEFAULT_INTENT_QUERY_SEARCH)
        intent = classification.get("intent", "multi_hop")

        # Run retrieval (soft: index partial, reranker timeout, few candidates, embedding failure are handled inside retrieval/search)
        if intent == "multi_hop":
            docs = multi_hop_retrieval(
                query=query,
                metadata_collection=metadata_collection,
                filters=filters,
                final_top_k=top_k,
            )
        else:
            docs = single_hop_retrieval(
                query=query,
                metadata_collection=metadata_collection,
                filters=filters,
                final_top_k=top_k,
            )
        return jsonify({"results": docs, "count": len(docs)}), 200
    except QueryHardFailureError as e:
        return jsonify({"error": e.message}), 400
    except Exception as e:
        logger.exception("query_search: %s", e)
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# 3. doc_search — document precedent finder (query using a doc)
# Same corpus as query_search (ingested docs). Hard: both indexes unavailable. Soft: partial index, reranker timeout, embedding failure.
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

        # --- Hard: both indexes unavailable ---
        availability = get_search_availability()
        if availability.get("status") == "down":
            raise QueryHardFailureError(
                availability.get("message", MSG_BOTH_INDEXES_UNAVAILABLE)
            )

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
    except QueryHardFailureError as e:
        return jsonify({"error": e.message}), 400
    except Exception as e:
        logger.exception("doc_search: %s", e)
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# 4. retrieve_hard_filters — retrieve docs using hard filters on metadata
# Hard failures only: invalid params, MongoDB/GridFS connection error.
# ---------------------------------------------------------------------------
@app.route("/api/retrieve_hard_filters", methods=["POST"])
def api_retrieve_hard_filters():
    """
    Retrieve documents by metadata filters only (no semantic search).
    Body: { "filters": { "department"?, "date_from"?, "date_to"?, "file_types"?, "tags"?, "path"?, "user_id"?, ... }, "limit"?, "exclude_extracted_text"? }
    """
    try:
        data = request.get_json() or {}

        # --- Hard: invalid params ---
        try:
            mongo_filter, limit, projection = validate_retrieve_hard_filters_params(data)
        except QueryHardFailureError:
            raise

        # --- Hard: database (Mongo/GridFS) connection ---
        try:
            cursor = metadata_collection.find(mongo_filter, projection).limit(limit)
            docs = list(cursor)
        except Exception as e:
            try:
                import pymongo.errors
                if isinstance(e, (pymongo.errors.ServerSelectionTimeoutError, pymongo.errors.ConnectionFailure, pymongo.errors.ExecutionTimeout)):
                    raise QueryHardFailureError(MSG_DB_CONNECTION)
            except ImportError:
                pass
            logger.exception("retrieve_hard_filters DB error: %s", e)
            raise

        for d in docs:
            if "_id" in d:
                d["_id"] = str(d["_id"])
        return jsonify({"results": docs, "count": len(docs)}), 200
    except QueryHardFailureError as e:
        return jsonify({"error": e.message}), 400
    except Exception as e:
        logger.exception("retrieve_hard_filters: %s", e)
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# 5. update — update anything about the doc (metadata)
# Hard failures: field empty (file_id), field invalid value, no permission (TBD placeholder).
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

        # --- Hard: field cannot be empty (file_id) ---
        file_id = (data.get("file_id") or "").strip()
        if not file_id:
            raise QueryHardFailureError(MSG_UPDATE_FIELD_EMPTY)

        updates = data.get("updates")
        if not updates or not isinstance(updates, dict):
            raise QueryHardFailureError("updates cannot be empty.")

        disallow = {"_id", "file_id"}
        set_dict = {}
        for k, v in updates.items():
            if k in disallow:
                continue
            # --- Hard: field cannot have invalid value ---
            if v is None:
                raise QueryHardFailureError(MSG_UPDATE_FIELD_INVALID.format(k))
            if isinstance(v, (str, int, float, bool, list, dict)):
                set_dict[k] = v
            else:
                raise QueryHardFailureError(MSG_UPDATE_FIELD_INVALID.format(k))
        if not set_dict:
            raise QueryHardFailureError(MSG_UPDATE_FIELD_INVALID.format("updates"))

        # --- Hard: don't have permission to update given doc (TBD placeholder) ---
        # TODO: implement permission check (e.g. user_id / allowed_roles in request; verify user can update this file_id)
        # if not _can_update_document(user_id=data.get("user_id"), file_id=file_id):
        #     raise QueryHardFailureError(MSG_UPDATE_NO_PERMISSION)

        result = metadata_collection.update_one(
            {"file_id": file_id},
            {"$set": set_dict},
        )
        if result.matched_count == 0:
            return jsonify({"error": "Document not found"}), 404
        return jsonify({"message": "Document updated", "file_id": file_id}), 200
    except QueryHardFailureError as e:
        return jsonify({"error": e.message}), 400
    except Exception as e:
        logger.exception("update: %s", e)
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# 6. delete — delete a doc from all places (metadata, GridFS, search indexes)
# Hard failures: failed to connect to DB, file doesn't exist, don't have permission (TBD placeholder).
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

        # --- Hard: don't have permission to delete (TBD placeholder) ---
        # TODO: implement permission check (e.g. user_id in request; verify user can delete this file_id)
        # if not _can_delete_document(user_id=data.get("user_id"), file_id=file_id):
        #     raise QueryHardFailureError(MSG_DELETE_NO_PERMISSION)

        # --- Hard: failed to connect to DB; file doesn't exist ---
        try:
            result, status_code = delete_file_by_id(file_id)
        except Exception as e:
            try:
                import pymongo.errors
                if isinstance(e, (pymongo.errors.ServerSelectionTimeoutError, pymongo.errors.ConnectionFailure, pymongo.errors.ExecutionTimeout)):
                    raise QueryHardFailureError(MSG_DELETE_DB_CONNECTION)
            except ImportError:
                pass
            logger.exception("delete DB error: %s", e)
            raise

        if status_code == 404:
            return jsonify({"error": MSG_DELETE_FILE_NOT_FOUND}), 404
        if status_code != 200:
            return jsonify({"error": result.get("error", "Delete failed")}), status_code

        try:
            rebuild_search_indexes(metadata_collection=metadata_collection)
        except Exception as e:
            try:
                import pymongo.errors
                if isinstance(e, (pymongo.errors.ServerSelectionTimeoutError, pymongo.errors.ConnectionFailure, pymongo.errors.ExecutionTimeout)):
                    raise QueryHardFailureError(MSG_DELETE_DB_CONNECTION)
            except ImportError:
                pass
            logger.exception("delete rebuild_index error: %s", e)
            raise

        return jsonify({"message": "Document deleted", "file_id": file_id}), 200
    except QueryHardFailureError as e:
        return jsonify({"error": e.message}), 400
    except Exception as e:
        logger.exception("delete: %s", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", 7138)), host="0.0.0.0")
