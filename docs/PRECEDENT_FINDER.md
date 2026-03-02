# Precedent Finder

## Purpose

The **Precedent Finder** finds historical documents that are **similar** to a given document. It answers: “Which past documents are most like this one?” — useful for circulars, policies, reports, and letters (including resumes). It does **not** use a free-text search query; it uses the **document itself as the query**.

---

## How It Works

1. **Document as query**  
   For a given `file_id`, the system loads the document’s text and metadata and builds a single “query” from:
   - `extracted_text` (first 4,000 characters)
   - `summary` (from document or compliance)
   - `keywords` / key topics (from document or compliance)
   - `tags`

2. **Same retrieval pipeline as search**  
   That query is run through the same hybrid retrieval pipeline used for user search:
   - **Embed** the query (same embedding model as the FAISS index)
   - **Top-N per index** (FAISS, TF-IDF, BM25) with N = 40 for precedents
   - **Reciprocal Rank Fusion (RRF)** across the three indexes
   - **Exclude** the current document from the fused list
   - **Hard filters** (optional): date range, file types, department
   - **Fuzzy rerank** over summary, keywords, tags, and filename

3. **Structural similarity**  
   For each candidate, the system:
   - Extracts **document structure** (type, sections, length, common phrases)
   - Computes **structural similarity** with the source document
   - Combines retrieval score with structural score (and a small bonus for same document type)
   - Applies a **similarity threshold** and returns a ranked list of precedents

So precedent finding is **“find docs similar to this one”** by turning the document into a query and reusing the same indexes and retrieval logic.

---

## Main Functions

| Function | Description |
|----------|-------------|
| **`find_precedents(file_id, ...)`** | Find documents similar to the document identified by `file_id`. Returns a ranked list with relevance and structural scores. |
| **`compare_documents(file_id_1, file_id_2)`** | Compare two documents: structural similarity and fuzzy section-level matching. |
| **`analyze_precedent_relationship(current_file_id, precedent_file_id)`** | Use an LLM to explain how the precedent relates to the current document (summary, similarities, applicability, differences). |

---

## find_precedents

**Signature (conceptual):**

```text
find_precedents(
    file_id: str,
    similarity_threshold: float = 0.2,
    file_types: Optional[List[str]] = None,
    date_range: Optional[Tuple[str, str]] = None,
    top_k: int = 50,
    metadata_collection = None,
) -> Dict
```

**Returns:**

- **`results`**: List of precedent docs, each with:
  - `file_id`, `file_name`, `path`
  - `relevance_score`, `structural_score`
  - `document_type`, `tags`, `upload_date`, `key_topics`, `matching_sections`
- **`total_found`**: Number of precedents above the threshold
- **`current_document`**: `file_id`, `file_name`, `path` of the source document
- **`error`**: Set only on failure (e.g. document not found, no searchable content)

**Parameters:**

- **`similarity_threshold`**: Minimum combined score (0.0–1.0); default 0.2.
- **`file_types`**: Optional filter, e.g. `["pdf", "docx"]`.
- **`date_range`**: Optional `(start_date, end_date)` (e.g. ISO strings) to restrict by upload date.
- **`top_k`**: Maximum number of precedents to return (default 50).

---

## compare_documents

**Purpose:** Side-by-side comparison of two documents.

**Steps:**

1. Load both documents from metadata.
2. **Extract structure** for each (document type, sections, length, common phrases).
3. Split text into sections (e.g. lines > 30 chars) and run **fuzzy section matching** (e.g. `fuzz.partial_ratio` > 0.7).
4. Compute **structural similarity** between the two structures.

**Returns:**

- **`document_1`** / **`document_2`**: file_id, name, path, tags, key_topics, upload_date, document_type.
- **`matching_sections`**: Pairs of similar sections with similarity score and positions.
- **`total_matches`**: Count of section pairs above the threshold.
- **`structural_similarity`**: Score in [0, 1].

---

## analyze_precedent_relationship

**Purpose:** Explain in natural language how a precedent document relates to the current one.

**Steps:**

1. Load both documents and take short text previews (e.g. first 1,200 chars).
2. Extract structure and key topics for both.
3. Build a prompt describing both docs (name, type, topics, preview).
4. Call an **LLM** (Gemini preferred, OpenAI fallback) to produce a structured analysis.
5. Parse JSON with keys: **`summary`**, **`similarities`**, **`applicability`**, **`differences`**.

**Returns:**

- **`current_document`** / **`precedent_document`**: file_id, file_name, upload_date (for precedent).
- **`analysis`**: Dict with `summary`, `similarities`, `applicability`, `differences` (or raw text in `summary` if JSON parsing fails).

---

## Document Structure (extract_document_structure)

Used for both precedent scoring and comparison.

- **Document type**: Inferred from keywords (e.g. report, policy, circular, notice, order, scheme, memorandum, letter/resume).
- **Sections**: Header-like lines (all-caps, “Title:”, “1. Heading”).
- **Length category**: short (&lt; 500 words), medium (&lt; 2000), long.
- **Common phrases**: Frequent bigrams and trigrams.

**Structural similarity** combines: same document type, same length category, section overlap (Jaccard), and common-phrase overlap.

---

## API Endpoints (app.py)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/find-precedents` | POST | Body: `file_id`, optional `similarity_threshold`, `file_types`, `date_range`, `top_k`. Returns precedent list. |
| `/api/compare-documents` | POST | Body: `file_id_1`, `file_id_2`. Returns comparison and matching sections. |
| `/api/precedent-analysis` | POST | Body: `current_file_id`, `precedent_file_id`. Returns LLM analysis. |

---

## Implementation Notes

- **Module:** `backend/precedent_finder.py`
- **Dependencies:** Same retrieval stack as search: `get_search_engine()`, `_reciprocal_rank_fusion`, `_apply_metadata_filters`, `_fuzzy_rerank` from `backend.retrieval`; metadata from `backend.db` (EDUDATA).
- **No separate index:** Precedent finding reuses the same FAISS, TF-IDF, and BM25 indexes as user search; only the “query” is derived from a document instead of typed text.
