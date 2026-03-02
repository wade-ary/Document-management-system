# Gemini-Style Blurb

## Purpose

The **blurb** is a short (2–4 sentence) summary that **directly answers the user’s question** using the **top retrieved documents**. It runs **after** retrieval: once the ranked list is available, the system takes the **top 5** docs, sends their excerpts plus the user query to an LLM, and gets back a concise “blurb” that can be shown above or alongside the result list (similar to Gemini’s summary snippet).

It is designed to run **asynchronously**: retrieval can return immediately; the blurb is computed in the background and can be polled or streamed when ready.

---

## Flow

1. **Retrieval** returns a ranked list of documents (e.g. from single-hop or multi-hop retrieval).
2. **Start blurb** (non-blocking): take the **top 5** docs and the **user query**, start a background task that:
   - Gathers text for each doc (from `metadata.extracted_text` or `metadata.summary`, or by loading from the metadata collection by `file_id`).
   - Truncates each excerpt to a max length (e.g. 2,200 characters) to stay within context.
   - Builds a single prompt: user question + numbered document excerpts (with titles).
   - Calls an LLM (Gemini preferred, OpenAI fallback) to produce a 2–4 sentence blurb.
3. **Cache** the result under a key derived from the query and the top 5 document IDs.
4. **Client** can poll for the blurb using that key (or query + file_ids) until `status` is `done` or `error`.

So the blurb is **query + top-5-docs → LLM → short answer**.

---

## Main Functions

| Function | Description |
|----------|-------------|
| **`generate_blurb_sync(query, docs, metadata_collection=None, top_n=5)`** | Synchronous: build blurb from top `top_n` docs and return the blurb string (or `None`). |
| **`start_blurb_background(query, docs, metadata_collection=None, top_n=5)`** | Start blurb generation in a daemon thread. Returns a **cache key** (task_id). |
| **`get_blurb_cached(cache_key)`** | Return cached result for that key: `{ status, blurb, error }`. |
| **`get_blurb_cached_by_query(query, doc_file_ids)`** | Same as above but key is derived from query and list of top doc `file_id`s. |

---

## Cache Result Shape

- **`status`**: `"done"` | `"running"` | `"error"`
- **`blurb`**: The summary text (when status is `done`)
- **`error`**: Error message (when status is `"error"`)
- **`created`**: Timestamp; entries expire after a TTL (e.g. 600 seconds)

---

## LLM and Prompt

- **Preferred:** Gemini (`gemini-1.5-flash`) if `GOOGLE_API_KEY` or `GEMINI_API_KEY` is set.
- **Fallback:** OpenAI (`gpt-4o-mini`) if `OPENAI_API_KEY` is set.
- **Prompt:** Instructs the model to produce a short summary blurb (2–4 sentences) that directly addresses the user’s question based on the given document excerpts, and to avoid unnecessary “according to document X” phrasing.

---

## Usage Pattern (not wired to API yet)

```python
# After retrieval
docs = single_hop_retrieval(query, metadata_collection, filters)
# Return docs to client immediately, then:
task_id = start_blurb_background(query, docs, metadata_collection)
# Client later: get_blurb_cached(task_id) or get_blurb_cached_by_query(query, [d["file_id"] for d in docs[:5]])
```

---

## Configuration

- **`BLURB_TOP_N`**: Number of top docs to use (default 5).
- **`MAX_CHARS_PER_DOC`**: Max characters per doc excerpt (default 2,200).
- **`BLURB_CACHE_TTL`**: Cache TTL in seconds (default 600).

---

## Implementation Notes

- **Module:** `backend/blurb.py`
- **Threading:** Background task runs in a daemon thread; no separate worker process.
- **Idempotency:** Same query + same top 5 file_ids produce the same cache key; repeated calls can return the cached blurb without re-calling the LLM.
