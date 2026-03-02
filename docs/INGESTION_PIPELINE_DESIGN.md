# Ingestion Pipeline Design (Base)

## Purpose

When a document is uploaded, the system must:
1. Persist the file in GridFS.
2. Extract text from the document (PDF and TXT supported).
3. Persist **metadata** (upload fields + extracted text), then run **compliance extraction** to add structured fields (title, deadline, departments, summary, risk scores, etc.).
4. Maintain search indexes: FAISS, TF-IDF, and BM25 — by adding the new document to existing indexes or building them if they don’t exist.

This document describes the **base** ingestion pipeline and the **metadata fields** collected at each stage. More stages (e.g. tags, precedent signals) can be added later.

---

## Metadata extraction and fields

### A. Fields from upload request (form / API)

Collected at ingest from the client and stored as-is in the **metadata** collection:

| Field | Description | Required / default |
|-------|-------------|--------------------|
| `file_id` | GridFS document ID (set after Stage 1) | Set by pipeline |
| `name` | Original filename | From upload |
| `path` | Target directory path | Required; default `~/Sandbox` |
| `user_id` | User who uploaded | Required |
| `account_type` | e.g. Staff, Admin | Optional; default `Staff` |
| `department` | Department code/slug | Optional; default `""` |
| `access_to` | Visibility: `all` or comma-separated departments | Optional; default `all` |
| `important` | Flag string (`true` / `false`) | Optional; default `false` |
| `approvalStatus` | `pending` until approved | Set by pipeline |
| `visible` | Whether doc is visible in search/list | Set `False` until approved |
| `upload_date` | ISO timestamp (UTC) | Set by pipeline |
| `uploaded_by` | Who performed upload (e.g. admin / department) | Optional |
| `deadline` | User-supplied deadline string | Optional |
| `document_type` | User- or UI-supplied doc type | Optional |

### B. Fields from text extraction (Stage 2)

| Field | Description | Where stored |
|-------|-------------|--------------|
| `extracted_text` | Full plain text from PDF/TXT | **metadata** document |

### C. Fields from compliance extraction (Stage 5)

After the initial metadata insert, the **compliance pipeline** runs on `extracted_text` and filename. It extracts structured data and **updates** the same metadata document (and upserts into **compliance_documents**). All of the following are **derived from the document content** (and optionally from existing metadata for department/source).

**Written back onto the metadata document:**

| Field | Description | How it is derived |
|-------|-------------|-------------------|
| `summary` | Short summary (e.g. 3 bullet points) | Leading sentences / structured snippet from `extracted_text` |
| `is_regulatory` | Boolean | Regulatory keyword score above threshold |
| `compliance` | Full compliance result object (see below) | — |
| `actionableItems` | List of actionable items | From metadata or empty; can be extended later |

**Nested object: `compliance`** (stored inside the metadata document):

| Field | Description | How it is derived |
|-------|-------------|-------------------|
| `id` / `file_id` | Document ID | Pass-through |
| `title` | Document title | Patterns (Circular No, Notice, Office Order, Subject, etc.) or first non-empty line or filename |
| `issuingAuthority` | Issuing body | Patterns (Issued by, From, Authority, By order of, Office of) or “Unknown (review in dashboard)” |
| `riskLevel` | High / Medium / Low | From combined safety, operational, regulatory, and deadline-urgency scores |
| `department` | Primary department | Keyword scoring over `extracted_text` + upload `department`; else “General” |
| `departments` | List of related departments | Same keyword scoring; threshold-based |
| `deadline` | ISO date string (if found) | Patterns (due by, submit by, last date, no later than, etc.) + date regex |
| `rawDeadlineSnippet` | Raw snippet containing deadline | Same pass as deadline |
| `keywords` | Key topics (top TF-IDF terms) | TF-IDF over single document; top ~10 terms |
| `summary` | Same as top-level `summary` | As above |
| `is_regulatory` | Boolean | As above |
| `source` | e.g. `upload` | From metadata or default |
| `description` | Same as summary | Copy of summary |
| `extractedDate` | When compliance ran (ISO) | Set by pipeline |
| `riskMatrix` | Per-category scores | Safety, Operational, Regulatory, DeadlineUrgency, Overall (0–1) |
| `radarChart` | `{ labels, values }` for UI | Same four categories + values |
| `scores` | Raw scores dict | safety, operational, regulatory, deadline, overall |

**Compliance risk scoring (all from cleaned text):**

- **Deadline-based:** Urgency from parsed deadline (overdue → high, &lt; 7 days → high, etc.).
- **Safety:** Keyword count (accident, incident, hazard, injury, etc.).
- **Operational:** Keyword count (delay, disruption, maintenance, etc.).
- **Regulatory:** Keyword count (regulation, compliance, audit, mandate, etc.).  
Overall combines these with deadline urgency; `is_regulatory` is true when regulatory score ≥ threshold.

### D. Where each set of fields lives

- **metadata collection:** One document per file. Contains: upload fields (A), `extracted_text` (B), and after Stage 5: `summary`, `is_regulatory`, `compliance`, `actionableItems` (C).
- **compliance_documents collection:** One document per file; used for dashboard/retrieval. Contains: `file_id`, `filename`, `upload_date`, `language`, `status`, `summary`, `doc_type`, `department`, `is_regulatory`, `actionable_items`, and nested `compliance` (same structure as above).

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
│  3. Persist metadata (metadata collection)                                       │
│     Upload fields (A) + extracted_text (B) — see “Metadata extraction” above     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                                                │
                                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  4. Update search indexes                                                        │
│     FAISS, TF-IDF, BM25 (add or build)                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                                                │
                                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  5. Compliance extraction + persist                                              │
│     From extracted_text: title, authority, deadline, departments, topics,        │
│     summary, risk scores. Update metadata doc; upsert compliance_documents.     │
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

- **Storage:** MongoDB **metadata** collection, one document per file.
- **Fields written here:** All upload fields (see **A** in “Metadata extraction”) plus `extracted_text` (see **B**). No compliance fields yet.
- **When:** Immediately after text extraction; before index updates.  
- **Later:** Stage 5 (compliance) updates the same document with `summary`, `is_regulatory`, `compliance`, and `actionableItems` (see **C**).

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
| 3. Metadata | `file_id`, `extracted_text`, upload fields (A) | Document in **metadata** collection |
| 4a. FAISS | `file_id`, `extracted_text` (→ embedding) | Index updated + mapping updated |
| 4b. TF-IDF | `file_id`, `extracted_text` | Matrix + mapping updated |
| 4c. BM25 | `file_id`, `extracted_text` (tokenized) | Corpus + index + mapping updated |
| 5. Compliance | `file_id`, `extracted_text`, filename, existing metadata | **metadata** doc updated with (C); **compliance_documents** upserted with formatted_doc + compliance |

---

## API / entrypoints (conceptual)

- **Upload (existing):**  
  `POST /upload` (and webhook) → run full pipeline: GridFS → extract text → metadata (Stage 3) → update indexes (Stage 4) → compliance extraction (Stage 5).  
  Backend `upload_file(...)` runs stages 1–5 and returns `file_id` + status.

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
- **Metadata:** persist upload fields (A) and `extracted_text` (B) in **metadata**; then compliance extraction (Stage 5) adds summary, risk, title, deadline, departments, keywords, etc. (C) to the same document and to **compliance_documents**.
- **Indexes:** add new doc to FAISS (with embedding), TF-IDF, and BM25; or build all three from DB when no index exists or on rebuild.

Next step: implement this base pipeline (backend modules + wiring in app), then extend with more ingestion features as needed.
