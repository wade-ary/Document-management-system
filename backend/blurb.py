"""
Gemini-style blurb: after retrieval, take top 5 docs and summarize them
according to the user's question via an LLM. Runs asynchronously so retrieval
can return immediately and the blurb is filled in when ready.
"""
from __future__ import annotations

import hashlib
import logging
import threading
import time
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Top N docs to feed into the LLM
BLURB_TOP_N = 5
# Max chars per doc excerpt to stay within context
MAX_CHARS_PER_DOC = 2200

# In-memory cache: key -> { "status": "done"|"running"|"error", "blurb": str, "error": str?, "created": float }
_blurb_cache: Dict[str, Dict[str, Any]] = {}
_cache_lock = threading.Lock()
# TTL seconds (optional; clear old entries on read)
BLURB_CACHE_TTL = 600


def _cache_key(query: str, doc_file_ids: List[str]) -> str:
    q = (query or "").strip()[:300]
    ids = tuple(sorted((doc_file_ids or [])[:BLURB_TOP_N]))
    raw = f"{q}|{ids}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _get_text_for_doc(doc: Dict[str, Any], metadata_collection: Any) -> str:
    """Get excerpt text for one doc: from doc['metadata'] or fetch by file_id."""
    meta = doc.get("metadata") or {}
    text = meta.get("extracted_text") or meta.get("summary") or ""
    if text:
        return (text[:MAX_CHARS_PER_DOC] + ("..." if len(text) > MAX_CHARS_PER_DOC else "")).strip()
    file_id = doc.get("file_id")
    if file_id and metadata_collection:
        try:
            m = metadata_collection.find_one({"file_id": file_id}, {"extracted_text": 1, "summary": 1})
            if m:
                text = m.get("extracted_text") or m.get("summary") or ""
                return (text[:MAX_CHARS_PER_DOC] + ("..." if len(text) > MAX_CHARS_PER_DOC else "")).strip()
        except Exception as e:
            logger.warning("Blurb: fetch text for %s failed: %s", file_id, e)
    return ""


def _call_llm_for_blurb(query: str, doc_excerpts: List[str], doc_titles: List[str]) -> Optional[str]:
    """Call LLM (Gemini preferred, then OpenAI) to generate a short summary blurb."""
    if not doc_excerpts:
        return None
    query = (query or "").strip()
    parts = []
    for i, (excerpt, title) in enumerate(zip(doc_excerpts, doc_titles), start=1):
        parts.append(f"--- Document {i} ({title}) ---\n{excerpt}")
    context = "\n\n".join(parts)
    prompt = f"""The user asked: "{query}"

Below are excerpts from the top {len(doc_excerpts)} retrieved documents.

{context}

Provide a short summary blurb (2–4 sentences) that directly addresses the user's question based on these documents. Be concise and factual. Do not say "according to document X" unless necessary."""

    # Prefer Gemini
    out = _call_gemini(prompt)
    if out:
        return out.strip()
    # Fallback OpenAI
    out = _call_openai(prompt)
    if out:
        return out.strip()
    return None


def _call_gemini(prompt: str) -> Optional[str]:
    try:
        import os
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            return None
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(temperature=0.2),
        )
        if response and response.text:
            return response.text.strip()
    except Exception as e:
        logger.warning("Blurb Gemini call failed: %s", e)
    return None


def _call_openai(prompt: str) -> Optional[str]:
    try:
        import os
        if not os.getenv("OPENAI_API_KEY"):
            return None
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import HumanMessage
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
        msg = llm.invoke([HumanMessage(content=prompt)])
        if hasattr(msg, "content") and msg.content:
            return msg.content.strip()
    except Exception as e:
        logger.warning("Blurb OpenAI call failed: %s", e)
    return None


def generate_blurb_sync(
    query: str,
    docs: List[Dict[str, Any]],
    metadata_collection: Any = None,
    top_n: int = BLURB_TOP_N,
) -> Optional[str]:
    """
    Synchronous blurb generation. Takes top N docs (each with file_id and optionally metadata),
    gathers text from metadata or metadata_collection, sends to LLM, returns 2–4 sentence blurb.
    """
    if not query or not docs:
        return None
    top_docs = docs[:top_n]
    doc_excerpts = []
    doc_titles = []
    for doc in top_docs:
        text = _get_text_for_doc(doc, metadata_collection)
        doc_excerpts.append(text or "(No text available)")
        meta = doc.get("metadata") or {}
        name = meta.get("name") or meta.get("compliance", {}).get("title") or doc.get("file_id", "Document")
        doc_titles.append(name[:80] if isinstance(name, str) else "Document")
    if not any(t != "(No text available)" for t in doc_excerpts):
        return None
    return _call_llm_for_blurb(query, doc_excerpts, doc_titles)


def start_blurb_background(
    query: str,
    docs: List[Dict[str, Any]],
    metadata_collection: Any = None,
    top_n: int = BLURB_TOP_N,
) -> str:
    """
    Start blurb generation in a background thread. Returns a cache key (task_id) so the
    client can poll get_blurb_cached(key) or get_blurb_cached_by_query(query, file_ids).
    Result is stored under the same key returned here.
    """
    top_docs = (docs or [])[:top_n]
    file_ids = [d.get("file_id") for d in top_docs if d.get("file_id")]
    key = _cache_key(query, file_ids)
    with _cache_lock:
        if key in _blurb_cache and _blurb_cache[key].get("status") == "done":
            return key
        _blurb_cache[key] = {"status": "running", "blurb": None, "error": None, "created": time.time()}

    def _run():
        try:
            blurb = generate_blurb_sync(query, top_docs, metadata_collection, top_n=top_n)
            with _cache_lock:
                _blurb_cache[key] = {
                    "status": "done" if blurb else "error",
                    "blurb": blurb,
                    "error": None if blurb else "No blurb generated",
                    "created": time.time(),
                }
        except Exception as e:
            logger.exception("Blurb background task failed: %s", e)
            with _cache_lock:
                _blurb_cache[key] = {
                    "status": "error",
                    "blurb": None,
                    "error": str(e),
                    "created": time.time(),
                }

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return key


def get_blurb_cached(cache_key: str) -> Optional[Dict[str, Any]]:
    """
    Return cached blurb result for a cache_key (from start_blurb_background).
    Returns {"status": "done"|"running"|"error", "blurb": str|None, "error": str|None}
    or None if key not found. Optionally evicts stale entries.
    """
    with _cache_lock:
        if cache_key not in _blurb_cache:
            return None
        entry = _blurb_cache[cache_key].copy()
        if time.time() - entry.get("created", 0) > BLURB_CACHE_TTL:
            del _blurb_cache[cache_key]
            return None
    return entry


def get_blurb_cached_by_query(query: str, doc_file_ids: List[str]) -> Optional[Dict[str, Any]]:
    """Convenience: get cached result by query and top doc file_ids (same order as used when starting)."""
    key = _cache_key(query, doc_file_ids or [])
    return get_blurb_cached(key)
