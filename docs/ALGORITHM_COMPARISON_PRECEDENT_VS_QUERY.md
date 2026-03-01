# Algorithm Comparison: Precedent Search vs Query Search

## Overview

This document explains how `find_precedents` algorithm works compared to regular query search, highlighting the key differences in approach, processing, and results.

---

## 🔍 Query Search (`/search/extensive`)

### **Input**
```json
{
    "searchText": "fire safety audit report 2024",  // ← User's text query
    "fileType": ["pdf", "docx"],
    "customTags": ["safety", "audit"],
    "dateRange": ["2024-01-01", "2024-12-31"]
}
```

### **Algorithm Flow**

```
1. User Query (Text String)
   ↓
2. Generate Query Embedding
   ├─→ OpenAI Embedding (text-embedding-3-large)
   └─→ Cache lookup (LRU cache, 1000 entries)
   ↓
3. Apply Filters (Optional)
   ├─→ Tags, file types, date range
   └─→ Filter MongoDB collection
   ↓
4. Hybrid Search
   ├─→ FAISS Semantic Search (top K*2 candidates)
   ├─→ TF-IDF Scoring (on candidates)
   └─→ BM25 Scoring (on candidates)
   ↓
5. Score Combination (Weighted)
   ├─→ extracted_text: 38%
   ├─→ summary: 32%
   ├─→ tags: 18%
   ├─→ bm25: 5%
   ├─→ tfidf: 3%
   └─→ semantic: 2%
   ↓
6. Rank & Return Top K
   └─→ Sort by total_score
```

### **Code Execution**

```python
def search_files(query, tags=None, file_types=None, date_range=None, top_k=50):
    # 1. Direct query embedding
    query_embedding = cached_generate_query_embedding(query)  # User's text
    
    # 2. Apply filters (optional)
    filters = {"approvalStatus": "approved", "visible": True}
    if tags:
        filters['tags'] = {"$in": tags}
    # ... more filters
    
    # 3. Hybrid search
    results = search_engine.hybrid_search(query, query_embedding, top_k)
    
    # 4. Sort and return
    final_results = sorted(results.values(), key=lambda x: x["total_score"], reverse=True)
    return final_results[:top_k]
```

### **Characteristics**
- ✅ **Direct**: Query string → Embedding → Search
- ✅ **Fast**: Single pass, no reranking
- ✅ **User-driven**: Query matches user's intent
- ⚠️ **Simple scoring**: Hybrid search only
- ⚠️ **No document context**: Doesn't consider document structure

---

## 📄 Precedent Search (`/api/find-precedents`)

### **Input**
```json
{
    "file_id": "abc123...",              // ← Current document ID
    "similarity_threshold": 0.3,
    "file_types": ["pdf", "docx"],
    "date_range": ["2024-01-01", "2024-12-31"],
    "top_k": 50
}
```

### **Algorithm Flow**

```
1. Current Document (file_id)
   ↓
2. Extract Document Features
   ├─→ Fetch document from MongoDB
   ├─→ Extract text, structure, metadata
   └─→ Analyze document type, sections, keywords
   ↓
3. Generate Query from Document
   ├─→ For resumes: resume_sections + tech_skills + middle text
   ├─→ For others: key_topics + first_500_chars + tags
   └─→ Combine into query string
   ↓
4. Generate Query Embedding
   ├─→ OpenAI Embedding (text-embedding-3-large)
   └─→ Cache lookup
   ↓
5. Apply Filters (Exclude Current Doc)
   ├─→ file_id != current_file_id  ← KEY DIFFERENCE
   ├─→ Approval status
   └─→ Optional: file types, date range
   ↓
6. Hybrid Search (Initial Candidates)
   ├─→ FAISS Semantic Search (top K*2 = 100 candidates)
   ├─→ TF-IDF Scoring
   └─→ BM25 Scoring
   ↓
7. Enhanced Reranking (ADDITIONAL STEP)
   ├─→ For each candidate (up to 100):
   │   ├─→ Extract document structure
   │   ├─→ Calculate summary embedding similarity
   │   ├─→ Calculate keyword overlap
   │   ├─→ Calculate structural similarity
   │   └─→ Combine scores:
   │       ├─→ base_score (hybrid): 50%
   │       ├─→ summary_cosine: 35%
   │       ├─→ keyword_overlap: 15%
   │       └─→ structural bonus: +2% if type matches
   ↓
8. Apply Similarity Threshold
   ├─→ Filter by combined_score >= threshold
   └─→ Adjust threshold based on structural similarity
   ↓
9. Rank & Return Top K
   └─→ Sort by relevance_score (combined)
```

### **Code Execution**

```python
def find_precedents(file_id: str, similarity_threshold: float = 0.3, ...):
    # 1. Get current document
    current_doc = metadata_collection.find_one({"file_id": file_id})
    
    # 2. Extract features from document
    current_text = current_doc.get('extracted_text', '')
    current_structure = extract_document_structure(current_text, ...)
    current_summary_embedding, current_summary_keywords = _get_or_create_summary_features(...)
    
    # 3. Generate query FROM document content
    query_parts = []
    if current_doc.get('key_topics'):
        query_parts.append(' '.join(current_doc['key_topics'][:5]))
    if current_text:
        query_parts.append(current_text[:500])  # First 500 chars
    if current_doc.get('tags'):
        query_parts.append(' '.join(current_doc['tags']))
    query = ' '.join(query_parts)
    
    # 4. Generate embedding
    query_embedding = cached_generate_query_embedding(query)
    
    # 5. Filter (EXCLUDE current document)
    filters = {
        "file_id": {"$ne": file_id},  # ← Exclude current
        "approvalStatus": "approved",
        "visible": True
    }
    
    # 6. Hybrid search (get initial candidates)
    results = search_engine.hybrid_search(query, query_embedding, top_k * 2)  # 100 candidates
    
    # 7. Enhanced reranking (ADDITIONAL STEP)
    initial_candidates = sorted(results.values(), key=lambda x: x["total_score"], reverse=True)[:max(20, top_k * 2)]
    
    for result in initial_candidates:
        candidate_doc = filtered_docs.get(result["file_id"])
        candidate_structure = extract_document_structure(candidate_doc.get('extracted_text', ''), ...)
        
        # Additional similarity calculations
        summary_cosine = _cosine(current_summary_embedding, cand_summary_embedding)
        kw_overlap = _keyword_overlap(current_summary_keywords, cand_summary_keywords)
        structural_similarity = calculate_structural_similarity(current_structure, candidate_structure)
        
        # Combined scoring
        combined_score = (
            0.5 * result["total_score"] +      # Hybrid search base
            0.35 * summary_cosine +            # Summary similarity
            0.15 * kw_overlap                  # Keyword overlap
        )
        
        # Bonus for matching document type
        if current_structure.get('document_type') == candidate_structure.get('document_type'):
            combined_score += 0.02
        
        # Apply threshold
        if combined_score >= effective_threshold:
            precedent_results.append({...})
    
    return sorted(precedent_results, key=lambda x: x["relevance_score"], reverse=True)[:top_k]
```

### **Characteristics**
- ✅ **Document-driven**: Uses document content as query source
- ✅ **Multi-stage**: Initial search + enhanced reranking
- ✅ **Structural analysis**: Analyzes document structure, type, sections
- ✅ **Context-aware**: Considers summary embeddings, keywords
- ⚠️ **Slower**: Two-pass (search + rerank)
- ⚠️ **More complex**: Additional similarity calculations

---

## 🔄 Key Differences

### **1. Query Generation**

| Aspect | Query Search | Precedent Search |
|--------|-------------|------------------|
| **Input** | User text string | Document ID |
| **Query Source** | Direct user input | Extracted from document |
| **Query Building** | Use as-is | Extract key_topics + text + tags |
| **Query Length** | Short (typically) | Longer (document content) |

**Example:**
```python
# Query Search
query = "fire safety audit report 2024"  # User's exact words

# Precedent Search
query = "fire safety audit compliance report 2024 assessment certification ..."  # Extracted from doc
```

### **2. Filtering**

| Aspect | Query Search | Precedent Search |
|--------|-------------|------------------|
| **Base Filters** | approvalStatus, visible | Same |
| **Special Filter** | None | `file_id != current_file_id` |
| **Filter Application** | Before search | Before search |

### **3. Search Process**

| Aspect | Query Search | Precedent Search |
|--------|-------------|------------------|
| **Initial Search** | Hybrid search (FAISS + TF-IDF + BM25) | Same |
| **Candidates** | Top K results | Top K*2 (100) candidates |
| **Reranking** | ❌ None | ✅ Enhanced reranking |
| **Reranking Candidates** | N/A | Top 20-100 candidates |

### **4. Scoring**

| Aspect | Query Search | Precedent Search |
|--------|-------------|------------------|
| **Primary Score** | Hybrid search score | Hybrid search score (50%) |
| **Additional Scores** | None | Summary cosine (35%), Keyword overlap (15%) |
| **Structural Analysis** | ❌ None | ✅ Document structure similarity |
| **Document Type** | ❌ Not considered | ✅ Type matching bonus (+2%) |
| **Final Score** | `total_score` (hybrid) | `relevance_score` (combined) |

### **5. Processing Time**

| Stage | Query Search | Precedent Search |
|-------|-------------|------------------|
| **Document Fetching** | ❌ None | ✅ 1 document |
| **Feature Extraction** | ❌ None | ✅ Structure, summary, keywords |
| **Query Generation** | ✅ Direct | ✅ Extract from document |
| **Embedding** | ✅ 1 embedding | ✅ 1-2 embeddings (query + summary) |
| **Initial Search** | ✅ ~200-500ms | ✅ ~200-500ms |
| **Reranking** | ❌ None | ✅ ~500-1000ms (per candidate) |
| **Total** | **~200-500ms** | **~700-2000ms** |

### **6. Result Quality**

| Aspect | Query Search | Precedent Search |
|--------|-------------|------------------|
| **Relevance** | Matches query text | Matches document characteristics |
| **Structural Match** | ❌ No | ✅ Yes (document type, sections) |
| **Context Understanding** | Limited to query | Deep document understanding |
| **Similarity Precision** | Good for keywords | Better for semantic similarity |

---

## 📊 Algorithm Comparison Table

| Feature | Query Search | Precedent Search |
|---------|-------------|------------------|
| **Input Type** | Text string | Document ID |
| **Query Source** | User input | Document content |
| **Excludes Self** | ❌ No | ✅ Yes |
| **Search Passes** | 1 pass | 2 passes (search + rerank) |
| **Scoring Methods** | 3 (FAISS, TF-IDF, BM25) | 6 (FAISS, TF-IDF, BM25, Summary, Keywords, Structure) |
| **Structural Analysis** | ❌ No | ✅ Yes |
| **Document Type Matching** | ❌ No | ✅ Yes |
| **Performance** | Fast (~300ms) | Slower (~1-2s) |
| **Use Case** | User searches | Find similar documents |
| **Result Count** | Top K | Top K (after reranking) |

---

## 🎯 When to Use Each

### **Use Query Search When:**
- ✅ User has a specific search query
- ✅ Need fast results (< 500ms)
- ✅ Searching for keywords/topics
- ✅ General document discovery
- ✅ User-driven exploration

### **Use Precedent Search When:**
- ✅ Analyzing a specific document
- ✅ Finding similar documents/cases
- ✅ Need structural similarity
- ✅ Document type matching matters
- ✅ Can tolerate slower processing (1-2s)
- ✅ Document-to-document similarity

---

## 💡 Performance Optimization Notes

### **Query Search Optimizations:**
- ✅ Embedding caching (LRU, 1000 entries)
- ✅ Filter-first approach
- ✅ Single-pass processing

### **Precedent Search Optimizations:**
- ✅ Summary embedding caching/persistence
- ✅ Summary keyword caching/persistence
- ✅ Limits reranking to top 100 candidates
- ✅ Structural features computed once per document
- ✅ Could be optimized with parallel reranking

---

## 🔍 Example Execution Comparison

### **Scenario: Find documents about "fire safety audit"**

#### **Query Search**
```python
# User query
query = "fire safety audit report 2024"

# Process
1. Embed query → [0.123, 0.456, ...] (cached)
2. Search indexes → 50 results
3. Return top 50

# Time: ~300ms
# Results: Documents matching "fire safety audit report 2024"
```

#### **Precedent Search**
```python
# Current document
file_id = "abc123"  # "Fire Safety Audit Report 2024.pdf"

# Process
1. Fetch document → Extract text, structure, metadata
2. Generate query → "fire safety audit compliance report assessment..."
3. Embed query → [0.123, 0.456, ...]
4. Search indexes → 100 initial candidates
5. For each candidate (100 docs):
   - Extract structure
   - Calculate summary similarity
   - Calculate keyword overlap
   - Calculate structural similarity
   - Combine scores
6. Filter by threshold
7. Return top 50

# Time: ~1500ms
# Results: Documents SIMILAR to "Fire Safety Audit Report 2024.pdf"
```

---

## 📝 Summary

**Query Search** is optimized for **speed and user intent matching**, using a single-pass hybrid search algorithm.

**Precedent Search** is optimized for **document similarity**, using a two-pass algorithm with enhanced reranking that considers structural features, summary embeddings, and document type matching.

The key difference is that **precedent search treats a document as a query** and performs additional analysis to find truly similar documents, not just keyword matches.

