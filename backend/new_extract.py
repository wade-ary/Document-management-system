"""Re-export extract_text_from_file; provide ask_file stub for app compatibility."""
from backend.extract import extract_text_from_file

__all__ = ["extract_text_from_file", "ask_file"]


def ask_file(file_id: str, question: str, **kwargs):
    """Stub: in-doc Q&A (to be implemented)."""
    return {"answer": "In-document Q&A not implemented yet.", "sources": []}
