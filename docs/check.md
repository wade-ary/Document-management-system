Here’s a practical set of changes to cut latency on `find_precedent` / precedent analysis without losing quality:

### 0) Quick wins (minimal code diff)
- **Trim candidate set**: In the initial hybrid search, fetch only top 30 (not 50–100). Rerank only top 15–20.
- **Projection-only Mongo reads**: When loading candidates, request just the fields needed (`file_id`, `name`, `summary`, `summary_embedding`, `summary_keywords`, `extracted_text` (first 2k chars), `document_type`, `key_topics`, `path`, `upload_date`). Avoid pulling full text or large arrays.
- **Cache summary features at upload**: Ensure `summary_embedding` and `summary_keywords` are always stored at upload; never compute embeddings during the request path.
- **Use the small embedding model**: Keep `text-embedding-3-small` for summaries; do NOT instantiate the embedding client per call—reuse a singleton.
- **Cap text normalization**: When cleaning text/snippets, slice early (e.g., 2k chars max) before keyword extraction.

### 1) Rerank efficiency
- **Single pass, no loops over big docs**: Rerank only with:
  - Precomputed `summary_embedding` cosine
  - Keyword overlap
  - Metadata bonuses (type/authority/ref/date/entities if present)
- **Drop heavy section analysis** in the hot path; if needed, move to a “deep compare” endpoint on-demand.
- **Avoid repeated `extract_document_structure`** on long text; cache or skip if not strictly needed for rerank.

### 2) Hybrid search hygiene
- **FAISS / indexes warm**: Build once at startup, keep in memory; avoid rebuilds during requests.
- **BM25/TF-IDF scope**: Run on summaries + short text snippets only, not full extracted text.
- **Fuzzy match scope**: Apply fuzzy only on reference/filename, not entire text.

### 3) Mongo and network
- **Indexes**: Ensure `metadata` has indexes on `file_id`, `approvalStatus`, `visible`, `document_type`, `upload_date`.
- **Reduce round-trips**: Batch fetch the candidate docs in one query using `file_id` `$in` with projection.

### 4) Timeouts and guards
- **Set hard timeouts** on any external calls (if any remain) and on embedding calls (but ideally zero embedding calls on request).
- **Fail fast**: If no `summary_embedding`, fall back to keyword overlap + base score, don’t attempt long text embedding.

### 5) Optional deeper accuracy without latency
- **Precompute section/page embeddings at upload** (3–5 per doc); store them. At request time, rerank only top 10 using those small vectors (still cheap).
- **Light BM25 cache**: Keep an in-memory BM25 over summaries/snippets; rebuild asynchronously on a schedule, not per request.

### 6) If 20–30s persists, check these hotspots
- Rebuilding indexes or loading FAISS per request
- Generating embeddings per request
- Scanning large `extracted_text` strings without slicing
- Multiple Mongo calls without projection or without `$in` batching

If you’d like, I can implement the optimizations in code with:
- Singleton embedding client
- Strict projections and text slicing
- Smaller candidate set + rerank top 15–20
- No per-request embeddings
- Optional section-embeddings rerank for top 10 only