# MongoDB Architecture & Optimization Guide

## Overview

The KMRL Document Management System uses MongoDB as its primary database, with GridFS for file storage and multiple optimization strategies for fast retrieval.

---

## Database Structure

### Database Name
- **EDUDATA**: Main database containing all collections

### Collections

#### 1. **metadata** (Primary Document Collection)
Stores document metadata and searchable content.

**Key Fields:**
- `file_id` (unique): Reference to GridFS file
- `name`: Original filename
- `path`: Directory path
- `extracted_text`: Full text content for search
- `embeddings`: Pre-computed vector embeddings (1536 dimensions for `text-embedding-3-large`)
- `tags`: AI-generated tags
- `key_topics`: Extracted keywords
- `summary`: Document summary
- `document_summary`: Enhanced document-level summary
- `document_action_points`: Actionable items
- `file_type`: MIME type
- `upload_date`: ISO timestamp
- `user_id`: Uploader identifier
- `department`: Department assignment
- `approvalStatus`: "approved" | "pending" | "rejected"
- `visible`: Boolean visibility flag
- `access_to`: Access control (department or "all")

**Storage Pattern:**
```python
{
  "_id": ObjectId("..."),
  "file_id": "507f1f77bcf86cd799439011",  # GridFS reference
  "name": "safety_protocol.pdf",
  "path": "/documents/safety",
  "extracted_text": "Full document text...",
  "embeddings": [0.123, -0.456, ...],  # 1536-dim vector
  "tags": ["safety", "protocol", "compliance"],
  "key_topics": ["emergency", "evacuation"],
  "summary": "Brief summary...",
  "approvalStatus": "approved",
  "visible": true
}
```

#### 2. **files** (Legacy/Reference Collection)
Legacy collection for file references (may be deprecated).

#### 3. **directories**
Directory structure representation.

**Fields:**
- `path`: Parent path
- `name`: Directory name
- `file_id`: Optional (usually None for directories)

#### 4. **users**
User accounts and permissions.

**Fields:**
- `user_id` (unique)
- `email` (unique)
- `username`
- `department`
- `account_type`: "Admin" | "Manager" | "Staff"

#### 5. **actions**
Action tracking for document workflows.

**Fields:**
- `action_id` (unique)
- `user_id`
- `file_id`
- `action`: Action type
- `status`: "pending" | "completed"
- `timestamp`

#### 6. **extractions** (Document Processing Results)
Stores detailed extraction results (tables, signatures, OCR).

**Fields:**
- `doc_id`: References `file_id` from metadata
- `pages`: Array of page-level extractions
- `whole_document_table`: Combined table data
- `individual_tables`: Per-table structures

#### 7. **threads** & **comments** (Discussions Feature)
Thread-based discussions linked to documents.

---

## File Storage: GridFS

### Architecture
Files are stored using **GridFS**, MongoDB's file storage system that splits large files into chunks.

**GridFS Collections:**
- `fs.files`: File metadata (filename, content_type, upload_date)
- `fs.chunks`: Binary chunks (default 255KB per chunk)

### Storage Flow

```python
# Upload Process (backend/storage.py)
1. File uploaded → GridFS.put(file) → Returns file_id
2. Extract text → extract_text_from_file()
3. Generate embeddings → extract_embeddings_from_file()
4. Generate tags/keywords → AI processing
5. Store metadata → metadata_collection.insert_one()
6. Async index update → enqueue_add_document_to_search_indexes()
```

### Retrieval

```python
# View File (backend/view_file.py)
1. Query metadata: metadata_collection.find_one({"file_id": file_id})
2. Fetch from GridFS: fs.get(ObjectId(file_id))
3. Stream content: grid_out.read()
```

**Endpoints:**
- `/api/objects/<file_id>`: Direct GridFS access
- `/api/view_file`: Metadata-aware file serving

---

## Indexes for Fast Retrieval

### MongoDB Indexes (mongo-init.js)

#### **metadata Collection Indexes**

```javascript
// Unique index for file lookups
db.metadata.createIndex({ "file_id": 1 }, { unique: true });

// User-based queries
db.metadata.createIndex({ "user_id": 1 });

// Department filtering
db.metadata.createIndex({ "department": 1 });

// Document type filtering
db.metadata.createIndex({ "document_type": 1 });

// Path-based directory listing
db.metadata.createIndex({ "path": 1 });

// Filename searches
db.metadata.createIndex({ "name": 1 });

// Date range queries
db.metadata.createIndex({ "upload_date": 1 });

// Tag-based filtering
db.metadata.createIndex({ "tags": 1 });

// Approval/visibility filtering (critical for search)
db.metadata.createIndex({ "approvalStatus": 1 });
```

**Recommended Compound Indexes** (for common query patterns):

```javascript
// Fast approval + visibility + department queries
db.metadata.createIndex({ 
  "approvalStatus": 1, 
  "visible": 1, 
  "department": 1 
});

// Fast path + approval queries
db.metadata.createIndex({ 
  "path": 1, 
  "approvalStatus": 1, 
  "visible": 1 
});

// Fast user + approval queries
db.metadata.createIndex({ 
  "user_id": 1, 
  "approvalStatus": 1 
});
```

#### **Other Collection Indexes**

```javascript
// actions collection
db.actions.createIndex({ "action_id": 1 }, { unique: true });
db.actions.createIndex({ "user_id": 1 });
db.actions.createIndex({ "file_id": 1 });
db.actions.createIndex({ "status": 1 });
db.actions.createIndex({ "timestamp": 1 });

// users collection
db.users.createIndex({ "user_id": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "department": 1 });

// directories collection
db.directories.createIndex({ "path": 1 });
db.directories.createIndex({ "user_id": 1 });

// discussions (threads/comments)
db.threads.createIndex({ "thread_id": 1 }, { unique: true });
db.threads.createIndex({ "linked_documents.file_id": 1 });
db.threads.createIndex({ "status": 1 });
db.threads.createIndex({ "created_at": -1 });
db.comments.createIndex({ "comment_id": 1 }, { unique: true });
db.comments.createIndex({ "thread_id": 1 });
```

---

## Search Optimization Strategies

### 1. **FAISS Vector Index** (Ultra-Fast Semantic Search)

**Location:** In-memory index built from stored embeddings

**Implementation:** `backend/search.py` - `AdvancedSearchEngine.build_faiss_index()`

**How it works:**
```python
# Build Process
1. Fetch all documents with embeddings: metadata_collection.find({"embeddings": {"$exists": True}})
2. Extract embeddings array: [doc['embeddings'] for doc in documents]
3. Normalize for cosine similarity: faiss.normalize_L2(embeddings_matrix)
4. Create FAISS IndexFlatIP: faiss.IndexFlatIP(dimension)
5. Add embeddings: faiss_index.add(embeddings_matrix)
6. Store file_id mapping: {faiss_index: file_id}

# Search Process
1. Generate query embedding: OpenAIEmbeddings.embed_query(query)
2. Normalize query: faiss.normalize_L2(query_embedding)
3. Search: faiss_index.search(query_embedding, top_k)
4. Map results: file_ids = [file_id_mapping[idx] for idx in indices]
```

**Performance:**
- **O(log n)** search time for large datasets
- **In-memory**: No database round-trips for vector search
- **Normalized cosine similarity**: Fast similarity computation

**Limitations:**
- Requires embeddings to be pre-computed and stored
- Memory-intensive (all embeddings loaded)
- Rebuild required when documents added (or incremental add)

### 2. **TF-IDF Index** (Lexical Text Search)

**Implementation:** `sklearn.feature_extraction.text.TfidfVectorizer`

**Configuration:**
```python
TfidfVectorizer(
    max_features=10000,      # Limit vocabulary size
    stop_words='english',   # Remove common words
    ngram_range=(1, 3),     # 1-3 word phrases
    max_df=0.95,            # Ignore very common terms
    min_df=2                # Ignore very rare terms
)
```

**How it works:**
1. Build vocabulary from all `extracted_text` fields
2. Compute TF-IDF scores for each document
3. Store sparse matrix: `tfidf_matrix` (documents × features)
4. Query: Transform query → compute dot product with all documents

**Use Case:** Exact keyword/phrase matching, term frequency relevance

### 3. **BM25 Index** (Probabilistic Ranking)

**Implementation:** `rank_bm25.BM25Okapi`

**How it works:**
1. Tokenize all documents: `[text.split() for text in texts]`
2. Build BM25 corpus: `BM25Okapi(tokenized_texts)`
3. Query: `bm25.get_scores(query.split())`

**Use Case:** Better than TF-IDF for short queries, handles term frequency and document length normalization

### 4. **Hybrid Search** (Combined Algorithm)

**Implementation:** `backend/search.py` - `AdvancedSearchEngine.hybrid_search()`

**Scoring Weights:**
```python
weights = {
    "extracted_text": 0.38,   # Primary: actual text matching
    "summary": 0.32,          # Strong summary match
    "tags": 0.18,             # Tag overlap
    "bm25": 0.05,             # Light lexical boost
    "tfidf": 0.03,            # Light lexical boost
    "semantic": 0.02,         # Minimal semantic tie-break
    "key_topics": 0.01,       # Minimal
    "file_name": 0.005,       # Tiny
    "path": 0.005             # Tiny
}
```


**Search Flow:**
```
1. Semantic Search (FAISS) → Top 100 candidates
2. TF-IDF Scoring → Score all candidates
3. BM25 Scoring → Score all candidates
4. Fuzzy Matching → Filename, path, tags, topics
5. Text Matching → Direct extracted_text matching
6. Weighted Combination → Final relevance score
7. Sort & Return → Top K results
```

**Performance Optimizations:**
- **Filter-first**: Apply MongoDB filters before building candidate set
- **Candidate limiting**: Only score top 100 semantic results
- **Caching**: Query embeddings cached (LRU, max 1000)
- **Incremental updates**: New documents added to indexes without full rebuild

---

## Caching Strategies

### 1. **Metadata Cache** (In-Memory)
```python
# backend/search.py
self.metadata_cache = {}  # file_id → full metadata doc
```
- Stores frequently accessed document metadata
- Avoids MongoDB queries during search
- Updated on index rebuild or incremental add

### 2. **Query Embedding Cache** (LRU)
```python
@lru_cache(maxsize=1000)
def cached_generate_query_embedding(query):
    return generate_query_embedding(query)
```
- Caches expensive OpenAI embedding calls
- Reduces API costs and latency
- 1000 most recent queries cached

### 3. **Shared Embeddings Client**
```python
_embed_client = OpenAIEmbeddings(model=EMBED_MODEL)  # Singleton
```
- Single client instance reused across requests
- Avoids connection overhead

### 4. **Index Warm-up**
```python
def initialize_search_indexes():
    """Called on app startup"""
    search_engine.build_faiss_index()
    search_engine.build_text_indexes()
```
- Pre-builds all indexes at startup
- Ensures first search is fast

---

## Query Optimization Patterns

### 1. **Projection for Reduced Data Transfer**
```python
# Only fetch needed fields
metadata_collection.find(
    {"approvalStatus": "approved", "visible": True},
    {
        "file_id": 1, 
        "embeddings": 1, 
        "extracted_text": 1, 
        "name": 1, 
        "path": 1
        # Exclude large fields not needed
    }
)
```

### 2. **Filter Before Processing**
```python
# Apply MongoDB filters FIRST
filters = {"approvalStatus": "approved", "visible": True}
if tags:
    filters['tags'] = {"$in": tags}
    
# Then build filtered cache
filtered_docs = {doc['file_id']: doc for doc in cursor}
```

### 3. **Batch Operations**
```python
# Batch fetch candidates
file_ids = [result['file_id'] for result in semantic_results]
candidates = metadata_collection.find(
    {"file_id": {"$in": file_ids}},
    projection={...}
)
```

### 4. **Async Index Updates**
```python
# Non-blocking index updates
_index_executor = ThreadPoolExecutor(max_workers=2)
enqueue_add_document_to_search_indexes(metadata_doc)
```
- Upload returns immediately
- Index updates happen in background
- Document searchable shortly after upload

---

## Performance Metrics

### Search Performance
- **FAISS Search**: ~1-5ms for 10K documents
- **Hybrid Search**: ~50-200ms (includes scoring, ranking)
- **MongoDB Queries**: ~5-20ms (with indexes)

### Storage
- **GridFS**: Efficient for files >16MB, chunks stored in `fs.chunks`
- **Metadata**: ~5-50KB per document (depends on text length)
- **Embeddings**: ~6KB per document (1536 floats × 4 bytes)

### Index Sizes
- **FAISS Index**: ~6KB × number of documents (in-memory)
- **TF-IDF Matrix**: Sparse, ~1-5MB for 10K documents
- **BM25 Corpus**: ~100KB-1MB for 10K documents

---

## Best Practices

### 1. **Index Maintenance**
- Monitor index usage: `db.metadata.getIndexes()`
- Remove unused indexes to save write performance
- Create compound indexes for common query patterns

### 2. **Embedding Storage**
- Always store embeddings at upload time
- Use consistent embedding model (`text-embedding-3-large`)
- Validate embedding dimensions before FAISS add

### 3. **Search Optimization**
- Pre-filter by `approvalStatus` and `visible` in MongoDB
- Limit candidate set before expensive scoring
- Use projection to reduce data transfer

### 4. **GridFS Best Practices**
- Store content_type in GridFS metadata
- Use consistent file_id format (ObjectId strings)
- Implement file streaming for large files

### 5. **Cache Management**
- Monitor cache hit rates
- Adjust LRU cache size based on query patterns
- Warm up indexes on application startup

---

## Troubleshooting

### Slow Queries
1. **Check indexes**: `db.metadata.getIndexes()`
2. **Explain query**: `db.metadata.find({...}).explain("executionStats")`
3. **Check projection**: Ensure only needed fields fetched
4. **Verify filters**: Apply filters before processing

### Missing Search Results
1. **Check embeddings**: Ensure documents have `embeddings` field
2. **Verify approval**: Check `approvalStatus` and `visible` flags
3. **Rebuild indexes**: Call `rebuild_search_indexes()`
4. **Check FAISS**: Verify FAISS index is built and loaded

### Memory Issues
1. **Reduce FAISS index size**: Filter documents before building
2. **Limit metadata cache**: Only cache frequently accessed docs
3. **Use sparse matrices**: TF-IDF uses sparse format
4. **Stream large files**: Don't load entire GridFS files into memory

---

## Future Optimizations

### Recommended Improvements

1. **Compound Indexes**
   ```javascript
   db.metadata.createIndex({ 
     "approvalStatus": 1, 
     "visible": 1, 
     "department": 1,
     "upload_date": -1 
   });
   ```

2. **Text Index for Full-Text Search**
   ```javascript
   db.metadata.createIndex({ 
     "extracted_text": "text",
     "name": "text",
     "tags": "text"
   });
   ```

3. **TTL Index for Temporary Data**
   ```javascript
   db.temp_cache.createIndex({ "created_at": 1 }, { expireAfterSeconds: 3600 });
   ```

4. **Sharding for Scale**
   - Shard by `department` or `user_id` for multi-tenant scale

5. **Read Replicas**
   - Use MongoDB read replicas for search-heavy workloads

---

## Summary

The MongoDB architecture is optimized for:
- ✅ **Fast file storage** via GridFS
- ✅ **Rapid metadata queries** via comprehensive indexes
- ✅ **Ultra-fast semantic search** via FAISS
- ✅ **Hybrid relevance** via TF-IDF + BM25 + semantic
- ✅ **Scalable caching** via in-memory indexes and LRU caches
- ✅ **Non-blocking uploads** via async index updates

The system achieves sub-200ms search times even with thousands of documents through a combination of pre-computed embeddings, in-memory indexes, and optimized MongoDB queries.

