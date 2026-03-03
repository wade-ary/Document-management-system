# KMRL Document Management System

This README describes the core features of the document management system: hybrid data storage, query classification, document precedent finder, and the compliance dashboard.

---

## 1. Hybrid Data Storage System

The system uses a **hybrid storage and indexing** approach so documents are both stored and searchable in multiple ways.

### Storage layers

| Layer | Purpose |
|-------|---------|
| **GridFS** | Raw file storage. Each uploaded file (PDF, TXT, etc.) is stored in MongoDB GridFS. The returned `file_id` (ObjectId) uniquely identifies the file. |
| **Metadata collection** | One MongoDB document per file with: upload fields (filename, path, user_id, department, upload_date, etc.), **extracted_text** (plain text from PDF/TXT), and after processing: **summary**, **is_regulatory**, and a nested **compliance** object (title, deadline, risk level, departments, keywords, risk scores). |
| **Compliance documents collection** | A separate collection used by the compliance dashboard and retrieval. Each entry has file_id, summary, department, status, actionable items, and the full **compliance** result (risk matrix, radar chart, scores). |
| **Search indexes** | Three in-memory indexes built from **extracted_text** and kept in sync on each upload: **FAISS** (semantic, vector similarity), **TF-IDF** (lexical), and **BM25** (lexical). They map document content to **file_id** for retrieval. |

### Ingestion flow

1. **Store in GridFS** → get `file_id`.
2. **Extract text** from PDF/TXT (single helper; unsupported types yield empty text).
3. **Persist metadata** (upload fields + extracted text) in the metadata collection.
4. **Update search indexes**: add the document to FAISS (using an embedding of the text), TF-IDF matrix, and BM25 corpus.
5. **Compliance extraction**: from the extracted text, derive title, issuing authority, deadline, departments, keywords, summary, and risk scores. Update the metadata document and upsert into the compliance_documents collection.

If text extraction fails, the file is still stored in GridFS and metadata is saved with flags (`ingestion_status: incomplete`, `in_review_queue: true`); the document is not blocked from ingestion and can be reviewed later.

---

## 2. Query Classification

Before running search, the system classifies the user’s query into one of two intents so retrieval can be tuned appropriately.

### Intents

| Intent | Description | Example queries |
|--------|-------------|-----------------|
| **single_hop** | The answer can be found in **one** document; the user wants a direct, factual answer. | “What is the deadline in the circular?”, “What does the notice say about X?” |
| **multi_hop** | The answer requires **combining or comparing** multiple documents or **reasoning across** several sources. | “Compare the policies in document A and B”, “Summarize findings across all safety reports” |

### How it works

- An **LLM** (OpenAI or Gemini) is called with a fixed prompt that defines these two categories and asks for a structured response (e.g. JSON with `intent` and `reasoning`).
- If the LLM is unavailable or the response cannot be parsed, the system defaults to **single_hop** so that retrieval still runs.
- The **retrieval pipeline** uses the intent:
  - **Single-hop:** Smaller top-N per index (e.g. 25), smaller final list (e.g. 15), lighter fuzzy reranking (top 10 only).
  - **Multi-hop:** Larger top-N (e.g. 80), larger final list (e.g. 50), full fuzzy reranking over more candidates.

The same pipeline (embed → top-N from FAISS, TF-IDF, BM25 → RRF → metadata filters → fuzzy rerank) is used for both; only the scale and rerank window differ.

---

## 3. Document Precedent Finder

The **precedent finder** answers: “Which past documents are most like this one?” It uses the **document itself as the query**, not a free-text search string.

### How it works

1. **Document as query**  
   For a given `file_id`, the system builds a single “query” from:
   - Extracted text (e.g. first 4,000 characters)
   - Summary (from document or compliance)
   - Keywords / key topics
   - Tags

2. **Same retrieval pipeline as search**  
   This query is run through the same hybrid pipeline:
   - Embed the query (same model as FAISS)
   - Get top-N per index (FAISS, TF-IDF, BM25) with N tuned for precedents (e.g. 40)
   - Reciprocal Rank Fusion (RRF) across the three indexes
   - Exclude the current document from results
   - Optional hard filters (date range, file types, department)
   - Fuzzy rerank over summary, keywords, tags, and filename

3. **Structural similarity**  
   For each candidate document, the system:
   - Extracts **document structure** (type, sections, length, common phrases)
   - Computes **structural similarity** with the source document
   - Combines retrieval score with structural score (with a small bonus for same document type)
   - Applies a **similarity threshold** and returns a ranked list of precedents

### Main capabilities

- **Find precedents:** Given a `file_id`, return a ranked list of similar documents with relevance and structural scores.
- **Compare two documents:** Side-by-side comparison with structural similarity and fuzzy section-level matching.
- **Analyze precedent relationship:** Use an LLM to summarize how a precedent relates to the current document (similarities, applicability, differences).

Precedent finding reuses the same FAISS, TF-IDF, and BM25 indexes as user search; only the “query” is derived from a document instead of typed text.

---

## 4. Compliance Dashboard Features

The compliance dashboard surfaces documents that need attention: high risk, urgent deadlines, regulatory, or incomplete after failed extraction.

### Data source

- Data comes from the **compliance_documents** collection (and, when empty, from metadata documents that have a **compliance** object).
- Each document has structured compliance fields: title, issuing authority, deadline, departments, keywords, summary, **risk level** (High/Medium/Low), **risk matrix** and **radar chart** (safety, operational, regulatory, deadline-urgency scores), and **is_regulatory**.

### Dashboard behaviour

- **Summary counts:** Total with compliance, high-risk count, medium-risk count, urgent-deadline count, regulatory count, and **needs-attention count** (documents that are high risk, have an urgent deadline, or are regulatory).
- **Needs attention:** A dedicated list of documents that require review:
  - **High risk** (risk level High)
  - **Urgent deadline** (overdue or due within 7 days)
  - **Regulatory** (is_regulatory true)
- **Filtering:** Optional filters by department, risk level, or “urgent only” (deadline within 7 days or overdue).
- **Capped lists:** Needs-attention list capped (e.g. 50); high-risk, urgent-deadline, and regulatory lists each capped (e.g. 30) for performance.

### Incomplete documents and review queue

- If **metadata extraction fails** during ingestion (e.g. PDF returns no text), the document is still stored and metadata is saved with:
  - **ingestion_status:** `incomplete`
  - **metadata_incomplete:** true
  - **in_review_queue:** true
- A record is added to the **ingestion_review_queue** collection with `file_id`, `reason: "metadata_extraction_failed"`, and `created_at`.
- Ingestion **never blocks** on extraction failure; the dashboard can list and prioritize these for manual review or re-processing.

### API

- **GET/POST `/api/compliance/dashboard`**  
  Query/body parameters: `department`, `risk_level`, `urgent_only`, `limit`.  
  Returns: **summary** (counts), **needs_attention**, **high_risk**, **urgent_deadline**, **regulatory**, and **items** (full list subject to filters and limit).

---

## Summary

| Feature | Description |
|---------|-------------|
| **Hybrid data storage** | GridFS for files; MongoDB metadata + compliance_documents for structured data; FAISS, TF-IDF, and BM25 for semantic and lexical search. Ingestion pipeline: store → extract text → metadata → update indexes → compliance extraction. |
| **Query classification** | LLM-based classification into single_hop (one-doc answer) or multi_hop (multi-doc reasoning). Drives retrieval scale and reranking. |
| **Document precedent finder** | Document used as query; same retrieval pipeline + structural similarity to find and rank similar past documents; optional compare and LLM analysis. |
| **Compliance dashboard** | High-risk, urgent-deadline, and regulatory documents; needs-attention list; filters and counts; review queue for incomplete/failed extraction. |
