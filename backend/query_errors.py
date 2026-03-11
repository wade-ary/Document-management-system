"""
Query search failure handling.

Hard failures: stop and return human-readable message to API.
Soft failures: continue with fallback (partial indexes, no rerank, ignore filters, etc.); log for review.
"""


class QueryHardFailureError(Exception):
    """Raised when query_search must stop. API returns this as a readable error message."""

    def __init__(self, message: str, code: str = "QUERY_HARD_FAILURE"):
        self.message = message
        self.code = code
        super().__init__(message)


# Human-readable messages for hard failures
MSG_EMPTY_QUERY = "Query cannot be empty."
MSG_BOTH_INDEXES_UNAVAILABLE = "Search is temporarily unavailable. Please try again later."
MSG_INVALID_FILTER_PARAMS = "Invalid filter parameters. Check date range format (e.g. YYYY-MM-DD) and filter values."
MSG_UNAUTHORIZED_QUERY = "You do not have permission to search the requested scope."
MSG_REQUEST_TOO_LARGE = "Request is too large. Please shorten your query or reduce payload size."
MSG_DB_CONNECTION = "Database connection error. Please try again later."
MSG_RETRIEVE_INVALID_PARAMS = "Invalid parameters. Check 'filters' (e.g. date_from/date_to as YYYY-MM-DD), 'limit' (1-1000), and 'exclude_extracted_text' (boolean)."
