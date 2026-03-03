"""
Compliance analysis pipeline.

Implements:
- Extraction (title, issuing authority, deadline, departments, topics, summary)
- Scoring (risk signals)
- Persistence (store structured compliance metadata + formatted_doc in MongoDB)

This is designed to be deterministic and explainable, not purely LLM-driven.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from backend.db import get_db

logger = logging.getLogger(__name__)

DB_NAME = "EDUDATA"


TITLE_PATTERNS = [
    r"circular\s+no\.?.*",
    r"notice[:\s].*",
    r"office\s+order.*",
    r"meeting\s+notes.*",
    r"subject[:\s].*",
    r"memorandum.*",
]

AUTHORITY_PATTERNS = [
    r"issued\s+by[:\s].*",
    r"from[:\s].*",
    r"authority[:\s].*",
    r"by\s+order\s+of[:\s].*",
    r"office\s+of[:\s].*",
]

DEADLINE_PHRASES = [
    "due by",
    "submit by",
    "submit before",
    "submit on or before",
    "before",
    "last date",
    "no later than",
    "on or before",
]

# Simple date patterns (keep deterministic; parsing can be improved later)
DATE_PATTERNS = [
    r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",  # 01/02/2026 or 01-02-26
    r"\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b",  # 1 Jan 2026
]

DEPARTMENT_KEYWORDS: Dict[str, List[str]] = {
    "finance": ["budget", "cost", "invoice", "payment", "financial", "expenditure"],
    "environment": ["pollution", "environment", "emission", "waste", "sustainability"],
    "safety": ["safety", "incident", "hazard", "accident", "near miss"],
    "operations": ["operation", "maintenance", "service disruption", "delay"],
    "hr": ["recruitment", "leave", "salary", "promotion", "appointment"],
}

SAFETY_SIGNALS = ["accident", "incident", "hazard", "unsafe", "injury", "fatal"]
OPERATIONAL_SIGNALS = ["delay", "disruption", "maintenance", "downtime", "breakdown"]
REGULATORY_SIGNALS = [
    "regulation",
    "compliance",
    "audit",
    "mandate",
    "statutory",
    "obligation",
]


def _get_metadata_collection():
    return get_db(DB_NAME)["metadata"]


def _get_compliance_collection():
    return get_db(DB_NAME)["compliance_documents"]


def _first_non_empty_line(text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    return ""


def _extract_title(text: str, filename: str) -> str:
    """Deterministic title extraction."""
    if not text:
        return filename or ""

    header = "\n".join(text.splitlines()[:40])
    for pattern in TITLE_PATTERNS:
        m = re.search(pattern, header, flags=re.IGNORECASE)
        if m:
            line = m.group(0).strip()
            return line

    # Fallback: first non-empty line
    line = _first_non_empty_line(header)
    if line:
        return line

    # Last resort: filename without extension
    if filename and "." in filename:
        return filename.rsplit(".", 1)[0]
    return filename or ""


def _extract_issuing_authority(text: str) -> str:
    """Heuristic issuing authority from top section."""
    if not text:
        return "Unknown (review in dashboard)"

    header = "\n".join(text.splitlines()[:60])
    for pattern in AUTHORITY_PATTERNS:
        m = re.search(pattern, header, flags=re.IGNORECASE)
        if m:
            line = m.group(0).strip()
            return line

    return "Unknown (review in dashboard)"


def _extract_deadline(text: str) -> Tuple[str, Optional[str]]:
    """
    Find the easiest deadline:
    - Look for key phrases, then nearest date-like token.
    - Returns (raw_snippet, iso_date_or_None).
    """
    if not text:
        return "", None

    lowered = text.lower()
    best_snippet = ""
    best_iso = None

    for phrase in DEADLINE_PHRASES:
        idx = lowered.find(phrase)
        if idx == -1:
            continue
        window = text[max(0, idx - 40) : idx + 120]
        # Find first date pattern in window
        for dpattern in DATE_PATTERNS:
            dm = re.search(dpattern, window)
            if dm:
                best_snippet = window.strip()
                date_str = dm.group(0)
                # Very conservative parsing: try DD/MM/YYYY or DD-MM-YYYY
                iso = _parse_simple_date(date_str)
                best_iso = iso
                return best_snippet, best_iso

    return best_snippet, best_iso


def _parse_simple_date(s: str) -> Optional[str]:
    """Parse very common date formats; return ISO (YYYY-MM-DD) or None."""
    try:
        # 01/02/2026 or 01-02-2026
        m = re.match(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", s)
        if m:
            d, mth, y = m.groups()
            y = int(y)
            if y < 100:
                y += 2000
            from datetime import date

            dt = date(year=y, month=int(mth), day=int(d))
            return dt.isoformat()
    except Exception:
        return None
    return None


def _detect_departments(text: str, base_department: Optional[str]) -> Tuple[List[str], str]:
    """Score departments based on keyword hits; return (all_above_threshold, primary)."""
    if not text:
        return (["General"], base_department or "General")

    lowered = text.lower()
    total_len = max(len(lowered), 1)
    scores: Dict[str, float] = {}
    for dept, keywords in DEPARTMENT_KEYWORDS.items():
        hits = 0
        for kw in keywords:
            hits += lowered.count(kw.lower())
        # Normalize loosely by length
        scores[dept] = hits / (total_len / 1000.0)  # occurrences per ~1k chars

    # Threshold: at least some signal
    selected = [d for d, s in scores.items() if s >= 0.5]
    if not selected:
        selected = ["General"]

    primary = base_department or max(scores, key=scores.get) if scores else "General"
    if primary not in selected:
        selected.insert(0, primary)
    return selected, primary


def _extract_key_topics(text: str, top_k: int = 10) -> List[str]:
    """Use TF-IDF over single document to get top weighted terms (approximate topics)."""
    from sklearn.feature_extraction.text import TfidfVectorizer

    if not text or not text.strip():
        return []

    try:
        vec = TfidfVectorizer(
            max_features=50,
            ngram_range=(1, 2),
            stop_words="english",
            min_df=1,
        )
        X = vec.fit_transform([text])
        scores = X.toarray()[0]
        features = vec.get_feature_names_out()
        pairs = list(zip(features, scores))
        pairs.sort(key=lambda x: -x[1])
        return [w for w, _ in pairs[:top_k]]
    except Exception as e:
        logger.warning("Key topic extraction failed: %s", e)
        return []


def _generate_summary(text: str, max_chars: int = 2000) -> str:
    """
    Placeholder for structured LLM summary.
    For now: deterministic summary from leading sentences, capped.
    """
    if not text:
        return ""
    snippet = text.strip().splitlines()
    lines = [ln.strip() for ln in snippet if ln.strip()][:6]
    joined = " ".join(lines)
    if len(joined) > max_chars:
        joined = joined[: max_chars - 3] + "..."
    # Represent as 3 bullet-style points heuristically
    parts = re.split(r"[.;]\s+", joined)
    bullets = [p.strip() for p in parts if p.strip()][:3]
    if not bullets:
        return joined
    return " ".join(f"- {b}" for b in bullets)


def _signal_score(text: str, keywords: List[str], scale: float = 1.0) -> float:
    if not text:
        return 0.0
    lowered = text.lower()
    hits = 0
    for kw in keywords:
        hits += lowered.count(kw.lower())
    if hits == 0:
        return 0.0
    # Saturating score
    return min(1.0, (hits / 5.0) * scale)


def _deadline_urgency_score(deadline_iso: Optional[str]) -> float:
    if not deadline_iso:
        return 0.2
    try:
        from datetime import date

        dl = date.fromisoformat(deadline_iso)
        today = date.today()
        days = (dl - today).days
        if days <= 0:
            return 1.0
        if days <= 7:
            return 0.9
        if days <= 30:
            return 0.7
        if days <= 90:
            return 0.5
        return 0.3
    except Exception:
        return 0.3


def _risk_scores(text: str, deadline_iso: Optional[str]) -> Tuple[Dict[str, float], str, bool]:
    safety = _signal_score(text, SAFETY_SIGNALS)
    operational = _signal_score(text, OPERATIONAL_SIGNALS)
    regulatory = _signal_score(text, REGULATORY_SIGNALS)
    deadline_score = _deadline_urgency_score(deadline_iso)

    # Overall: max of category scores plus urgency component
    base = max(safety, operational, regulatory)
    overall = min(1.0, 0.6 * base + 0.4 * deadline_score)

    if overall >= 0.75:
        level = "High"
    elif overall >= 0.4:
        level = "Medium"
    else:
        level = "Low"

    is_regulatory = regulatory >= 0.5

    scores = {
        "safety": round(safety, 3),
        "operational": round(operational, 3),
        "regulatory": round(regulatory, 3),
        "deadline": round(deadline_score, 3),
        "overall": round(overall, 3),
    }
    return scores, level, is_regulatory


def process_file_for_compliance(
    file_id: str,
    filename: str,
    extracted_text: str,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main entrypoint used by app.upload flow.

    Returns a structured dict with:
    - id, title, riskLevel, department, deadline, keywords, source, description, extractedDate
    - riskMatrix (category->score), radarChart ({labels, values})
    """
    text = extracted_text or ""
    meta_coll = _get_metadata_collection()
    comp_coll = _get_compliance_collection()

    meta_doc = meta_coll.find_one({"file_id": file_id}) or {}
    upload_date = meta_doc.get("upload_date", "")
    base_department = meta_doc.get("department")
    source = meta_doc.get("source", "upload")

    title = _extract_title(text, filename)
    issuing_authority = _extract_issuing_authority(text)
    raw_deadline_snippet, deadline_iso = _extract_deadline(text)
    departments, primary_dept = _detect_departments(text, base_department)
    topics = _extract_key_topics(text)
    summary = _generate_summary(text)
    scores, risk_level, is_regulatory = _risk_scores(text, deadline_iso)

    now_iso = datetime.utcnow().isoformat()
    deadline_value = deadline_iso or ""

    risk_matrix = {
        "Safety": scores["safety"],
        "Operational": scores["operational"],
        "Regulatory": scores["regulatory"],
        "DeadlineUrgency": scores["deadline"],
        "Overall": scores["overall"],
    }
    radar_chart = {
        "labels": ["Safety", "Operational", "Regulatory", "Deadline"],
        "values": [
            scores["safety"],
            scores["operational"],
            scores["regulatory"],
            scores["deadline"],
        ],
    }

    compliance_result: Dict[str, Any] = {
        "id": file_id,
        "file_id": file_id,
        "title": title,
        "issuingAuthority": issuing_authority,
        "riskLevel": risk_level,
        "department": primary_dept or "General",
        "departments": departments,
        "deadline": deadline_value,
        "rawDeadlineSnippet": raw_deadline_snippet,
        "keywords": topics,
        "summary": summary,
        "is_regulatory": is_regulatory,
        "source": source,
        "description": summary,
        "extractedDate": now_iso,
        "riskMatrix": risk_matrix,
        "radarChart": radar_chart,
        "scores": scores,
    }

    # formatted_doc shape for dashboard / retrieval
    display_name = meta_doc.get("name") or filename or file_id
    formatted_doc = {
        "file_id": file_id,
        "filename": display_name,
        "upload_date": upload_date,
        "language": meta_doc.get("language", "Unknown"),
        "status": "Processed" if summary else "Uploaded",
        "summary": summary,
        "doc_type": meta_doc.get("doc_type", meta_doc.get("document_type", "Document")),
        "department": compliance_result["department"],
        "is_regulatory": is_regulatory,
        "actionable_items": meta_doc.get("actionableItems", []),
    }

    # Persist back into metadata and dedicated compliance collection
    try:
        meta_coll.update_one(
            {"file_id": file_id},
            {
                "$set": {
                    "summary": summary or meta_doc.get("summary", ""),
                    "is_regulatory": is_regulatory,
                    "compliance": compliance_result,
                    "actionableItems": formatted_doc["actionable_items"],
                }
            },
            upsert=True,
        )
    except Exception as e:
        logger.warning("Failed to update metadata with compliance info: %s", e)

    try:
        comp_coll.update_one(
            {"file_id": file_id},
            {"$set": {**formatted_doc, "compliance": compliance_result}},
            upsert=True,
        )
    except Exception as e:
        logger.warning("Failed to upsert compliance_documents: %s", e)

    return compliance_result


def get_compliance_dashboard(
    department: Optional[str] = None,
    risk_level: Optional[str] = None,
    urgent_only: bool = False,
    limit: int = 100,
) -> Dict[str, Any]:
    """
    Fetch documents that need attention for the compliance dashboard:
    high risk, urgent deadline (overdue or within 7 days), regulatory.
    """
    comp_coll = _get_compliance_collection()
    meta_coll = _get_metadata_collection()
    query: Dict[str, Any] = {}
    if department:
        query["department"] = {"$regex": department, "$options": "i"}
    if risk_level:
        query["compliance.riskLevel"] = risk_level
    cursor = comp_coll.find(query).sort("compliance.extractedDate", -1).limit(limit * 2)
    docs = list(cursor)
    if not docs:
        q: Dict[str, Any] = {"compliance": {"$exists": True, "$ne": None}}
        if department:
            q["department"] = {"$regex": department, "$options": "i"}
        for d in meta_coll.find(q, {"file_id": 1, "name": 1, "path": 1, "upload_date": 1, "department": 1, "compliance": 1, "summary": 1, "is_regulatory": 1}).sort("compliance.extractedDate", -1).limit(limit * 2):
            comp = d.get("compliance") or {}
            if risk_level and comp.get("riskLevel") != risk_level:
                continue
            docs.append({"file_id": d.get("file_id"), "filename": d.get("name"), "path": d.get("path"), "upload_date": d.get("upload_date"), "department": d.get("department"), "summary": d.get("summary"), "is_regulatory": d.get("is_regulatory"), "compliance": comp})
    from datetime import date, timedelta
    def _to_item(d: Dict) -> Dict:
        comp = d.get("compliance") or {}
        return {"file_id": d.get("file_id"), "filename": d.get("filename") or d.get("name"), "path": d.get("path", ""), "upload_date": d.get("upload_date", ""), "department": d.get("department", ""), "summary": ((d.get("summary") or comp.get("summary")) or "")[:500], "risk_level": comp.get("riskLevel", ""), "deadline": comp.get("deadline", ""), "is_regulatory": d.get("is_regulatory", False), "title": comp.get("title", ""), "issuing_authority": comp.get("issuingAuthority", ""), "keywords": (comp.get("keywords") or [])[:10], "risk_matrix": comp.get("riskMatrix"), "radar_chart": comp.get("radarChart"), "scores": comp.get("scores")}
    items = [_to_item(d) for d in docs]
    today = date.today()
    urgent_cutoff = today + timedelta(days=7)
    def _is_urgent(item: Dict) -> bool:
        dl = item.get("deadline")
        if not dl or not isinstance(dl, str):
            return False
        try:
            return date.fromisoformat(dl[:10]) <= urgent_cutoff
        except Exception:
            return False
    high_risk = [i for i in items if (i.get("risk_level") or "").lower() == "high"]
    medium_risk = [i for i in items if (i.get("risk_level") or "").lower() == "medium"]
    urgent = [i for i in items if _is_urgent(i)]
    regulatory = [i for i in items if i.get("is_regulatory")]
    needs_attention_ids = {i.get("file_id") for i in high_risk + urgent + regulatory}
    needs_attention = [i for i in items if i.get("file_id") in needs_attention_ids]
    needs_attention.sort(key=lambda x: (0 if _is_urgent(x) else 1, 0 if (x.get("risk_level") or "").lower() == "high" else 1, 0 if x.get("is_regulatory") else 1, x.get("file_id", "")))
    if urgent_only:
        items = urgent
    elif risk_level:
        items = [i for i in items if (i.get("risk_level") or "").lower() == risk_level.lower()]
    items = items[:limit]
    return {"summary": {"total_with_compliance": len(items), "high_risk_count": len(high_risk), "medium_risk_count": len(medium_risk), "urgent_deadline_count": len(urgent), "regulatory_count": len(regulatory), "needs_attention_count": len(needs_attention)}, "needs_attention": needs_attention[:50], "high_risk": high_risk[:30], "urgent_deadline": urgent[:30], "regulatory": regulatory[:30], "items": items}


def register_compliance_routes(app) -> None:
    """Register compliance dashboard route."""
    from flask import jsonify
    @app.route("/api/compliance/dashboard", methods=["GET", "POST"])
    def compliance_dashboard():
        try:
            data = request.get_json(silent=True) if request.method == "POST" else request.args
            if data is None:
                data = {}
            result = get_compliance_dashboard(
                department=data.get("department"),
                risk_level=data.get("risk_level"),
                urgent_only=bool(data.get("urgent_only", False)),
                limit=min(int(data.get("limit", 100)), 200),
            )
            return jsonify(result), 200
        except Exception as e:
            logger.exception("compliance_dashboard: %s", e)
            return jsonify({"error": str(e)}), 500

