# Retrieval System Design

> **Full documentation:** See [RETRIEVAL_AND_QUERY_CLASSIFICATION.md](RETRIEVAL_AND_QUERY_CLASSIFICATION.md) for retrieval pipeline, query classification, and single-hop vs multi-hop behaviour.

## Overview

Retrieval is split into:
1. **Query classification** – decide whether the user needs a **single-hop** (one doc, direct answer) or **multi-hop** (multiple docs, reasoning-based) response.
2. **Retrieval** – hybrid (FAISS + TF-IDF + BM25) + optional reranking; candidate set size may depend on intent.
3. **Answering** – single-doc direct answer vs multi-doc synthesis (to be specified later).

This document focuses on **query classification**.

---

## Query classifier (LLM-based)

### Purpose

Before running retrieval and answer generation, we classify the user query into:

| Intent         | Description | Retrieval / answer strategy |
|----------------|-------------|-----------------------------|
| **single_hop** | Answer can be found in one document; user expects a direct, factual answer. | Retrieve top-k docs; pick best one (or small set); return direct answer from that doc. |
| **multi_hop**  | Answer requires combining information from multiple documents or reasoning across them. | Retrieve a larger set; reason over multiple docs; synthesize an answer. |

### Design

- **Input:** User query string.
- **Output:** Structured result, e.g.:
  - `intent`: `"single_hop"` or `"multi_hop"`
  - `reasoning`: Short explanation (for logging/debugging and explainability).

- **Implementation:** Use an LLM with a **fixed system/user prompt** that:
  - Defines the two categories clearly.
  - Asks the model to respond in a strict format (e.g. JSON or a single line) so we can parse `intent` and optional `reasoning` reliably.

- **Fallback:** If the LLM is unavailable or parsing fails, default to `single_hop` (or a configurable default) so retrieval still runs.

### Example prompt (conceptual)

```
You are a query classifier for a document retrieval system.

Given a user question, classify it as:
- single_hop: The answer can be found in a single document. User wants a direct, factual answer (e.g. "What is the deadline in the circular?", "What does document X say about Y?").
- multi_hop: The answer requires combining or comparing multiple documents, or reasoning across several sources (e.g. "Compare the policies in doc A and doc B", "Which documents mention both X and Y?", "Summarize findings across all safety reports").

User query: "{query}"

Respond with exactly one line: intent=<single_hop|multi_hop> reasoning=<short explanation>
Or return valid JSON: {"intent": "single_hop"|"multi_hop", "reasoning": "..."}
```

### Integration

- **Call site:** Invoked at the start of the search/RAG flow (e.g. in the endpoint or in a retrieval service).
- **Caching:** Optional: cache `(query_normalized -> intent)` for repeated identical queries.
- **Downstream:** Retrieval layer uses `intent` to decide top_k, reranking depth, and whether to run single-doc vs multi-doc answer generation.

---

## Next steps (not in scope for this step)

- Retrieval: number of candidates and reranking by intent.
- Single-hop answer: pick best doc, return excerpt/answer.
- Multi-hop answer: multi-doc retrieval + synthesis pipeline.
