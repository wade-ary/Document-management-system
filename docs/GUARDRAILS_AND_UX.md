# Guardrails and User Experience

This document details all guardrails and UX-oriented changes added to the KMRL document management system so that the user experience remains efficient and predictable under failure or partial availability.

---

## 1. Query / Search Guardrails

### 1.1 Minimum document thresholds and rerun

- **Purpose:** If the retrieval pipeline returns too few documents, we automatically rerun with higher capacity to try to get more results.
- **Implementation:**
  - **Single-hop:** If result count is below `MIN_DOCS_SINGLE_HOP` (default 3), the pipeline is rerun with `top_n_per_index` and `rerank_top` doubled (capped at 200 and 50 respectively). The run that returns more documents is used.
  - **Multi-hop:** If result count is below `MIN_DOCS_MULTI_HOP` (default 5), the same rerun is performed with higher caps (300 and 100).
- **Location:** `backend/retrieval.py` — `single_hop_retrieval`, `multi_hop_retrieval`.
- **User impact:** Users get more results when the first pass is too strict or filters are heavy.

### 1.2 Reranking timeout

- **Purpose:** Fuzzy reranking over metadata must not block the API indefinitely.
- **Implementation:**
  - Rerank runs in a daemon thread with a timeout of `RERANK_TIMEOUT_SECONDS` (default 5 seconds).
  - If the timeout is hit, the pipeline returns the top documents by RRF score without applying fuzzy rerank.
- **Location:** `backend/retrieval.py` — `_fuzzy_rerank_with_timeout`, used inside `_run_pipeline`.
- **User impact:** Query responses return within a bounded time; quality may be slightly lower only when rerank times out.

### 1.3 FAISS and lexical index fallback (“system down” rule)

- **Purpose:** Search may use FAISS (semantic) and/or lexical indexes (TF-IDF, BM25). We require at least two effective indexes (FAISS + at least one lexical, or both lexical). If only one lexical index is available or none, we treat search as down.
- **Rules:**
  - If **no index** is available (FAISS and both lexical down or empty) → **system down**: do not run search; return 503 and notify backend tech.
  - If **only one lexical** index is available and FAISS is unavailable → **system down**: same as above.
  - If FAISS is unavailable but **both** TF-IDF and BM25 are available → **degraded**: search runs with lexical only; backend tech can be notified for awareness.
  - If at least two indexes are available (e.g. FAISS + one lexical, or both lexical) → **ok**: normal search.
- **Implementation:**
  - `backend/guardrails.py` — `get_search_availability()` returns `status` (`"ok"` | `"degraded"` | `"down"`), index flags, a user-facing `message`, and `notify_tech`.
  - `app.py` — `/api/query`: before calling retrieval, checks availability; if `status == "down"`, returns **503** with body `{ "error": "<message>", "code": "SEARCH_SYSTEM_DOWN" }` and calls `notify_backend_tech(...)`.
- **User impact:** Users see a clear “Search is temporarily unavailable. Technical team has been notified.” message instead of empty or confusing results when indexes are insufficient.

### 1.4 Backend tech notification (search)

- **Purpose:** When search is down (or optionally when degraded), the backend tech is notified so they can fix indexes or dependencies.
- **Implementation:**
  - `backend/guardrails.py` — `notify_backend_tech(message, context, level)`:
    - Writes to MongoDB collection `EDUDATA.system_alerts` with `message`, `context`, `level`, `created_at`.
    - Logs at ERROR (or WARNING for non-error level).
  - Called from `app.py` when `/api/query` returns 503 due to search down.
- **User impact:** Issues are tracked and can be resolved without users having to report “search not working.”

---

## 2. Ingestion Guardrails

### 2.1 Never block ingestion on metadata extraction failure

- **Purpose:** If text/metadata extraction fails (exception or empty for a supported type), ingestion must still complete: store file, save metadata, and mark the document for review. Ingestion is never fully blocked by extraction failure.
- **Implementation:**
  - **Extraction:** `backend/storage.py` — `upload_file()`:
    - Wraps `extract_text_from_file(...)` in try/except. On exception, sets `extracted_text = ""` and `extraction_failed = True`.
    - If extraction returns empty string for a supported type (e.g. PDF or TXT by extension or content-type), sets `extraction_failed = True`.
  - **Metadata:** Same function always inserts a metadata document. When `extraction_failed`:
    - Sets `ingestion_status = "incomplete"`, `metadata_incomplete = True`, `in_review_queue = True`.
  - **Review queue:** Inserts a record into `EDUDATA.ingestion_review_queue` with `file_id`, `reason: "metadata_extraction_failed"`, `created_at`.
  - **Indexes and compliance:** Adding to search indexes and running compliance is done only when `extracted_text` is non-empty; if extraction failed, these steps are skipped but the upload still returns success (200) with `file_id`.
- **Location:** `backend/storage.py` — `upload_file()`, and new helper `_get_review_queue_collection()`.
- **User impact:** Uploads always succeed from the user’s perspective; incomplete documents are still stored and can be fixed later via the dashboard review queue.

### 2.2 Dashboard review queue

- **Purpose:** Documents that had metadata extraction failures are marked and sent to a review queue so they can be reviewed, re-processed, or corrected.
- **Implementation:**
  - Metadata fields: `ingestion_status`, `metadata_incomplete`, `in_review_queue` (all set when extraction fails).
  - Collection: `ingestion_review_queue` with `file_id`, `reason`, `created_at`.
- **User impact:** Operators can filter or list “incomplete” or “in review queue” documents from the dashboard and take action (e.g. re-upload, manual metadata, or fix extraction).

---

## 3. Bug fix: `list_dir` result list

- **Purpose:** `list_dir` was appending to `result` without initializing it, which would raise at runtime.
- **Implementation:** Initialize `result: List[Dict[str, Any]] = []` before the loops in `list_dir`.
- **Location:** `backend/storage.py` — `list_dir()`.
- **User impact:** Directory listing works correctly.

---

## 4. Summary of files changed

| File | Changes |
|------|--------|
| `backend/guardrails.py` | **New.** `notify_backend_tech()`, `get_search_availability()`. |
| `backend/retrieval.py` | Min doc constants, `_fuzzy_rerank_with_timeout()`, min-docs rerun in single_hop/multi_hop, use timeout in pipeline. |
| `backend/storage.py` | Extraction failure handling, `ingestion_status` / `metadata_incomplete` / `in_review_queue`, `_get_review_queue_collection()`, review queue insert, `list_dir` result init. |
| `app.py` | `/api/query`: import guardrails; check `get_search_availability()`; on `status == "down"` return 503 and call `notify_backend_tech()`. |
| `docs/GUARDRAILS_AND_UX.md` | This document. |

---

## 5. Configuration constants (for tuning)

- **Retrieval** (`backend/retrieval.py`):
  - `MIN_DOCS_SINGLE_HOP` = 3
  - `MIN_DOCS_MULTI_HOP` = 5
  - `RERANK_TIMEOUT_SECONDS` = 5
- **Availability:** “Down” when fewer than two indexes available (no FAISS and only one or zero lexical). “Degraded” when FAISS is down but both lexical are up (or similar).

---

## 6. Frontend considerations

- **503 from `/api/query`:** When `code === "SEARCH_SYSTEM_DOWN"`, the frontend should display the `error` message (e.g. “Search is temporarily unavailable. Technical team has been notified.”) and optionally show a notification/banner so the user experience is clear and consistent.
- **Ingestion:** Upload response remains 200 with `file_id` even when extraction failed; the UI can optionally show a warning when the backend indicates `ingestion_status === "incomplete"` or `in_review_queue === true` (if the upload response is extended to include these flags).

These guardrails keep the system predictable and efficient for users while ensuring failures are recorded and routed to the right place (backend tech alerts and review queue).
