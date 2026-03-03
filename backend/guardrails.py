"""
Guardrails: search availability, backend notifications, and UX consistency.

- Search: min doc thresholds, rerank timeouts, FAISS/lexical fallback.
- Ingestion: never block; mark incomplete and send to review queue on extraction failure.
- Notifications: log and persist alerts for backend tech when search is degraded/down.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Literal, Optional

logger = logging.getLogger(__name__)

# --- Backend tech notifications ---

def notify_backend_tech(
    message: str,
    context: Optional[Dict[str, Any]] = None,
    level: Literal["error", "warning", "info"] = "error",
) -> None:
    """
    Record a system alert for backend tech: write to system_alerts collection and log.
    Use when search is down, indexes unavailable, or other operational issues.
    """
    try:
        from backend.db import get_db
        db = get_db("EDUDATA")
        coll = db["system_alerts"]
        doc = {
            "message": message,
            "context": context or {},
            "level": level,
            "created_at": __import__("datetime").datetime.utcnow().isoformat(),
        }
        coll.insert_one(doc)
    except Exception as e:
        logger.warning("Failed to write system_alerts: %s", e)
    if level == "error":
        logger.error("Backend tech alert: %s | %s", message, context)
    else:
        logger.warning("Backend tech alert: %s | %s", message, context)


# --- Search availability (FAISS + lexical fallbacks) ---

SearchStatus = Literal["ok", "degraded", "down"]

def get_search_availability() -> Dict[str, Any]:
    """
    Determine if search can run and with what fallbacks.
    Returns:
        {
            "status": "ok" | "degraded" | "down",
            "faiss_available": bool,
            "tfidf_available": bool,
            "bm25_available": bool,
            "message": str,  # user-facing when status != "ok"
            "notify_tech": bool,
        }
    """
    try:
        from backend.search import get_search_engine, FAISS_AVAILABLE
        engine = get_search_engine()
        stats = engine.get_stats()
        faiss_ok = bool(FAISS_AVAILABLE and stats.get("faiss_available") and (stats.get("faiss_count") or 0) > 0)
        tfidf_ok = bool(stats.get("tfidf_available") and (stats.get("tfidf_count") or 0) > 0)
        bm25_ok = bool(stats.get("bm25_available") and (stats.get("bm25_count") or 0) > 0)
        lexical_count = (1 if tfidf_ok else 0) + (1 if bm25_ok else 0)

        if not faiss_ok and not tfidf_ok and not bm25_ok:
            return {
                "status": "down",
                "faiss_available": False,
                "tfidf_available": False,
                "bm25_available": False,
                "message": "Search is temporarily unavailable. Technical team has been notified.",
                "notify_tech": True,
            }
        if not faiss_ok and lexical_count < 2:
            # Only one lexical index (or one missing) and no FAISS -> degraded; we still allow search with that one
            # But if strictly "only one lexical total" or "none", we say down. Above we already handled none.
            # So here: no FAISS and (only TF-IDF or only BM25) -> treat as down and notify
            return {
                "status": "down",
                "faiss_available": False,
                "tfidf_available": tfidf_ok,
                "bm25_available": bm25_ok,
                "message": "Search is temporarily unavailable. Technical team has been notified.",
                "notify_tech": True,
            }
        if not faiss_ok or lexical_count < 2:
            return {
                "status": "degraded",
                "faiss_available": faiss_ok,
                "tfidf_available": tfidf_ok,
                "bm25_available": bm25_ok,
                "message": "Search is running with reduced indexes.",
                "notify_tech": True,
            }
        return {
            "status": "ok",
            "faiss_available": faiss_ok,
            "tfidf_available": tfidf_ok,
            "bm25_available": bm25_ok,
            "message": "",
            "notify_tech": False,
        }
    except Exception as e:
        logger.exception("get_search_availability: %s", e)
        return {
            "status": "down",
            "faiss_available": False,
            "tfidf_available": False,
            "bm25_available": False,
            "message": "Search is temporarily unavailable. Technical team has been notified.",
            "notify_tech": True,
        }
