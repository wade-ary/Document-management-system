"""
Ingest pipeline failure handling.

Hard failures: stop ingestion, return human-readable message to API.
Soft failures: continue ingestion, mark for review, log (TBD); no user-facing error.
"""


class IngestHardFailureError(Exception):
    """Raised when ingestion must stop. API returns this as a readable error message."""

    def __init__(self, message: str, code: str = "HARD_FAILURE"):
        self.message = message
        self.code = code
        super().__init__(message)


# Human-readable messages for hard failures (file validation)
MSG_UNSUPPORTED_FORMAT = (
    "File type is not supported. Allowed types: PDF, DOCX, TXT, MD, PPT, PPTX, PNG, JPG, JPEG."
)
MSG_FILE_EXISTS = "A file with this name already exists at this path."
MSG_FILE_TOO_LARGE = "File exceeds the maximum allowed size (50 MB)."
MSG_FILE_CORRUPTED = "File could not be read or appears corrupted."
MSG_FILE_EMPTY = "File is empty or missing."
MSG_DB_WRITE = "Database connection error. Please try again later."
