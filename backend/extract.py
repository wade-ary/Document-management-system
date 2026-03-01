"""
Text extraction helper for the ingestion pipeline.
Supports PDF and TXT only (base design). Returns plain text string.
"""
import io
import logging
from typing import Union, Optional

logger = logging.getLogger(__name__)

# PDF
try:
    import fitz  # PyMuPDF
    _PYMUPDF_AVAILABLE = True
except ImportError:
    _PYMUPDF_AVAILABLE = False
try:
    from PyPDF2 import PdfReader
    _PYPDF2_AVAILABLE = True
except ImportError:
    _PYPDF2_AVAILABLE = False


def _extract_pdf_from_bytes(data: bytes) -> str:
    """Extract text from PDF bytes. Prefer PyMuPDF, fallback to PyPDF2."""
    if _PYMUPDF_AVAILABLE:
        try:
            doc = fitz.open(stream=data, filetype="pdf")
            parts = []
            for page in doc:
                parts.append(page.get_text())
            doc.close()
            return "\n".join(parts).strip()
        except Exception as e:
            logger.warning("PyMuPDF extraction failed: %s", e)
    if _PYPDF2_AVAILABLE:
        try:
            reader = PdfReader(io.BytesIO(data))
            parts = []
            for page in reader.pages:
                parts.append(page.extract_text() or "")
            return "\n".join(parts).strip()
        except Exception as e:
            logger.warning("PyPDF2 extraction failed: %s", e)
    return ""


def _extract_txt_from_bytes(data: bytes) -> str:
    """Decode TXT as UTF-8 with fallback."""
    try:
        return data.decode("utf-8", errors="replace").strip()
    except Exception as e:
        logger.warning("TXT decode failed: %s", e)
        return ""


def _guess_extension(filename: Optional[str], content_type: Optional[str]) -> str:
    """Return lower-case extension from filename or content_type."""
    if filename and "." in filename:
        return filename.rsplit(".", 1)[1].lower()
    if content_type:
        if "pdf" in content_type:
            return "pdf"
        if "text/plain" in content_type or "text/" in content_type:
            return "txt"
    return ""


def extract_text_from_file(
    file_source: Union[bytes, str],
    filename: Optional[str] = None,
    content_type: Optional[str] = None,
    fs=None,
) -> str:
    """
    Extract plain text from a file (PDF or TXT only).

    Args:
        file_source: Either raw bytes of the file, or a GridFS file_id (str) to read from GridFS.
        filename: Optional filename (used to decide type when file_source is bytes).
        content_type: Optional MIME type (used when filename not available).
        fs: GridFS instance (required when file_source is a file_id string).

    Returns:
        Extracted text string. Empty string if unsupported type or extraction failure.
    """
    if isinstance(file_source, str):
        # file_id: read from GridFS
        if fs is None:
            logger.warning("extract_text_from_file: fs required when file_source is file_id")
            return ""
        try:
            from bson import ObjectId
            grid_out = fs.get(ObjectId(file_source))
            data = grid_out.read()
            filename = filename or getattr(grid_out, "filename", "") or ""
            content_type = content_type or getattr(grid_out, "content_type", "") or ""
        except Exception as e:
            logger.warning("GridFS get failed: %s", e)
            return ""
    else:
        data = file_source

    if not data:
        return ""

    ext = _guess_extension(filename, content_type)
    if ext == "pdf":
        return _extract_pdf_from_bytes(data)
    if ext == "txt":
        return _extract_txt_from_bytes(data)
    # Unsupported type
    return ""
