# Search & RAG Pipeline Overview

This document explains the current search algorithm (`/search/extensive`) and the upload-time RAG pipeline end to end: what signals are used, how scoring works, where data is stored, and how results are returned. It also notes lightweight improvements already implemented to keep latency low.

---

## 1) Data and Indexes
- **Metadata collection**: stores `file_id`, `name`, `path`, `embeddings` (precomputed doc embedding), `extracted_text`, `tags`, `key_topics`, optional `document_summary`/`summary`, `file_type`, `upload_date`, `approvalStatus`, `visible`.
- **FAISS index**: in-memory, built over stored `embeddings` (normalized). Maps FAISS row → `file_id`.
- **TF‑IDF / BM25**: built over `extracted_text` (one entry per doc). TF‑IDF uses 1–3 ngrams, stopwords removed; BM25 uses tokenized text.
- **Caches**:
  - `metadata_cache`: `file_id` → doc metadata.
  - `doc_ids` / `id_to_idx`: stable mapping for quick score lookup.
  - `cached_generate_query_embedding`: LRU for query embeddings.
  - Single shared `OpenAIEmbeddings` client for queries (no per-request instantiation).

---

## 2) Request Flow for `/search/extensive`
1) **Initialize** (once): build FAISS + TF‑IDF + BM25 from approved/visible docs.
2) **Apply filters (tags/file_types/date)**: if provided, a filtered cache is built and used for this request only.
3) **Query embedding**: embed the user query (reused client, cached).
4) **Hybrid candidate fetch**:
   - **Semantic (FAISS)**: top ~`top_k * 2` (min 30) by vector similarity.
   - **Lexical (TF‑IDF, BM25)**: scores computed for the same doc set via `id_to_idx`.
   - If no semantic hits, fall back to all docs with lexical-only scoring.
5) **Per-doc scoring (light rerank on small set)**:
   - **Extracted text score**: fuzzy + exact phrase bonus + word-match; text capped to 8k chars for speed.
   - **Semantic score**: FAISS similarity.
   - **BM25 score**: lexical relevance.
   - **TF‑IDF score**: lexical relevance.
   - **Tags**: fuzzy + Jaccard overlap with query tokens.
   - **Key topics**: fuzzy.
   - **Summary** (if present): fuzzy on summary snippet.
   - **File name / path**: light fuzzy cues.
6) **Weights (current blend)**:
   - extracted_text 0.30, semantic 0.30, bm25 0.16, tfidf 0.10,
   - tags 0.08, summary 0.03, key_topics 0.02, file_name 0.0075, path 0.0075.
   - Scores are clamped [0,1]; total_score is weighted sum.
7) **Return**: results sorted by `total_score`, truncated to `top_k`, with component scores and metadata.

**Why this stays fast**
- No doc embeddings computed at query time; all from Mongo.
- Single embedding client for queries; embeddings cached.
- FAISS/TF‑IDF/BM25 prebuilt and in-memory; no rebuild per request.
- Rerank is over a small candidate set (top_k*2 or min 30).
- Text matching capped to 8k chars.

---

## 3) Upload-Time RAG Pipeline (Conceptual)
While `/search/extensive` is retrieval-only, the upload path populates the fields that power search and RAG:
1) **Ingest**: file saved to storage/GridFS; metadata doc created.
2) **Text extraction** (`new_extract.py`): OCR/PDF/DOCX to `extracted_text`; basic cleaning.
3) **Embeddings**: whole-document embedding stored in `embeddings` (used by FAISS).
4) **Summaries/Tags/Topics**:
   - `document_summary` / `summary` (short text)
   - `tags` (keywords)
   - `key_topics`
5) **Metadata**: `file_type`, `upload_date`, `path`, `name`, `approvalStatus`, `visible`, optional `document_summary`.
6) **(Optional extensions)**: section/page embeddings, entities, reference numbers, issuing authority; can be precomputed and stored for richer rerank or RAG grounding.

These stored artifacts feed both:
- **Search**: embeddings (semantic), text (BM25/TF‑IDF), tags/topics/summary (light boosts).
- **RAG**: retrieved docs + text/snippets + metadata can ground downstream generation.

---

## 4) Practical Improvements (kept light)
- Keep summaries and tag/keyword extraction at upload; they improve rerank without extra runtime cost.
- Normalize text (strip headers/footers, collapse whitespace) before indexing.
- If available, store 3–5 section/page embeddings per doc at upload; at query time, take a max-section cosine on the top ~10 candidates for a small quality bump.
- Cache query results briefly (e.g., 2–5 minutes) if you expect repeated queries.

---

## 5) Key Files
- `backend/search.py`: hybrid search, scoring, indexes, endpoints.
- `backend/new_extract.py`: text extraction and (optionally) embeddings/summaries/tags.
- `backend/storage.py`: file storage helpers.
- `app.py`: wiring of endpoints/blueprints.

---

## 6) Summary
- Retrieval is hybrid: semantic (FAISS over stored embeddings) + lexical (TF‑IDF/BM25) + lightweight rerank (text, tags, summary, topics, names).
- Latency is contained by caching, prebuilt indexes, small candidate rerank, capped text matching, and a single shared embedding client.
- Upload populates the metadata (text, embedding, tags, summary) that powers both search and RAG grounding.


