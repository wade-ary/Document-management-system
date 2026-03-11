"""
Query search validation: filter parsing and hard-failure checks.
Invalid filter parameters (e.g. malformed date range) raise QueryHardFailureError.
"""
import re
from datetime import datetime
from typing import Any, Dict, Optional

from backend.query_errors import QueryHardFailureError, MSG_INVALID_FILTER_PARAMS, MSG_RETRIEVE_INVALID_PARAMS

# ISO date pattern YYYY-MM-DD (optionally with time)
_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$")


def _parse_date(s: Any) -> Optional[str]:
    """Return canonical ISO date string or None if invalid."""
    if s is None:
        return None
    if isinstance(s, str):
        s = s.strip()
        if not s:
            return None
        if _DATE_PATTERN.match(s):
            return s
        try:
            for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ"):
                try:
                    dt = datetime.strptime(s[:19], fmt)
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    continue
        except Exception:
            pass
    return None


def validate_query_filters(filters: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Validate and normalize filters. Raises QueryHardFailureError if invalid.
    Returns a dict safe to pass to retrieval (date_from/date_to as ISO strings).
    """
    if not filters:
        return {}
    out: Dict[str, Any] = {}
    date_from = filters.get("date_from")
    date_to = filters.get("date_to")
    if date_from is not None:
        parsed = _parse_date(date_from)
        if parsed is None:
            raise QueryHardFailureError(MSG_INVALID_FILTER_PARAMS)
        out["date_from"] = parsed
    if date_to is not None:
        parsed = _parse_date(date_to)
        if parsed is None:
            raise QueryHardFailureError(MSG_INVALID_FILTER_PARAMS)
        out["date_to"] = parsed
    if out.get("date_from") and out.get("date_to") and out["date_from"] > out["date_to"]:
        raise QueryHardFailureError(MSG_INVALID_FILTER_PARAMS)

    for key in ("department", "departments", "file_types"):
        if key in filters and filters[key] is not None:
            out[key] = filters[key]
    return out


def validate_retrieve_hard_filters_params(data: Any) -> tuple:
    """
    Validate request body for retrieve_hard_filters. Raises QueryHardFailureError if invalid.
    Returns (mongo_filter_dict, limit, projection).
    """
    if not isinstance(data, dict):
        raise QueryHardFailureError(MSG_RETRIEVE_INVALID_PARAMS)
    filters = data.get("filters")
    if filters is not None and not isinstance(filters, dict):
        raise QueryHardFailureError(MSG_RETRIEVE_INVALID_PARAMS)
    filters = filters or {}

    # Limit: int in [1, 1000]
    try:
        limit = int(data.get("limit", 500))
    except (TypeError, ValueError):
        raise QueryHardFailureError(MSG_RETRIEVE_INVALID_PARAMS)
    if limit < 1 or limit > 1000:
        raise QueryHardFailureError(MSG_RETRIEVE_INVALID_PARAMS)

    # exclude_extracted_text: bool
    exclude_text = data.get("exclude_extracted_text", True)
    if not isinstance(exclude_text, bool):
        raise QueryHardFailureError(MSG_RETRIEVE_INVALID_PARAMS)

    # Validate and normalize date filters (raises on invalid)
    try:
        validated = validate_query_filters(filters) if filters else {}
    except QueryHardFailureError:
        raise

    # Build mongo filter
    mongo_filter: Dict[str, Any] = {}
    if validated.get("department"):
        mongo_filter["department"] = validated["department"]
    if filters.get("path") is not None:
        mongo_filter["path"] = filters["path"]
    if filters.get("user_id") is not None:
        mongo_filter["user_id"] = filters["user_id"]
    if filters.get("approvalStatus") is not None:
        mongo_filter["approvalStatus"] = filters["approvalStatus"]
    if "visible" in filters and filters["visible"] is not None:
        mongo_filter["visible"] = bool(filters["visible"])
    if validated.get("date_from") or validated.get("date_to"):
        mongo_filter["upload_date"] = {}
        if validated.get("date_from"):
            mongo_filter["upload_date"]["$gte"] = validated["date_from"]
        if validated.get("date_to"):
            mongo_filter["upload_date"]["$lte"] = validated["date_to"]
    if validated.get("file_types"):
        exts = [e.replace(".", "").lower() for e in (validated["file_types"] if isinstance(validated["file_types"], list) else [validated["file_types"]])]
        mongo_filter["name"] = {"$regex": r"\.(" + "|".join(re.escape(e) for e in exts) + r")$", "$options": "i"}
    if filters.get("tags") is not None:
        tags = filters["tags"] if isinstance(filters["tags"], list) else [filters["tags"]]
        mongo_filter["tags"] = {"$in": tags}

    projection = {"extracted_text": 0} if exclude_text else None
    return mongo_filter, limit, projection
