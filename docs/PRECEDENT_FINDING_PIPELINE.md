# Precedent Finding Pipeline: How Similar Documents Are Discovered

## Overview

When a user asks "find similar documents" or "find precedents" for a document, the system uses a sophisticated multi-stage pipeline that combines semantic search, structural analysis, and enhanced reranking to find the most relevant historical documents.

---

## Complete Pipeline Flow

### **Step 1: Document Retrieval & Feature Extraction**

```python
# Fetch current document from MongoDB
current_doc = metadata_collection.find_one({"file_id": file_id})

# Extract text and structure
current_text = current_doc.get('extracted_text', '')
current_structure = extract_document_structure(current_text, current_doc.get('name', ''))
```

**What happens:**
- MongoDB lookup using `file_id` index (fast)
- Extracts full text content
- Analyzes document structure (type, sections, patterns)
- Identifies document type: `circular`, `report`, `policy`, `resume`, etc.

**Output:**
```python
{
    'document_type': 'letter',
    'document_subtype': 'resume',
    'sections': ['experience', 'education', 'skills'],
    'resume_sections': ['work experience', 'education'],
    'tech_skills': ['python', 'javascript'],
    'common_phrases': ['software engineer', 'full stack']
}
```

### **Step 2: Summary Feature Extraction**

```python
# Get or create summary features
current_summary = current_doc.get("summary") or current_text[:2000]
current_summary_embedding, current_summary_keywords = _get_or_create_summary_features(
    current_doc, summary_embeddings_model
)
```

**What `_get_or_create_summary_features()` does:**

1. **Check for cached features:**
   - Looks for `summary_embedding` in MongoDB
   - Looks for `summary_keywords` in MongoDB

2. **Generate if missing:**
   - Uses `text-embedding-3-small` model (lighter than main embeddings)
   - Generates embedding from summary or first 2000 chars
   - Extracts top 12 keywords using frequency analysis

3. **Persist to MongoDB:**
   - Stores `summary_embedding` and `summary_keywords` back to metadata
   - Future searches reuse these features (no recomputation)

**Optimization:** Features are cached in MongoDB, so subsequent searches are faster.

### **Step 3: Query Generation from Document**

The system generates a search query from the document itself, not from user input.

#### **A. Resume-Type Documents**

```python
if current_structure.get('document_subtype') == 'resume':
    query_parts = []
    
    # Add resume sections
    if current_structure.get('resume_sections'):
        query_parts.append(' '.join(current_structure['resume_sections']))
    
    # Add technical skills
    if current_structure.get('tech_skills'):
        query_parts.append(' '.join(current_structure['tech_skills']))
    
    # Add middle section of text (often contains experience/skills)
    mid_start = len(current_text) // 3
    mid_end = 2 * len(current_text) // 3
    query_parts.append(current_text[mid_start:mid_end][:300])
```

**Why middle section?** Resumes often have key experience details in the middle, not the beginning.

#### **B. General Documents**

```python
else:
    query_parts = []
    
    # Add key topics (top 5)
    if current_doc.get('key_topics'):
        query_parts.append(' '.join(current_doc['key_topics'][:5]))
    
    # Add first 500 characters (usually contains main content)
    if current_text:
        query_parts.append(current_text[:500])
```

#### **C. Add Tags (Both Types)**

```python
# Always add tags
if current_doc.get('tags'):
    query_parts.append(' '.join(current_doc['tags']))

# Combine into final query
query = ' '.join(query_parts)
```

**Example Query Generation:**
```
Input Document: Resume with Python, React experience
Generated Query: "work experience education technical skills python javascript react software engineer full stack web development"
```

### **Step 4: Query Embedding Generation**

```python
# Generate embedding for the query
query_embedding = cached_generate_query_embedding(query)
```

**What happens:**
- Uses `text-embedding-3-large` model (same as main search)
- Checks LRU cache first (1000 most recent queries)
- If cached: instant return (~0ms)
- If not cached: OpenAI API call (~100-300ms)

**Optimization:** Query embeddings are cached, so similar documents generate similar queries that hit cache.

### **Step 5: MongoDB Filtering**

```python
# Build filters
filters = {
    "approvalStatus": "approved",
    "visible": True,
    "file_id": {"$ne": file_id}  # ← KEY: Exclude current document
}

# Optional filters
if file_types:
    filters['file_type'] = {"$in": file_types}
if date_range:
    filters['upload_date'] = {"$gte": date_range[0], "$lte": date_range[1]}

# Fetch filtered documents
filtered_cursor = metadata_collection.find(filters, {
    "file_id": 1, "embeddings": 1, "extracted_text": 1,
    "name": 1, "path": 1, "tags": 1, "key_topics": 1,
    "file_type": 1, "upload_date": 1
})
filtered_docs = {doc['file_id']: doc for doc in filtered_cursor if doc.get('embeddings')}
```

**Key Points:**
- **Excludes current document** (`file_id != current_file_id`)
- Uses MongoDB indexes for fast filtering
- Only fetches documents with embeddings (required for search)
- Projection limits fields fetched (faster)

### **Step 6: Hybrid Search (Initial Candidates)**

```python
# Temporarily update cache for filtered search
original_cache = search_engine.metadata_cache
search_engine.metadata_cache = filtered_docs

# Perform hybrid search
results = search_engine.hybrid_search(query, query_embedding, top_k * 2)

# Restore original cache
search_engine.metadata_cache = original_cache
```

**What `hybrid_search()` does:**

1. **FAISS Semantic Search:**
   - Searches all documents in filtered set
   - Returns top `top_k * 2` candidates (e.g., top 100 if top_k=50)
   - Uses pre-computed embeddings (fast, ~1-5ms)

2. **TF-IDF Scoring:**
   - Computes TF-IDF scores for all candidates
   - Text-based keyword matching

3. **BM25 Scoring:**
   - Computes BM25 scores for all candidates
   - Probabilistic ranking

4. **Fuzzy Matching:**
   - Filename matching
   - Path matching
   - Tag matching
   - Summary matching
   - Extracted text matching

5. **Weighted Combination:**
   ```python
   weights = {
       "extracted_text": 0.38,
       "summary": 0.32,
       "tags": 0.18,
       "bm25": 0.05,
       "tfidf": 0.03,
       "semantic": 0.02,
       ...
   }
   ```

**Output:** Dictionary of candidates with `total_score` (hybrid search score)

### **Step 7: Enhanced Reranking (Critical Step)**

This is where precedent finding differs from regular search - it adds an additional reranking layer.

```python
# Sort initial results and trim to candidate set
initial_candidates = sorted(
    results.values(), 
    key=lambda x: x["total_score"], 
    reverse=True
)[: max(20, top_k * 2)]  # Top 20-100 candidates

precedent_results = []

for result in initial_candidates:
    candidate_doc = filtered_docs.get(result["file_id"])
    candidate_text = candidate_doc.get('extracted_text', '')
    
    # Extract candidate structure
    candidate_structure = extract_document_structure(
        candidate_text, 
        candidate_doc.get('name', '')
    )
    
    # Get candidate summary features (cached/persisted)
    cand_summary_embedding, cand_summary_keywords = _get_or_create_summary_features(
        candidate_doc, summary_embeddings_model
    )
    
    # Calculate additional similarity metrics
    summary_cosine = _cosine(
        current_summary_embedding or [], 
        cand_summary_embedding or []
    )
    
    keyword_overlap = _keyword_overlap(
        current_summary_keywords, 
        cand_summary_keywords
    )
    
    structural_similarity = calculate_structural_similarity(
        current_structure, 
        candidate_structure
    )
    
    # Combine scores
    base_score = result["total_score"]  # From hybrid search
    combined_score = (
        0.5 * base_score +           # 50% weight on hybrid search
        0.35 * summary_cosine +     # 35% weight on summary similarity
        0.15 * keyword_overlap      # 15% weight on keyword overlap
    )
    
    # Bonus for matching document type
    if current_structure.get('document_type') == candidate_structure.get('document_type'):
        combined_score += 0.02  # +2% bonus
    
    # Apply threshold (with structural adjustment)
    effective_threshold = (
        similarity_threshold * 0.7 
        if structural_similarity > 0.3 
        else similarity_threshold
    )
    
    if combined_score >= effective_threshold:
        precedent_results.append({
            "file_id": result["file_id"],
            "file_name": result["file_name"],
            "path": result["path"],
            "relevance_score": round(combined_score, 3),
            "semantic_score": round(result.get("semantic_score", 0.0), 3),
            "structural_score": round(structural_similarity, 3),
            "summary_score": round(summary_cosine, 3),
            "keyword_overlap": round(kw_overlap, 3),
            "document_type": candidate_structure.get('document_type', 'unknown'),
            "tags": result.get("tags", []),
            "key_topics": result.get("key_topics", []),
            ...
        })
```

**Reranking Components:**

1. **Summary Cosine Similarity:**
   - Compares summary embeddings using cosine similarity
   - Uses `text-embedding-3-small` model (lighter, faster)
   - Measures semantic similarity of document summaries

2. **Keyword Overlap:**
   - Jaccard similarity between keyword sets
   - `overlap = intersection / union`
   - Measures topical overlap

3. **Structural Similarity:**
   - Compares document structures (type, sections, patterns)
   - Same document type = higher similarity
   - Similar sections = higher similarity

4. **Score Combination:**
   - **50%** hybrid search score (base relevance)
   - **35%** summary cosine (semantic similarity)
   - **15%** keyword overlap (topical similarity)
   - **+2%** bonus if document types match

5. **Adaptive Threshold:**
   - If structural similarity > 0.3: threshold reduced by 30%
   - Allows more results for structurally similar documents
   - Prevents over-filtering

### **Step 8: Final Ranking & Return**

```python
# Sort by combined relevance score
final_results = sorted(
    precedent_results, 
    key=lambda x: x["relevance_score"], 
    reverse=True
)[:top_k]  # Return top K

return {
    "results": final_results,
    "total_found": len(precedent_results),
    "current_document": {
        "file_id": current_doc["file_id"],
        "file_name": current_doc["name"],
        "path": current_doc["path"]
    }
}
```

---

## Complete Pipeline Diagram

```
User Request: "Find similar documents for file_id=abc123"
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 1: Document Retrieval                             │
│ - Fetch current_doc from MongoDB                        │
│ - Extract text, metadata                                │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: Structural Analysis                            │
│ - extract_document_structure()                          │
│ - Identify document type, sections, patterns           │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: Summary Feature Extraction                     │
│ - Get/create summary_embedding (cached)                │
│ - Get/create summary_keywords (cached)                 │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 4: Query Generation                               │
│ - Resume: sections + skills + middle text               │
│ - General: key_topics + first_500_chars + tags         │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 5: Query Embedding                                │
│ - cached_generate_query_embedding(query)               │
│ - Check LRU cache first                                │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 6: MongoDB Filtering                               │
│ - Filter: approved, visible, file_id != current        │
│ - Optional: file_types, date_range                     │
│ - Fetch filtered_docs with embeddings                   │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 7: Hybrid Search (Initial Candidates)             │
│ - FAISS semantic search (top K*2)                      │
│ - TF-IDF scoring                                        │
│ - BM25 scoring                                          │
│ - Fuzzy matching                                        │
│ - Weighted combination → base_score                     │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 8: Enhanced Reranking                             │
│ For each candidate (top 20-100):                       │
│   ├─ Extract candidate structure                        │
│   ├─ Get candidate summary features                     │
│   ├─ Calculate summary_cosine                           │
│   ├─ Calculate keyword_overlap                          │
│   ├─ Calculate structural_similarity                    │
│   └─ Combine: 50% base + 35% summary + 15% keywords    │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 9: Threshold Filtering                            │
│ - Apply effective_threshold (adaptive)                  │
│ - Filter by combined_score >= threshold                │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 10: Final Ranking                                  │
│ - Sort by relevance_score (descending)                  │
│ - Return top K results                                 │
└─────────────────────────────────────────────────────────┘
    ↓
Return Results with Scores
```

---

## Key Differences from Regular Search

| Aspect | Regular Search | Precedent Finding |
|--------|---------------|-------------------|
| **Input** | User query text | Document `file_id` |
| **Query Generation** | Direct embedding | Generated from document features |
| **Reranking** | None | Enhanced reranking with summary + structure |
| **Scoring** | Hybrid search only | Hybrid (50%) + Summary (35%) + Keywords (15%) |
| **Threshold** | Fixed | Adaptive (reduced if structural similarity high) |
| **Document Context** | No | Yes (structure, type, sections) |
| **Exclusion** | None | Excludes current document |

---

## Performance Optimizations

### 1. **Cached Summary Features**
- Summary embeddings stored in MongoDB
- Keywords extracted and cached
- **Time saved:** ~200-500ms per candidate (no recomputation)

### 2. **Query Embedding Cache**
- LRU cache for query embeddings
- Similar documents generate similar queries
- **Time saved:** ~100-300ms per search

### 3. **Candidate Limiting**
- Only reranks top 20-100 candidates
- Not all documents go through expensive reranking
- **Time saved:** ~80-90% for large document sets

### 4. **Structural Pre-computation**
- Document structure extracted once per document
- Reused for multiple comparisons
- **Time saved:** ~100-200ms per candidate

### 5. **MongoDB Indexes**
- Fast filtering using indexes
- Projection limits data transfer
- **Time saved:** ~50-200ms

### 6. **Lightweight Summary Model**
- Uses `text-embedding-3-small` for summaries
- Faster than `text-embedding-3-large`
- **Time saved:** ~30-50% per embedding

---

## Performance Metrics

**Typical Performance:**
- **Small dataset (< 1K docs):** ~500ms - 1.5s
- **Medium dataset (1K-10K docs):** ~1-3s
- **Large dataset (> 10K docs):** ~2-5s

**Breakdown:**
- Document retrieval: ~5-20ms
- Structural analysis: ~50-100ms
- Summary features: ~0-200ms (cached) or ~200-500ms (generate)
- Query generation: ~10-50ms
- Query embedding: ~0ms (cached) or ~100-300ms
- MongoDB filtering: ~20-100ms
- Hybrid search: ~50-200ms
- Reranking (100 candidates): ~500ms - 2s
- Final ranking: ~10-50ms

---

## API Endpoint

### `POST /api/find-precedents`

**Request:**
```json
{
    "file_id": "507f1f77bcf86cd799439011",
    "similarity_threshold": 0.3,
    "file_types": ["pdf", "docx"],
    "date_range": ["2024-01-01", "2024-12-31"],
    "top_k": 50
}
```

**Response:**
```json
{
    "results": [
        {
            "file_id": "507f1f77bcf86cd799439012",
            "file_name": "similar_document.pdf",
            "path": "/documents/legal",
            "relevance_score": 0.782,
            "semantic_score": 0.654,
            "structural_score": 0.712,
            "summary_score": 0.689,
            "keyword_overlap": 0.556,
            "document_type": "letter",
            "tags": ["resume", "technical"],
            "key_topics": ["software", "engineering"],
            "upload_date": "2024-06-15T10:30:00"
        }
    ],
    "total_found": 12,
    "current_document": {
        "file_id": "507f1f77bcf86cd799439011",
        "file_name": "current_document.pdf",
        "path": "/documents/legal"
    }
}
```

---

## Use Cases

1. **Legal Precedents:** Find similar cases/decisions
2. **Policy Versions:** Find previous policy versions
3. **Resume Matching:** Find candidates with similar experience
4. **Contract Templates:** Find similar contract structures
5. **Compliance Documents:** Find similar compliance reports
6. **Historical Analysis:** Find documents from similar contexts

---

## Summary

The precedent finding pipeline is a **sophisticated multi-stage process** that:

✅ **Extracts document features** (structure, summary, keywords)  
✅ **Generates intelligent queries** from document content  
✅ **Uses hybrid search** for initial candidate discovery  
✅ **Reranks with enhanced metrics** (summary, structure, keywords)  
✅ **Applies adaptive thresholds** for better results  
✅ **Optimizes performance** with caching and limiting  

**Key Innovation:** Unlike regular search (user query → results), precedent finding uses **document → query → enhanced reranking → results**, providing more context-aware similarity matching.

