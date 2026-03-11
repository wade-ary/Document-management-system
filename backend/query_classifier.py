"""
Query classifier for retrieval: single-hop vs multi-hop.

Uses an LLM to classify user queries into:
- single_hop: one document, direct answer (factual lookup).
- multi_hop: multiple documents, reasoning-based answer (compare, combine, summarize across docs).

Fallback: single_hop if LLM unavailable or parse fails.
"""
from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, Literal, Optional

logger = logging.getLogger(__name__)

Intent = Literal["single_hop", "multi_hop"]

DEFAULT_INTENT: Intent = "single_hop"

# When query_search wants to default to multi-hop on classification failure
DEFAULT_INTENT_QUERY_SEARCH: Intent = "multi_hop"

CLASSIFY_SYSTEM = """You are a query classifier for a document retrieval system.

Given a user question, classify it into exactly one of:

- single_hop: The answer can be found in a single document. The user wants a direct, factual answer. Examples: "What is the deadline in the circular?", "What does the notice say about X?", "Find the policy in document Y."

- multi_hop: The answer requires combining or comparing multiple documents, or reasoning across several sources. Examples: "Compare the policies in document A and B", "Which documents mention both X and Y?", "Summarize findings across all safety reports", "How do the two circulars differ?"

Reply with a single JSON object only, no other text:
{"intent": "single_hop" or "multi_hop", "reasoning": "brief explanation"}
"""


def _call_llm(query: str) -> Optional[str]:
    """Call LLM; return raw response text or None."""
    query = (query or "").strip()
    if not query:
        return None

    # Prefer OpenAI if available
    if os.getenv("OPENAI_API_KEY"):
        try:
            from langchain_openai import ChatOpenAI
            from langchain_core.messages import SystemMessage, HumanMessage
            llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
            msg = llm.invoke([
                SystemMessage(content=CLASSIFY_SYSTEM),
                HumanMessage(content=f"User query: {query}"),
            ])
            if hasattr(msg, "content") and msg.content:
                return msg.content.strip()
        except Exception as e:
            logger.warning("OpenAI classify failed: %s", e)

    # Fallback: Gemini (google-genai or google-generativeai)
    if os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"):
        try:
            api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(
                CLASSIFY_SYSTEM + "\n\nUser query: " + query,
                generation_config=genai.types.GenerationConfig(temperature=0),
            )
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            logger.warning("Gemini classify failed: %s", e)

    return None


def _parse_response(raw: str) -> Optional[Dict[str, Any]]:
    """Parse LLM response into {intent, reasoning}. Prefer JSON, then intent=... reasoning=..."""
    if not raw:
        return None

    # Try JSON first
    try:
        # Strip markdown code block if present
        text = raw.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```\s*$", "", text)
        obj = json.loads(text)
        intent = (obj.get("intent") or "").strip().lower()
        if intent in ("single_hop", "multi_hop"):
            return {
                "intent": intent,
                "reasoning": (obj.get("reasoning") or "").strip() or "No reasoning provided.",
            }
    except (json.JSONDecodeError, TypeError):
        pass

    # Fallback: intent=... reasoning=...
    m = re.search(r"intent\s*=\s*(\w+)", raw, re.IGNORECASE)
    if m:
        intent = m.group(1).strip().lower().replace("-", "_")
        if intent == "singlehop":
            intent = "single_hop"
        if intent == "multihop":
            intent = "multi_hop"
        if intent in ("single_hop", "multi_hop"):
            reason = ""
            rm = re.search(r"reasoning\s*=\s*(.+)", raw, re.DOTALL | re.IGNORECASE)
            if rm:
                reason = rm.group(1).strip()
            return {"intent": intent, "reasoning": reason or "No reasoning provided."}

    return None


def classify_query(query: str, default_on_failure: Optional[Intent] = None) -> Dict[str, Any]:
    """
    Classify a user query into single_hop or multi_hop.

    default_on_failure: if set, use this when LLM/parse fails (e.g. "multi_hop" for query_search).
    Otherwise uses DEFAULT_INTENT ("single_hop").

    Returns:
        {
            "intent": "single_hop" | "multi_hop",
            "reasoning": str,
        }
    """
    query = (query or "").strip()
    fallback = default_on_failure if default_on_failure in ("single_hop", "multi_hop") else DEFAULT_INTENT
    if not query:
        return {"intent": fallback, "reasoning": "Empty query; defaulting."}

    raw = _call_llm(query)
    parsed = _parse_response(raw) if raw else None

    if parsed:
        return parsed

    # Soft fail: classification failed -> use fallback (e.g. multi_hop for query_search)
    logger.info("Query classification fallback to %s for: %s", fallback, query[:80])
    return {"intent": fallback, "reasoning": "LLM unavailable or parse failed; defaulting to %s." % fallback}
