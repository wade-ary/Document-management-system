"""
Single-hop and multi-hop retrieval pipeline.

Pipeline for both:
1. Embed query (same as index)
2. Get top N per index (FAISS, TF-IDF, BM25) — N larger for multi-hop
3. Fuse with reciprocal rank fusion (RRF) across indexes → ranked list
4. Hard-filter by metadata (date, department, etc.) → filtered ranked list
5. Fuzzy rerank over key topics, summary, tags, etc. → final ranked docs

Single-hop: smaller N, fewer candidates, lighter reranking.
Multi-hop: larger N, more candidates, full fuzzy reranking.
Not connected to API yet; call single_hop_retrieval / multi_hop_retrieval directly.
"""
from __future__ import annotations

import logging
import threading
from typing import Any, Dict, List, Optional, Tuple

from backend.search import get_search_engine

logger = logging.getLogger(__name__)

# RRF constant (standard k=60)
RRF_K = 60

# Defaults: single-hop scaled down
SINGLE_HOP_TOP_N_PER_INDEX = 25
SINGLE_HOP_FINAL_TOP_K = 15
SINGLE_HOP_RERANK_TOP = 10  # only rerank top 10 for single-hop

MULTI_HOP_TOP_N_PER_INDEX = 80
MULTI_HOP_FINAL_TOP_K = 50
MULTI_HOP_RERANK_TOP = 50  # full rerank

# Guardrails: min docs to attempt rerun with higher N; rerank timeout
MIN_DOCS_SINGLE_HOP = 3
MIN_DOCS_MULTI_HOP = 5
RERANK_TIMEOUT_SECONDS = 5


def _reciprocal_rank_fusion(
    ranked_lists: Dict[str, List[Tuple[str, int]]],
    k: int = RRF_K,
) -> List[Tuple[str, float]]:
    """
    Fuse per-index ranked lists with RRF: score(d) = sum over index of 1/(k + rank).
    Returns [(file_id, rrf_score), ...] sorted by rrf_score descending.
    """
    scores: Dict[str, float] = {}
    for _index_name, lst in ranked_lists.items():
        for file_id, rank in lst:
            if rank < 1:
                continue
            scores[file_id] = scores.get(file_id, 0.0) + 1.0 / (k + rank)
    return sorted(scores.items(), key=lambda x: -x[1])


def _apply_metadata_filters(
    ranked: List[Tuple[str, float]],
    metadata_collection: Any,
    filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Replace / restrict by hard filters. Load metadata for each file_id,
    apply date/department/file_types filters, return list of
    { "file_id", "rrf_score", "metadata" }.
    """
    if not metadata_collection or not ranked:
        return []

    filters = filters or {}
    date_from = filters.get("date_from")  # ISO date string or None
    date_to = filters.get("date_to")
    departments = filters.get("departments")  # list or single str
    department = filters.get("department")  # single department
    file_types = filters.get("file_types")  # e.g. ["pdf", "docx"]

    if department and not departments:
        departments = [department]
    if isinstance(departments, str):
        departments = [departments]

    file_ids = [fid for fid, _ in ranked]
    meta_by_id: Dict[str, Dict] = {}
    for doc in metadata_collection.find({"file_id": {"$in": file_ids}}):
        meta_by_id[doc["file_id"]] = doc

    result = []
    for file_id, rrf_score in ranked:
        meta = meta_by_id.get(file_id)
        if not meta:
            continue

        # Hard filters
        if date_from or date_to:
            ud = meta.get("upload_date") or meta.get("extractedDate") or ""
            if ud:
                # Compare as strings (ISO) if needed
                if date_from and ud < date_from:
                    continue
                if date_to and ud > date_to:
                    continue
            elif date_from or date_to:
                continue  # no date in doc -> exclude if filter set

        if departments:
            doc_dept = (meta.get("department") or "").strip().lower()
            comp = meta.get("compliance") or {}
            comp_depts = [c.lower() for c in (comp.get("departments") or [])]
            allowed = [d.strip().lower() for d in departments]
            if doc_dept in allowed:
                pass  # include
            elif comp_depts and any(d in comp_depts for d in allowed):
                pass  # include
            else:
                continue

        if file_types:
            name = meta.get("name") or ""
            ext = (name.rsplit(".", 1)[-1].lower() if "." in name else "").lstrip(".")
            if ext and ext not in [e.lower().replace(".", "") for e in file_types]:
                continue

        result.append({"file_id": file_id, "rrf_score": rrf_score, "metadata": meta})
    return result


def _fuzzy_rerank(
    items: List[Dict[str, Any]],
    query: str,
    top_k: int,
    fields: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Rerank by fuzzy match over metadata fields (summary, key topics, tags, name).
    Fields checked: summary, keywords/topics, tags, name (and compliance subfields).
    """
    try:
        from fuzzywuzzy import fuzz
    except ImportError:
        return items[:top_k]

    q = (query or "").strip().lower()
    if not q:
        return items[:top_k]

    fields = fields or ["summary", "keywords", "tags", "name"]

    def _score_one(meta: Dict, query_lower: str) -> float:
        score = 0.0
        # Summary
        summary = (meta.get("summary") or (meta.get("compliance") or {}).get("summary") or "")[:2000]
        if summary:
            score += 0.4 * (fuzz.partial_ratio(query_lower, summary.lower()) / 100.0)
        # Keywords / key topics
        keywords = meta.get("keywords") or (meta.get("compliance") or {}).get("keywords") or []
        if isinstance(keywords, list):
            kw_str = " ".join(str(k) for k in keywords)
        else:
            kw_str = str(keywords)
        if kw_str:
            score += 0.3 * (fuzz.partial_ratio(query_lower, kw_str.lower()) / 100.0)
        # Tags
        tags = meta.get("tags") or []
        if isinstance(tags, list):
            tag_str = " ".join(str(t) for t in tags)
        else:
            tag_str = str(tags)
        if tag_str:
            score += 0.2 * (fuzz.partial_ratio(query_lower, tag_str.lower()) / 100.0)
        # Name
        name = meta.get("name") or ""
        if name:
            score += 0.1 * (fuzz.partial_ratio(query_lower, name.lower()) / 100.0)
        return score

    for item in items:
        meta = item.get("metadata") or {}
        item["fuzzy_score"] = _score_one(meta, q)

    # Sort by fuzzy score desc, then by rrf_score desc
    items_sorted = sorted(
        items,
        key=lambda x: (-(x.get("fuzzy_score") or 0), -(x.get("rrf_score") or 0)),
    )
    return items_sorted[:top_k]


def _fuzzy_rerank_with_timeout(
    items: List[Dict[str, Any]],
    query: str,
    top_k: int,
    timeout_seconds: float = RERANK_TIMEOUT_SECONDS,
) -> List[Dict[str, Any]]:
    """Run _fuzzy_rerank with a timeout; on timeout return top_k by RRF order."""
    result_holder: List[List[Dict[str, Any]]] = []
    exc_holder: List[Exception] = []

    def run() -> None:
        try:
            result_holder.append(_fuzzy_rerank(items, query, top_k))
        except Exception as e:
            exc_holder.append(e)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    thread.join(timeout=max(0.1, timeout_seconds))
    if thread.is_alive():
        logger.warning("Rerank timed out after %s s; returning top %s by RRF", timeout_seconds, top_k)
        return items[:top_k]
    if exc_holder:
        logger.warning("Rerank failed: %s; returning top by RRF", exc_holder[0])
        return items[:top_k]
    if result_holder:
        return result_holder[0]
    return items[:top_k]


def _run_pipeline(
    query: str,
    metadata_collection: Any,
    filters: Optional[Dict[str, Any]],
    top_n_per_index: int,
    final_top_k: int,
    rerank_top: int,
    do_fuzzy_rerank: bool,
) -> List[Dict[str, Any]]:
    """
    Shared pipeline: get ranked lists -> RRF -> metadata filter -> optional fuzzy rerank.
    """
    engine = get_search_engine()
    ranked_lists = engine.get_ranked_lists(query, top_n=top_n_per_index)
    if not any(ranked_lists.values()):
        return []

    fused = _reciprocal_rank_fusion(ranked_lists)
    filtered = _apply_metadata_filters(fused, metadata_collection, filters)
    if not filtered:
        return []

    if do_fuzzy_rerank and filtered:
        to_rerank = filtered[:rerank_top]
        rest = filtered[rerank_top:]
        reranked = _fuzzy_rerank_with_timeout(to_rerank, query, top_k=final_top_k)
        need = max(0, final_top_k - len(reranked))
        result = reranked + rest[:need]
        result = result[:final_top_k]
    else:
        result = filtered[:final_top_k]

    return result


def single_hop_retrieval(
    query: str,
    metadata_collection: Any,
    filters: Optional[Dict[str, Any]] = None,
    *,
    top_n_per_index: int = SINGLE_HOP_TOP_N_PER_INDEX,
    final_top_k: int = SINGLE_HOP_FINAL_TOP_K,
    rerank_top: int = SINGLE_HOP_RERANK_TOP,
) -> List[Dict[str, Any]]:
    """
    Single-hop retrieval: one-doc direct answer.
    Guardrail: if result count < MIN_DOCS_SINGLE_HOP, rerun with higher N to get more.
    """
    result = _run_pipeline(
        query=query,
        metadata_collection=metadata_collection,
        filters=filters,
        top_n_per_index=top_n_per_index,
        final_top_k=final_top_k,
        rerank_top=rerank_top,
        do_fuzzy_rerank=True,
    )
    if len(result) < MIN_DOCS_SINGLE_HOP and (top_n_per_index < 200 or rerank_top < 50):
        n2 = min(top_n_per_index * 2, 200)
        r2 = min(rerank_top * 2, 50)
        result2 = _run_pipeline(
            query=query,
            metadata_collection=metadata_collection,
            filters=filters,
            top_n_per_index=n2,
            final_top_k=final_top_k,
            rerank_top=r2,
            do_fuzzy_rerank=True,
        )
        if len(result2) > len(result):
            return result2
    return result


def multi_hop_retrieval(
    query: str,
    metadata_collection: Any,
    filters: Optional[Dict[str, Any]] = None,
    *,
    top_n_per_index: int = MULTI_HOP_TOP_N_PER_INDEX,
    final_top_k: int = MULTI_HOP_FINAL_TOP_K,
    rerank_top: int = MULTI_HOP_RERANK_TOP,
) -> List[Dict[str, Any]]:
    """
    Multi-hop retrieval: multiple docs, reasoning-based answer.
    Guardrail: if result count < MIN_DOCS_MULTI_HOP, rerun with higher N to get more.
    """
    result = _run_pipeline(
        query=query,
        metadata_collection=metadata_collection,
        filters=filters,
        top_n_per_index=top_n_per_index,
        final_top_k=final_top_k,
        rerank_top=rerank_top,
        do_fuzzy_rerank=True,
    )
    if len(result) < MIN_DOCS_MULTI_HOP and (top_n_per_index < 300 or rerank_top < 100):
        n2 = min(top_n_per_index * 2, 300)
        r2 = min(rerank_top * 2, 100)
        result2 = _run_pipeline(
            query=query,
            metadata_collection=metadata_collection,
            filters=filters,
            top_n_per_index=n2,
            final_top_k=final_top_k,
            rerank_top=r2,
            do_fuzzy_rerank=True,
        )
        if len(result2) > len(result):
            return result2
    return result
