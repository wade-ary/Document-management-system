# Ingestion Pipeline Design (Base)

## Purpose

When a document is uploaded, the system must:
1. Persist the file in GridFS.
2. Extract text from the document (PDF and TXT supported).
3. Maintain search indexes: FAISS, TF-IDF, and BM25 — by adding the new document to existing indexes or building them if they don’t exist.

This document describes the **base** ingestion pipeline. More stages (embeddings, tags, precedent signals, etc.) will be added later.

---

## Pipeline Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────────────┐
│  Upload Request │────▶│  1. Store in      │────▶│  2. Extract text (helper)   │
│  (file + meta)  │     │     GridFS        │     │     PDF + TXT               │
└─────────────────┘     └──────────────────┘     └──────────────┬──────────────┘
                                                                │
                                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  3. Persist metadata (e.g. metadata collection)                                 │
│     - file_id, path, user_id, department, extracted_text, ...                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                                                │
                                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  4. Update search indexes                                                       │
│     - FAISS: add normalized embedding vector (or build index if empty)          │
│     - TF-IDF: add document to matrix / rebuild if needed                         │
│     - BM25: add tokenized text to corpus (or build if empty)                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Store file in GridFS

- **Input:** Raw file bytes (from multipart form or webhook payload).
- **Action:** Save file in GridFS; obtain `file_id` (ObjectId).
- **Output:** `file_id` for use in metadata and indexes.
- **Notes:** Same as current app behaviour; backend provides a function that takes file + optional metadata and returns `file_id`.

---

## Stage 2: Extract text (helper)

- **Contract:** One helper used by the pipeline: **extract text from a file (PDF or TXT)**.
- **Input:** Either:
  - `file_id` (read file from GridFS), or  
  - in-memory file bytes + filename (e.g. during upload before GridFS write).
- **Output:** Plain text string (empty string if unsupported type or extraction failure).
- **Supported types:**
  - **TXT:** Read as UTF-8 (with fallback for encoding errors); return decoded text.
  - **PDF:** Use a single extraction path (e.g. text-based extraction first; optional OCR later as an enhancement). Return concatenated text from all pages.
- **Unsupported types:** Return empty string (or a clear “unsupported” result); pipeline can still save file and metadata but will have no text for indexes.
- **Implementation note:** Keep this as a single helper (e.g. `extract_text_from_file(file_source, filename_or_content_type)`) so the rest of the pipeline and any “add to index” logic depend only on the extracted string.

---

## Stage 3: Persist metadata

- **Storage:** MongoDB collection (e.g. `metadata`), one document per file.
- **Minimum fields for base pipeline:**
  - `file_id` (GridFS ID)
  - `extracted_text` (result of Stage 2)
  - Path, user_id, department, and any other fields the app already uses for listing/permissions.
- **When:** Immediately after text extraction; before or in parallel with index updates (see below).

---

## Stage 4: Update search indexes

For each new document we have: `file_id`, `extracted_text`, and (for FAISS) an embedding vector derived from `extracted_text`. Index behaviour:

- **FAISS**
  - **Build:** If no index exists, create FAISS index from all approved/visible documents that have embeddings (or from current corpus if we build from DB).
  - **Add:** If index exists, compute one embedding for the new document’s `extracted_text`, normalize, add vector to FAISS, store mapping `faiss_index_row → file_id`.
- **TF-IDF**
  - **Build:** If no TF-IDF matrix exists, fit vectorizer on current corpus (e.g. all `extracted_text`), then build matrix and store mapping `matrix_row → file_id`.
  - **Add:** If matrix exists, transform the new document’s text and append row to the matrix; append `file_id` to the ordered list that maps row index → `file_id`. (Alternatively, rebuild when corpus is small or on a schedule; design choice left to implementation.)
- **BM25**
  - **Build:** If no BM25 corpus exists, tokenize all documents, build BM25Okapi corpus, store mapping `corpus_index → file_id`.
  - **Add:** If corpus exists, tokenize the new document, append to corpus, rebuild BM25Okapi from the updated corpus (or use an implementation that supports incremental add if available).

**Important:** FAISS requires an embedding per document. So either:
- Embedding is computed during ingestion (same place as “add to FAISS”), or  
- A separate step (e.g. “embedding job”) runs after metadata is stored and then “add to FAISS” runs; for the base design we can assume embedding is produced in the same pipeline as “add to FAISS” so that one pass over the new document is enough.

**Idempotency / rebuild:**  
- “Add” path: one new document.  
- “Build” path: full rebuild from DB (e.g. all documents that should be searchable).  
- A separate “rebuild indexes” API can trigger “build” for all three indexes when needed (e.g. after bulk delete or schema change).

---

## Data flow summary

| Step | Input | Output |
|------|--------|--------|
| 1. GridFS | File bytes, optional metadata | `file_id` |
| 2. Extract text | `file_id` or bytes + filename | `extracted_text` (string) |
| 3. Metadata | `file_id`, `extracted_text`, path, user, dept, … | Document in `metadata` collection |
| 4a. FAISS | `file_id`, `extracted_text` (→ embedding) | Index updated + mapping updated |
| 4b. TF-IDF | `file_id`, `extracted_text` | Matrix + mapping updated |
| 4c. BM25 | `file_id`, `extracted_text` (tokenized) | Corpus + index + mapping updated |

---

## API / entrypoints (conceptual)

- **Upload (existing):**  
  `POST /upload` (and webhook) → run full pipeline: GridFS → extract text → metadata → update indexes.  
  Backend exposes something like: `upload_file(...)` that internally runs stages 1–4 (and returns `file_id` + status so app can keep current response shape).

- **Rebuild indexes (existing concept):**  
  `POST /search/rebuild` → for all searchable documents, (re)build FAISS, TF-IDF, and BM25 from DB. No GridFS or extraction in this path.

---

## Out of scope for this base design (add later)

- Embedding model choice and where it runs (same process vs worker).
- DOCX, images, OCR — can be added to the same text-extraction helper later.
- Reranking, query rerouter, precedent finder, in-doc RAG — all consume these indexes but are not part of ingestion.
- Access control / “approved/visible” — define which documents are included when building indexes; filtering can be added in the implementation.

---

## Summary

- **GridFS:** store file; get `file_id`.
- **Helper:** one function for text extraction; supports **PDF** and **TXT**; returns string.
- **Metadata:** persist `file_id`, `extracted_text`, and existing fields.
- **Indexes:** add new doc to FAISS (with embedding), TF-IDF, and BM25; or build all three from DB when no index exists or on rebuild.

Next step: implement this base pipeline (backend modules + wiring in app), then extend with more ingestion features as needed.
