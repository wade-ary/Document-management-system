# Retrieval and Query Classification

## Overview

Retrieval in this system has three parts:

1. **Query classification** — Decide whether the user needs a **single-hop** answer (one document, direct) or a **multi-hop** answer (multiple documents, reasoning/synthesis).
2. **Retrieval pipeline** — Same pipeline for both styles; only scale and parameters differ (single-hop: fewer candidates, lighter reranking; multi-hop: more candidates, full reranking).
3. **Blurb (optional)** — After retrieval, top 5 docs can be summarized by an LLM into a short “blurb” that answers the query (see [BLURB.md](BLURB.md)).

This document describes **query classification** and the **two retrieval styles** (single-hop vs multi-hop).

---

## Query Classification

### Purpose

Before running retrieval (and any answer generation), we classify the user’s query into one of two intents:

| Intent | Description | Typical use |
|--------|-------------|-------------|
| **single_hop** | The answer can be found in **one** document. The user wants a **direct, factual** answer. | “What is the deadline in the circular?”, “What does the notice say about X?” |
| **multi_hop** | The answer requires **combining or comparing** multiple documents or **reasoning across** several sources. | “Compare the policies in doc A and B”, “Summarize findings across all safety reports” |

Classification is done with an **LLM** (OpenAI or Gemini) and a fixed prompt that defines the two categories and asks for a structured response (e.g. JSON: `intent`, `reasoning`). If the LLM is unavailable or the response cannot be parsed, the system falls back to **single_hop** so retrieval still runs.

### API

- **Module:** `backend/query_classifier.py`
- **Function:** `classify_query(query: str) -> Dict`
  - **Returns:** `{ "intent": "single_hop" | "multi_hop", "reasoning": str }`

### Downstream use

- The retrieval layer (or the API that calls it) uses `intent` to choose:
  - **Single-hop:** Smaller top-N per index, smaller final top_k, lighter fuzzy reranking.
  - **Multi-hop:** Larger top-N, larger final top_k, full fuzzy reranking over more candidates.
- Later, answer generation can use the same intent to decide between single-doc extraction vs multi-doc synthesis.

---

## Retrieval Pipeline (shared)

Both single-hop and multi-hop use the **same pipeline**; only the **scale** of retrieval and reranking differs.

### Steps

1. **Embed query**  
   The query is embedded using the **same** embedding model as the FAISS index (so semantic search is consistent).

2. **Top-N per index**  
   For the given query, retrieve the top N documents from each of:
   - **FAISS** (semantic, vector similarity)
   - **TF-IDF** (lexical)
   - **BM25** (lexical)  
   Each index returns an ordered list of `(file_id, rank)`.

3. **Reciprocal Rank Fusion (RRF)**  
   Fuse the three ranked lists with:
   - `score(d) = Σ 1 / (k + rank)` over each index (e.g. k = 60).  
   Result: one ranked list of `(file_id, rrf_score)`.

4. **Hard metadata filters**  
   Load metadata for the fused file_ids and apply:
   - **Date range** (e.g. `date_from`, `date_to` on upload_date)
   - **Department(s)** (from metadata or compliance)
   - **File types** (e.g. pdf, docx)  
   Documents that do not match are dropped; the rest form a **filtered ranked list** with metadata attached.

5. **Fuzzy rerank**  
   Rerank the filtered list by **fuzzy match** of the query against:
   - Summary (and compliance summary)
   - Key topics / keywords
   - Tags
   - File name  
   Combined score (e.g. fuzzy + RRF) produces the **final ranked list**.

---

## Single-Hop Retrieval

### When to use

- Query classified as **single_hop**, or when the UI/API is designed for “one clear answer”.
- User expects a **direct answer** from one (or a very small number of) document(s).

### Scale (defaults)

- **Top-N per index:** 25 (fewer candidates).
- **Final top_k:** 15.
- **Rerank window:** Only the top 10 candidates are fuzzy-reranked; the rest are appended by RRF order to fill up to 15.

### Effect

- Fewer documents are considered and reranked, so **lower latency** and **lower cost**.
- Results are tuned for “best single (or few) doc(s)” rather than broad coverage.

### API

- **Module:** `backend/retrieval.py`
- **Function:** `single_hop_retrieval(query, metadata_collection, filters=None, *, top_n_per_index=25, final_top_k=15, rerank_top=10)`
- **Returns:** List of `{ file_id, rrf_score, metadata, fuzzy_score }` (and any extra fields attached by the pipeline), in final order.

---

## Multi-Hop Retrieval

### When to use

- Query classified as **multi_hop**, or when the UI/API is designed for “compare / summarize across docs”.
- User needs to **reason over** or **synthesize** information from multiple documents.

### Scale (defaults)

- **Top-N per index:** 80 (more candidates).
- **Final top_k:** 50.
- **Rerank window:** Top 50 candidates are fuzzy-reranked, then trimmed to 50.

### Effect

- More documents are considered and reranked, so **better coverage** for comparison and synthesis.
- **Higher latency** and more compute than single-hop.

### API

- **Module:** `backend/retrieval.py`
- **Function:** `multi_hop_retrieval(query, metadata_collection, filters=None, *, top_n_per_index=80, final_top_k=50, rerank_top=50)`
- **Returns:** Same shape as single-hop: list of `{ file_id, rrf_score, metadata, fuzzy_score }` in final order.

---

## Comparison Summary

| Aspect | Single-hop | Multi-hop |
|--------|------------|-----------|
| **Intent** | One doc, direct answer | Multiple docs, reasoning/synthesis |
| **Top-N per index** | 25 | 80 |
| **Final top_k** | 15 | 50 |
| **Rerank window** | 10 | 50 |
| **Latency / cost** | Lower | Higher |
| **Use case** | “What does this doc say?” | “Compare / summarize across docs” |

---

## Filters (both styles)

Optional `filters` dict passed to both retrieval functions can include:

- **`date_from`** / **`date_to`**: ISO date strings; filter by document upload date.
- **`department`** or **`departments`**: Restrict to one or more departments (metadata + compliance.departments).
- **`file_types`**: List of extensions, e.g. `["pdf", "docx"]`.

---

## Integration with Query Classifier and Blurb

1. **Classify:** `intent = classify_query(user_query)["intent"]`
2. **Retrieve:**  
   - If `intent == "single_hop"`: `docs = single_hop_retrieval(user_query, metadata_collection, filters)`  
   - Else: `docs = multi_hop_retrieval(user_query, metadata_collection, filters)`
3. **Blurb (optional):** `task_id = start_blurb_background(user_query, docs, metadata_collection)`  
   Client can poll `get_blurb_cached(task_id)` or `get_blurb_cached_by_query(user_query, file_ids)` until the blurb is ready.

---

## Implementation Notes

- **Retrieval:** `backend/retrieval.py` (uses `backend/search.py` for indexes and `get_ranked_lists`, and internal helpers for RRF, metadata filter, fuzzy rerank).
- **Query classifier:** `backend/query_classifier.py`.
- **Indexes:** Same FAISS, TF-IDF, and BM25 indexes built at ingestion (see [INGESTION_PIPELINE_DESIGN.md](INGESTION_PIPELINE_DESIGN.md)); no separate index for single vs multi-hop.
