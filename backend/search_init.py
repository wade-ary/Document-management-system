"""
Initialize search engine at startup: build FAISS, TF-IDF, BM25 from approved documents.
"""
import logging
from backend.db import get_db
from backend.search import get_search_engine, rebuild_search_indexes

logger = logging.getLogger(__name__)


def init_search_engine():
    """Build search indexes from approved documents in metadata collection."""
    try:
        db = get_db("EDUDATA")
        metadata_collection = db["metadata"]
        rebuild_search_indexes(metadata_collection=metadata_collection)
        engine = get_search_engine()
        stats = engine.get_stats()
        logger.info("Search engine initialized: %s", stats)
    except Exception as e:
        logger.exception("Search engine init failed: %s", e)
        raise
