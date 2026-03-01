"""
Hybrid search: FAISS (semantic) + TF-IDF + BM25.
Supports add_document (ingestion), build from DB (rebuild), and search.
"""
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from rank_bm25 import BM25Okapi
from scipy.sparse import vstack

from backend.embeddings import get_embedding

logger = logging.getLogger(__name__)

# FAISS optional
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    faiss = None


def _tokenize_for_bm25(text: str) -> List[str]:
    """Simple tokenization for BM25: lower-case, alphanumeric tokens."""
    if not text:
        return []
    text = (text or "").lower()
    tokens = re.findall(r"[a-z0-9]+", text)
    return tokens


class SearchEngine:
    def __init__(self):
        self.faiss_index = None
        self.faiss_file_ids: List[str] = []  # row index -> file_id
        self.tfidf_vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix = None
        self.tfidf_file_ids: List[str] = []
        self.bm25: Optional[BM25Okapi] = None
        self.bm25_corpus_tokens: List[List[str]] = []
        self.bm25_file_ids: List[str] = []

    def add_document(self, file_id: str, extracted_text: str) -> None:
        """
        Add one document to all indexes (FAISS if embedding available, TF-IDF, BM25).
        If an index doesn't exist yet, build it from current corpus (single doc).
        """
        if not extracted_text or not str(file_id).strip():
            return
        text = extracted_text.strip()
        if not text:
            return

        # FAISS
        emb = get_embedding(text)
        if FAISS_AVAILABLE and emb is not None:
            vec = np.array([emb], dtype=np.float32)
            if self.faiss_index is None:
                dimension = len(emb)
                self.faiss_index = faiss.IndexFlatIP(dimension)
                self.faiss_file_ids = []
            faiss.normalize_L2(vec)
            self.faiss_index.add(vec)
            self.faiss_file_ids.append(str(file_id))

        # TF-IDF
        if self.tfidf_vectorizer is None:
            self.tfidf_vectorizer = TfidfVectorizer(
                max_features=10_000,
                ngram_range=(1, 3),
                stop_words="english",
                min_df=1,
            )
            self.tfidf_matrix = self.tfidf_vectorizer.fit_transform([text])
            self.tfidf_file_ids = [str(file_id)]
        else:
            new_vec = self.tfidf_vectorizer.transform([text])
            if self.tfidf_matrix is None:
                self.tfidf_matrix = new_vec
            else:
                self.tfidf_matrix = vstack([self.tfidf_matrix, new_vec])
            self.tfidf_file_ids.append(str(file_id))

        # BM25
        tokens = _tokenize_for_bm25(text)
        self.bm25_corpus_tokens.append(tokens)
        self.bm25_file_ids.append(str(file_id))
        try:
            self.bm25 = BM25Okapi(self.bm25_corpus_tokens)
        except Exception as e:
            logger.warning("BM25 update failed: %s", e)

    def build_from_documents(
        self,
        documents: List[Dict[str, Any]],
        text_key: str = "extracted_text",
        file_id_key: str = "file_id",
    ) -> None:
        """
        Rebuild all indexes from a list of docs with extracted_text and file_id.
        """
        valid = [
            d for d in documents
            if d.get(text_key) and str(d.get(file_id_key, "")).strip()
        ]
        if not valid:
            self.faiss_index = None
            self.faiss_file_ids = []
            self.tfidf_vectorizer = None
            self.tfidf_matrix = None
            self.tfidf_file_ids = []
            self.bm25 = None
            self.bm25_corpus_tokens = []
            self.bm25_file_ids = []
            return

        texts = [d[text_key].strip() for d in valid]
        file_ids = [str(d[file_id_key]) for d in valid]

        # FAISS
        embeddings_list = []
        faiss_ids = []
        for i, text in enumerate(texts):
            emb = get_embedding(text)
            if emb is not None:
                embeddings_list.append(emb)
                faiss_ids.append(file_ids[i])
        if FAISS_AVAILABLE and embeddings_list:
            mat = np.array(embeddings_list, dtype=np.float32)
            faiss.normalize_L2(mat)
            self.faiss_index = faiss.IndexFlatIP(mat.shape[1])
            self.faiss_index.add(mat)
            self.faiss_file_ids = faiss_ids
        else:
            self.faiss_index = None
            self.faiss_file_ids = []

        # TF-IDF
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=10_000,
            ngram_range=(1, 3),
            stop_words="english",
            min_df=1,
        )
        self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(texts)
        self.tfidf_file_ids = file_ids

        # BM25
        self.bm25_corpus_tokens = [_tokenize_for_bm25(t) for t in texts]
        self.bm25_file_ids = file_ids
        try:
            self.bm25 = BM25Okapi(self.bm25_corpus_tokens)
        except Exception as e:
            logger.warning("BM25 build failed: %s", e)
            self.bm25 = None

    def search(
        self,
        query: str,
        top_k: int = 50,
        file_types: Optional[List[str]] = None,
        metadata_collection=None,
    ) -> List[Dict[str, Any]]:
        """
        Hybrid search: combine FAISS (if available), TF-IDF, BM25.
        Returns list of { "file_id", "score", ... }.
        If metadata_collection is provided, filter by file_types and attach metadata.
        """
        if not query or not query.strip():
            return []

        q = query.strip()
        top_k = max(1, min(top_k, 200))
        n_docs = len(self.tfidf_file_ids)
        if n_docs == 0:
            return []

        # Score by file_id: 0.0 initially
        scores: Dict[str, float] = {}
        for fid in self.tfidf_file_ids:
            scores[fid] = 0.0

        # FAISS (semantic) — weight 0.4
        if FAISS_AVAILABLE and self.faiss_index is not None and self.faiss_file_ids:
            emb = get_embedding(q)
            if emb is not None:
                vec = np.array([emb], dtype=np.float32)
                faiss.normalize_L2(vec)
                k = min(top_k * 2, self.faiss_index.ntotal)
                k = max(k, 1)
                sims, indices = self.faiss_index.search(vec, k)
                for idx, sim in zip(indices[0], sims[0]):
                    if 0 <= idx < len(self.faiss_file_ids):
                        fid = self.faiss_file_ids[idx]
                        scores[fid] = scores.get(fid, 0) + 0.4 * float(sim)

        # TF-IDF — weight 0.3
        if self.tfidf_vectorizer is not None and self.tfidf_matrix is not None:
            q_vec = self.tfidf_vectorizer.transform([q])
            tfidf_scores = (self.tfidf_matrix @ q_vec.T).toarray().flatten()
            mx = float(np.max(tfidf_scores)) if tfidf_scores.size else 0
            if mx > 0:
                for i, fid in enumerate(self.tfidf_file_ids):
                    if i < len(tfidf_scores):
                        scores[fid] = scores.get(fid, 0) + 0.3 * (tfidf_scores[i] / mx)

        # BM25 — weight 0.3
        if self.bm25 is not None:
            q_tokens = _tokenize_for_bm25(q)
            if q_tokens:
                bm25_scores = self.bm25.get_scores(q_tokens)
                bm25_mx = float(np.max(bm25_scores)) if bm25_scores.size else 0
                if bm25_mx > 0:
                    for i, fid in enumerate(self.bm25_file_ids):
                        if i < len(bm25_scores):
                            scores[fid] = scores.get(fid, 0) + 0.3 * (bm25_scores[i] / bm25_mx)

        # Sort by score descending
        ranked = sorted(scores.items(), key=lambda x: -x[1])
        results = [{"file_id": fid, "score": round(s, 4)} for fid, s in ranked[:top_k]]

        # Optional: filter by file_types and attach metadata
        if metadata_collection and (file_types or True):
            file_ids = [r["file_id"] for r in results]
            meta_by_id = {}
            for doc in metadata_collection.find({"file_id": {"$in": file_ids}}):
                meta_by_id[doc["file_id"]] = doc
            filtered = []
            for r in results:
                meta = meta_by_id.get(r["file_id"])
                if not meta and metadata_collection:
                    continue
                if file_types:
                    name = meta.get("name") or ""
                    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
                    if ext and ext not in [e.lower().lstrip(".") for e in file_types]:
                        continue
                r["metadata"] = meta
                filtered.append(r)
            results = filtered[:top_k]

        return results

    def get_ranked_lists(
        self,
        query: str,
        top_n: int,
    ) -> Dict[str, List[Tuple[str, int]]]:
        """
        Get per-index ranked lists for RRF. Each value is [(file_id, rank), ...]
        with rank 1-based (1 = best). Keys: "faiss", "tfidf", "bm25".
        """
        out: Dict[str, List[Tuple[str, int]]] = {"faiss": [], "tfidf": [], "bm25": []}
        if not query or not query.strip():
            return out
        q = query.strip()
        top_n = max(1, min(top_n, 500))
        n_docs = len(self.tfidf_file_ids)
        if n_docs == 0:
            return out

        # FAISS: by similarity descending -> rank 1, 2, ...
        if FAISS_AVAILABLE and self.faiss_index is not None and self.faiss_file_ids:
            emb = get_embedding(q)
            if emb is not None:
                vec = np.array([emb], dtype=np.float32)
                faiss.normalize_L2(vec)
                k = min(top_n, self.faiss_index.ntotal)
                k = max(k, 1)
                sims, indices = self.faiss_index.search(vec, k)
                for rank, (idx, sim) in enumerate(zip(indices[0], sims[0]), start=1):
                    if 0 <= idx < len(self.faiss_file_ids):
                        fid = self.faiss_file_ids[idx]
                        out["faiss"].append((fid, rank))

        # TF-IDF: by score descending -> rank 1, 2, ...
        if self.tfidf_vectorizer is not None and self.tfidf_matrix is not None:
            q_vec = self.tfidf_vectorizer.transform([q])
            tfidf_scores = (self.tfidf_matrix @ q_vec.T).toarray().flatten()
            order = np.argsort(-tfidf_scores)
            for r, i in enumerate(order[:top_n], start=1):
                if i < len(self.tfidf_file_ids):
                    out["tfidf"].append((self.tfidf_file_ids[i], r))

        # BM25: by score descending -> rank 1, 2, ...
        if self.bm25 is not None:
            q_tokens = _tokenize_for_bm25(q)
            if q_tokens:
                bm25_scores = self.bm25.get_scores(q_tokens)
                order = np.argsort(-bm25_scores)
                for r, i in enumerate(order[:top_n], start=1):
                    if i < len(self.bm25_file_ids):
                        out["bm25"].append((self.bm25_file_ids[i], r))

        return out

    def get_stats(self) -> Dict[str, Any]:
        stats = {
            "faiss_available": FAISS_AVAILABLE and self.faiss_index is not None,
            "faiss_count": len(self.faiss_file_ids) if self.faiss_file_ids else 0,
            "tfidf_available": self.tfidf_matrix is not None,
            "tfidf_count": len(self.tfidf_file_ids),
            "tfidf_features": int(self.tfidf_vectorizer.get_feature_names_out().shape[0]) if self.tfidf_vectorizer is not None else 0,
            "bm25_available": self.bm25 is not None,
            "bm25_count": len(self.bm25_file_ids),
        }
        return stats


# Singleton used by storage and endpoints
_engine: Optional[SearchEngine] = None


def get_search_engine() -> SearchEngine:
    global _engine
    if _engine is None:
        _engine = SearchEngine()
    return _engine


def add_document_to_indexes(file_id: str, extracted_text: str) -> None:
    get_search_engine().add_document(file_id, extracted_text)


def search_files(
    query: str,
    file_types: Optional[List[str]] = None,
    tags: Optional[List[str]] = None,
    date_range: Optional[Tuple[Optional[str], Optional[str]]] = None,
    top_k: int = 50,
    metadata_collection=None,
) -> Any:
    """API: search with optional filters. Returns JSON-serializable list of results."""
    engine = get_search_engine()
    results = engine.search(query, top_k=top_k, file_types=file_types, metadata_collection=metadata_collection)
    # TODO: filter by tags and date_range if needed
    return results


def search_files_only_text(query: str) -> Any:
    """API: simple search by query only. Returns list of { file_id, score }."""
    engine = get_search_engine()
    return engine.search(query, top_k=50)


def rebuild_search_indexes(metadata_collection=None) -> Dict[str, Any]:
    """Rebuild all indexes from approved documents in metadata collection."""
    if metadata_collection is None:
        from backend.db import get_db
        db = get_db("EDUDATA")
        metadata_collection = db["metadata"]
    cursor = metadata_collection.find(
        {"approvalStatus": "approved", "visible": True, "extracted_text": {"$exists": True, "$ne": ""}}
    )
    docs = list(cursor)
    engine = get_search_engine()
    engine.build_from_documents(docs)
    return engine.get_stats()


def get_search_stats() -> Dict[str, Any]:
    return get_search_engine().get_stats()
