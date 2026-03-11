"""
Precedent Finder: find historical documents similar to a given document.
Treats the document as the query and runs the same retrieval pipeline (embed, RRF, filter, fuzzy rerank),
then optionally boosts by document-type and structural similarity.

Soft failures (same as query_search; handled in search/retrieval):
- Partial index failure: FAISS or lexical fails → use whichever index responds (get_ranked_lists returns partial).
- Reranker timeout: _fuzzy_rerank_with_timeout returns fused order without full rerank.
- Embedding generation failure: get_ranked_lists uses lexical only (search.py).
"""
from __future__ import annotations

import json
import logging
import re
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple

from backend.db import get_db
from backend.retrieval import (
    _apply_metadata_filters,
    _fuzzy_rerank_with_timeout,
    _reciprocal_rank_fusion,
)
from backend.search import get_search_engine

logger = logging.getLogger(__name__)

DB_NAME = "EDUDATA"
PRECEDENT_TOP_N_PER_INDEX = 40
PRECEDENT_FINAL_TOP_K = 50
PRECEDENT_RERANK_TOP = 30


def _get_metadata_collection():
    return get_db(DB_NAME)["metadata"]


def extract_document_structure(text: str, file_name: str) -> Dict[str, Any]:
    """
    Extract structural features for similarity: doc type, sections, length, phrases.
    """
    if not text:
        return {"document_type": "unknown", "sections": [], "length_category": "short", "common_phrases": []}

    structure: Dict[str, Any] = {
        "sections": [],
        "common_phrases": [],
        "document_type": "unknown",
        "length_category": "short",
    }
    text_lower = (text or "").lower()
    file_lower = (file_name or "").lower()

    # Document type indicators
    type_indicators = {
        "report": ["executive summary", "introduction", "methodology", "conclusion", "findings", "recommendations"],
        "policy": ["policy", "procedure", "guideline", "regulation", "compliance"],
        "circular": ["circular", "notification", "announcement"],
        "notice": ["notice", "advisory", "alert"],
        "order": ["order", "directive", "instruction"],
        "scheme": ["scheme", "program", "initiative", "project"],
        "memorandum": ["memorandum", "memo", "brief"],
    }
    scores = {t: sum(1 for w in ind if w in text_lower) for t, ind in type_indicators.items()}
    if any(scores.values()):
        structure["document_type"] = max(scores, key=scores.get)
    if any(w in file_lower for w in ["resume", "cv", "curriculum"]):
        structure["document_type"] = "letter"
        structure["document_subtype"] = "resume"

    # Section-like lines (headers)
    for line in text.split("\n"):
        line = line.strip()
        if line and (line.isupper() or re.match(r"^[A-Z][A-Za-z\s]+:?\s*$", line) or re.match(r"^\d+\.?\s+[A-Z]", line)):
            structure["sections"].append(line.lower())

    # Length
    wc = len(text.split())
    structure["length_category"] = "short" if wc < 500 else ("medium" if wc < 2000 else "long")

    # Common phrases (bigrams/trigrams)
    words = re.findall(r"\b[a-zA-Z]{3,}\b", text_lower)
    bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words) - 1)]
    trigrams = [f"{words[i]} {words[i+1]} {words[i+2]}" for i in range(len(words) - 2)]
    structure["common_phrases"] = [p for p, _ in Counter(bigrams).most_common(8)] + [
        p for p, _ in Counter(trigrams).most_common(4)
    ]
    return structure


def calculate_structural_similarity(struct1: Dict, struct2: Dict) -> float:
    """Similarity from document type, length, sections, and common phrases."""
    if not struct1 or not struct2:
        return 0.0
    score = 0.0
    w = 0.0
    if struct1.get("document_type") == struct2.get("document_type") and struct1.get("document_type") != "unknown":
        score += 0.4
    w += 0.4
    if struct1.get("length_category") == struct2.get("length_category"):
        score += 0.1
    w += 0.1
    s1 = set(struct1.get("sections", []))
    s2 = set(struct2.get("sections", []))
    if s1 and s2:
        score += 0.25 * len(s1 & s2) / len(s1 | s2)
    w += 0.25
    p1 = set(struct1.get("common_phrases", []))
    p2 = set(struct2.get("common_phrases", []))
    if p1 and p2:
        score += 0.25 * len(p1 & p2) / len(p1 | p2)
    w += 0.25
    return score / w if w else 0.0


def _build_query_from_doc(doc: Dict[str, Any]) -> str:
    """Build a search query from document text and metadata (summary, topics)."""
    parts = []
    text = (doc.get("extracted_text") or "")[:4000]
    if text:
        parts.append(text)
    summary = doc.get("summary") or (doc.get("compliance") or {}).get("summary") or ""
    if summary:
        parts.append(summary[:1500])
    keywords = doc.get("keywords") or (doc.get("compliance") or {}).get("keywords") or []
    if isinstance(keywords, list):
        parts.append(" ".join(str(k) for k in keywords[:15]))
    else:
        parts.append(str(keywords)[:500])
    tags = doc.get("tags") or []
    if isinstance(tags, list):
        parts.append(" ".join(str(t) for t in tags))
    return " ".join(p for p in parts if p).strip()


def find_precedents(
    file_id: str,
    similarity_threshold: float = 0.2,
    file_types: Optional[List[str]] = None,
    date_range: Optional[Tuple[str, str]] = None,
    top_k: int = 50,
    metadata_collection: Any = None,
) -> Dict[str, Any]:
    """
    Find documents similar to the one given by file_id.
    Uses the document as the query: build query from its text/summary/topics, run retrieval,
    exclude the current doc, then optionally boost by structural similarity.
    """
    coll = metadata_collection or _get_metadata_collection()
    try:
        current_doc = coll.find_one({"file_id": file_id})
        if not current_doc:
            return {"error": "Document not found", "results": []}

        query = _build_query_from_doc(current_doc)
        if not query:
            return {"error": "No searchable content in document", "results": []}

        filters: Dict[str, Any] = {}
        if file_types:
            filters["file_types"] = file_types
        if date_range and len(date_range) == 2:
            filters["date_from"], filters["date_to"] = date_range[0], date_range[1]

        # Run retrieval pipeline with document as query
        engine = get_search_engine()
        ranked_lists = engine.get_ranked_lists(query, top_n=PRECEDENT_TOP_N_PER_INDEX)
        if not any(ranked_lists.values()):
            return {"results": [], "total_found": 0, "current_document": _current_doc_info(current_doc)}

        fused = _reciprocal_rank_fusion(ranked_lists)
        fused = [(fid, s) for fid, s in fused if fid != file_id]

        filtered = _apply_metadata_filters(fused, coll, filters)
        filtered = [x for x in filtered if x["file_id"] != file_id]

        if not filtered:
            return {"results": [], "total_found": 0, "current_document": _current_doc_info(current_doc)}

        # Soft: reranker timeout → return fused order without full rerank
        reranked = _fuzzy_rerank_with_timeout(
            filtered[:PRECEDENT_RERANK_TOP], query, top_k=PRECEDENT_FINAL_TOP_K
        )
        reranked_ids = {r["file_id"] for r in reranked}
        rest = [x for x in filtered if x["file_id"] not in reranked_ids][: max(0, top_k - len(reranked))]
        candidates = (reranked + rest)[:top_k]

        current_text = current_doc.get("extracted_text") or ""
        current_structure = extract_document_structure(current_text, current_doc.get("name") or "")

        precedent_results = []
        for item in candidates:
            meta = item.get("metadata") or {}
            cand_file_id = item["file_id"]
            base_score = float(item.get("rrf_score") or 0)
            fuzzy_score = float(item.get("fuzzy_score") or 0)
            relevance = 0.6 * base_score + 0.4 * fuzzy_score

            cand_text = meta.get("extracted_text") or ""
            cand_structure = extract_document_structure(cand_text, meta.get("name") or "")
            struct_sim = calculate_structural_similarity(current_structure, cand_structure)
            if current_structure.get("document_type") == cand_structure.get("document_type"):
                relevance += 0.05
            relevance += 0.1 * struct_sim

            if relevance < similarity_threshold:
                continue
            precedent_results.append({
                "file_id": cand_file_id,
                "file_name": meta.get("name") or cand_file_id,
                "path": meta.get("path") or "",
                "relevance_score": round(relevance, 3),
                "structural_score": round(struct_sim, 3),
                "document_type": cand_structure.get("document_type", "unknown"),
                "tags": meta.get("tags", []),
                "file_type": (meta.get("name") or "").rsplit(".", 1)[-1] if "." in (meta.get("name") or "") else "",
                "upload_date": meta.get("upload_date", ""),
                "key_topics": (meta.get("compliance") or {}).get("keywords", []) or meta.get("keywords", []),
                "matching_sections": [],
            })

        precedent_results.sort(key=lambda x: -x["relevance_score"])
        return {
            "results": precedent_results[:top_k],
            "total_found": len(precedent_results),
            "current_document": _current_doc_info(current_doc),
        }
    except Exception as e:
        logger.exception("find_precedents failed: %s", e)
        return {"error": str(e), "results": []}


def _current_doc_info(doc: Dict) -> Dict[str, str]:
    return {
        "file_id": doc.get("file_id", ""),
        "file_name": doc.get("name", ""),
        "path": doc.get("path", ""),
    }


def compare_documents(file_id_1: str, file_id_2: str, metadata_collection: Any = None) -> Dict[str, Any]:
    """
    Compare two documents: structural similarity and matching sections (fuzzy).
    """
    coll = metadata_collection or _get_metadata_collection()
    try:
        doc1 = coll.find_one({"file_id": file_id_1})
        doc2 = coll.find_one({"file_id": file_id_2})
        if not doc1 or not doc2:
            return {"error": "One or both documents not found"}
        text1 = doc1.get("extracted_text") or ""
        text2 = doc2.get("extracted_text") or ""
        if not text1 or not text2:
            return {"error": "Documents do not have extracted text"}

        struct1 = extract_document_structure(text1, doc1.get("name") or "")
        struct2 = extract_document_structure(text2, doc2.get("name") or "")
        sections1 = [s.strip() for s in text1.split("\n") if len(s.strip()) > 30]
        sections2 = [s.strip() for s in text2.split("\n") if len(s.strip()) > 30]

        matching_sections = []
        try:
            from fuzzywuzzy import fuzz
        except ImportError:
            fuzz = None
        if fuzz:
            for i, s1 in enumerate(sections1[:20]):
                for j, s2 in enumerate(sections2[:20]):
                    sim = fuzz.partial_ratio(s1.lower(), s2.lower()) / 100.0
                    if sim > 0.7:
                        matching_sections.append({
                            "section_1": s1[:200],
                            "section_2": s2[:200],
                            "similarity": round(sim, 3),
                            "position_1": i,
                            "position_2": j,
                        })
        matching_sections.sort(key=lambda x: -x["similarity"])
        struct_sim = calculate_structural_similarity(struct1, struct2)
        return {
            "document_1": {
                "file_id": doc1["file_id"],
                "file_name": doc1.get("name", ""),
                "path": doc1.get("path", ""),
                "tags": doc1.get("tags", []),
                "key_topics": (doc1.get("compliance") or {}).get("keywords", []) or doc1.get("keywords", []),
                "upload_date": doc1.get("upload_date", ""),
                "document_type": struct1.get("document_type", "unknown"),
            },
            "document_2": {
                "file_id": doc2["file_id"],
                "file_name": doc2.get("name", ""),
                "path": doc2.get("path", ""),
                "tags": doc2.get("tags", []),
                "key_topics": (doc2.get("compliance") or {}).get("keywords", []) or doc2.get("keywords", []),
                "upload_date": doc2.get("upload_date", ""),
                "document_type": struct2.get("document_type", "unknown"),
            },
            "matching_sections": matching_sections[:15],
            "total_matches": len(matching_sections),
            "structural_similarity": round(struct_sim, 3),
        }
    except Exception as e:
        logger.exception("compare_documents failed: %s", e)
        return {"error": str(e)}


def _call_llm_for_analysis(prompt: str) -> Optional[str]:
    """Call Gemini or OpenAI to generate analysis text."""
    import os
    if os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"):
        try:
            import google.generativeai as genai
            genai.configure(api_key=os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"))
            model = genai.GenerativeModel("gemini-1.5-flash")
            r = model.generate_content(prompt, generation_config=genai.types.GenerationConfig(temperature=0.2))
            if r and r.text:
                return r.text.strip()
        except Exception as e:
            logger.warning("Gemini analysis failed: %s", e)
    if os.getenv("OPENAI_API_KEY"):
        try:
            from langchain_openai import ChatOpenAI
            from langchain_core.messages import HumanMessage
            llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
            msg = llm.invoke([HumanMessage(content=prompt)])
            if hasattr(msg, "content") and msg.content:
                return msg.content.strip()
        except Exception as e:
            logger.warning("OpenAI analysis failed: %s", e)
    return None


def analyze_precedent_relationship(
    current_file_id: str,
    precedent_file_id: str,
    metadata_collection: Any = None,
) -> Dict[str, Any]:
    """
    Use an LLM to explain how the precedent document relates to the current document.
    """
    coll = metadata_collection or _get_metadata_collection()
    try:
        current_doc = coll.find_one({"file_id": current_file_id})
        precedent_doc = coll.find_one({"file_id": precedent_file_id})
        if not current_doc or not precedent_doc:
            return {"error": "One or both documents not found"}
        curr_text = (current_doc.get("extracted_text") or "")[:1200]
        prec_text = (precedent_doc.get("extracted_text") or "")[:1200]
        curr_struct = extract_document_structure(current_doc.get("extracted_text") or "", current_doc.get("name") or "")
        prec_struct = extract_document_structure(precedent_doc.get("extracted_text") or "", precedent_doc.get("name") or "")
        curr_topics = (current_doc.get("compliance") or {}).get("keywords", []) or current_doc.get("keywords", []) or []
        prec_topics = (precedent_doc.get("compliance") or {}).get("keywords", []) or precedent_doc.get("keywords", []) or []

        prompt = f"""Analyze the relationship between these two documents.

Current document: {current_doc.get("name", "")} (type: {curr_struct.get("document_type", "unknown")})
Key topics: {", ".join(curr_topics[:5]) if curr_topics else "N/A"}
Preview: {curr_text}

Precedent document: {precedent_doc.get("name", "")} (type: {prec_struct.get("document_type", "unknown")})
Upload date: {precedent_doc.get("upload_date", "Unknown")}
Key topics: {", ".join(prec_topics[:5]) if prec_topics else "N/A"}
Preview: {prec_text}

Provide a concise analysis (3-4 short paragraphs) with:
1. Overall relationship and type compatibility
2. Key similarities
3. How the precedent can inform the current document
4. Notable differences

Reply with a JSON object with keys: "summary", "similarities", "applicability", "differences". Use plain text values."""

        raw = _call_llm_for_analysis(prompt)
        analysis = {"summary": "", "similarities": "", "applicability": "", "differences": ""}
        if raw:
            try:
                if raw.startswith("```"):
                    raw = re.sub(r"^```(?:json)?\s*", "", raw)
                    raw = re.sub(r"\s*```\s*$", "", raw)
                analysis = json.loads(raw)
            except json.JSONDecodeError:
                analysis["summary"] = raw
        return {
            "current_document": {"file_id": current_doc["file_id"], "file_name": current_doc.get("name", "")},
            "precedent_document": {
                "file_id": precedent_doc["file_id"],
                "file_name": precedent_doc.get("name", ""),
                "upload_date": precedent_doc.get("upload_date", ""),
            },
            "analysis": analysis,
        }
    except Exception as e:
        logger.exception("analyze_precedent_relationship failed: %s", e)
        return {"error": str(e)}
