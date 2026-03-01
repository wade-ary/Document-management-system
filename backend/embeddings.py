"""
Optional embedding provider for FAISS index.
Uses OpenAI embeddings if OPENAI_API_KEY is set; otherwise FAISS is skipped.
"""
import os
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)
_embedding_fn = None


def _get_embedding_fn():
    global _embedding_fn
    if _embedding_fn is not None:
        return _embedding_fn
    if os.getenv("OPENAI_API_KEY"):
        try:
            from langchain_openai import OpenAIEmbeddings
            emb = OpenAIEmbeddings(model="text-embedding-3-small")
            def _embed(text: str) -> Optional[List[float]]:
                try:
                    return emb.embed_query(text)
                except Exception as e:
                    logger.warning("Embedding failed: %s", e)
                    return None
            _embedding_fn = _embed
            return _embedding_fn
        except ImportError:
            logger.warning("langchain_openai not available for embeddings")
    else:
        logger.info("OPENAI_API_KEY not set; FAISS index will be disabled")
    return None


def get_embedding(text: str) -> Optional[List[float]]:
    """
    Return embedding vector for text, or None if embedding provider unavailable.
    """
    if not (text or "").strip():
        return None
    fn = _get_embedding_fn()
    if fn is None:
        return None
    return fn(text)
