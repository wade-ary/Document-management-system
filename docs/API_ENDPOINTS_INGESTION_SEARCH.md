# API Endpoints: Ingestion & Search

## Overview

This document catalogs all API endpoints related to document ingestion (upload, processing, analysis) and search functionality in the KMRL Document Management System.

---

## 📥 Document Ingestion Endpoints

### 1. **POST `/upload`**
**Primary file upload endpoint**

**Design:**
- **Purpose**: Main entry point for document uploads with full processing pipeline
- **Content-Type**: `multipart/form-data`
- **Processing**: Synchronous upload with immediate text extraction validation

**Request Parameters:**
```python
{
    "files": File[] (required),           # One or more files
    "path": string (required),            # Target directory path
    "user_id": string (required),         # User identifier
    "account_type": string,                # "Admin" | "Staff" | "Manager"
    "department": string,                  # "safety" | "hr" | "finance" | "engineering" | "procurement" | "legal"
    "access_to": string,                   # "all" | "dept1,dept2" (CSV)
    "important": string,                   # "true" | "false"
    "deadline": string (optional),         # ISO date (YYYY-MM-DD)
    "document_type": string (optional)     # Document classification
}
```

**Response:**
```json
{
    "MR": 1,                              // Machine-readable flag
    "message": "Document uploaded and auto-approved",
    "compliance_analysis": {
        "title": "...",
        "riskLevel": "high|medium|low",
        "deadline": "...",
        "riskMatrix": {...},
        "radarChart": {...}
    }
}
```

**Processing Flow:**
1. File validation (type, size)
2. GridFS storage
3. Text extraction (PDF/DOCX/OCR)
4. Machine-readability check
5. Auto-approval (if MR)
6. Compliance analysis trigger
7. Search index update (async)
8. Email notification (async)

**Code Location:** `app.py:570-706`

---

### 2. **POST `/webhook`**
**External system integration endpoint**

**Design:**
- **Purpose**: Ingest documents from external systems (n8n, email systems, APIs)
- **Content-Type**: `multipart/form-data` OR `application/json`
- **Processing**: Supports base64-encoded attachments from JSON payloads

**Request Formats:**

**Format 1: Multipart Form Data**
```python
{
    "files": File[],
    "user_id": string,
    "path": string,
    "department": string,
    # ... same as /upload
}
```

**Format 2: JSON with Base64 Attachments**
```json
{
    "attachmentBase64": "base64_string",
    "hasAttachments": true,
    "fileName": "document.pdf",
    "fileType": "application/pdf",
    "user_id": "...",
    "path": "...",
    "emailData": {
        "email": {
            "attachments": [
                {
                    "content": "base64_string",
                    "filename": "...",
                    "contentType": "..."
                }
            ]
        }
    }
}
```

**Response:**
```json
{
    "status": "success",
    "results": [
        {
            "filename": "...",
            "status": "success|failed",
            "file_id": "...",
            "error": "..." (if failed)
        }
    ]
}
```

**Special Features:**
- Email metadata tagging (`email_info` field)
- Automatic filename generation for missing names
- Base64 padding correction
- Multiple attachment formats support

**Code Location:** `app.py:708-1002`

---

### 3. **POST `/api/documents`**
**RESTful document upload API**

**Design:**
- **Purpose**: Standard REST API for document uploads
- **Content-Type**: `multipart/form-data`
- **Processing**: Simplified upload flow for external integrations

**Request:**
```python
{
    "file": File (required),
    "department": string (optional)       # Frontend department name
}
```

**Response:**
```json
{
    "message": "File uploaded and processed successfully",
    "document_id": "...",
    "file_id": "...",
    "metadata": {
        "_id": "...",
        "file_id": "...",
        "summary": "...",
        "actionableItems": [...],
        "name": "..."
    }
}
```

**Code Location:** `backend/documents_api.py:53-130`

---

### 4. **POST `/api/documents/<doc_id>/extract`**
**Trigger text extraction for existing document**

**Design:**
- **Purpose**: Re-extract text from stored document
- **Method**: POST
- **Processing**: Re-runs extraction pipeline

**Request:**
```json
{
    "force": boolean (optional)           # Force re-extraction
}
```

**Code Location:** `app.py:452-461`

---

### 5. **POST `/analyze`**
**Document analysis and routing suggestion**

**Design:**
- **Purpose**: AI-powered document analysis for department routing
- **Content-Type**: `application/json`
- **Processing**: Analyzes document content to suggest departments

**Request:**
```json
{
    "file_id": string (required)
}
```

**Response:**
```json
{
    "message": "File analysis completed successfully",
    "file_id": "...",
    "departments": ["legal", "finance"],  // Multi-department array
    "primary_department": "legal",
    "embeddings": [...],
    "important_words": [...],
    "tags": [...]
}
```

**Processing:**
- OpenAI GPT analysis
- Department classification
- Tag generation
- Embedding generation
- Key topics extraction

**Code Location:** `app.py:1370-1440`

---

### 6. **POST `/api/compliance/upload`**
**Compliance-focused document upload**

**Design:**
- **Purpose**: Upload documents with immediate compliance analysis
- **Processing**: Triggers compliance analyzer on upload

**Code Location:** `backend/compliance_api.py:711+`

---

### 7. **POST `/req/upload`**
**Request upload approval (for non-MR documents)**

**Design:**
- **Purpose**: Submit upload request for admin approval
- **Processing**: Creates approval workflow entry

**Request:**
```json
{
    "file_id": string,
    "user_id": string,
    "reason": string (optional)
}
```

**Code Location:** `app.py:1595-1669`

---

## 🔍 Search Endpoints

### 1. **POST `/search/extensive`**
**Advanced multi-filter search**

**Design:**
- **Purpose**: Primary search endpoint with comprehensive filtering
- **Content-Type**: `application/json`
- **Algorithm**: Hybrid search (FAISS + TF-IDF + BM25)

**Request:**
```json
{
    "searchText": string (required),      // Main query text
    "fileType": string[] (optional),      // ["pdf", "docx", ...]
    "peopleNames": string[] (optional),   // Names to search
    "customTags": string[] (optional),    // Tag filters
    "dateRange": [string, string] (optional), // [start, end] ISO dates
    "limit": number (optional, default: 50)  // Max results
}
```

**Response:**
```json
{
    "results": [
        {
            "file_id": "...",
            "file_name": "...",
            "path": "...",
            "total_score": 0.85,
            "semantic_score": 0.80,
            "tfidf_score": 0.75,
            "bm25_score": 0.70,
            "extracted_text_score": 0.90,
            "tags": [...],
            "file_type": "pdf",
            "upload_date": "...",
            "key_topics": [...]
        }
    ],
    "total_found": 25,
    "search_time": "0.234s"
}
```

**Search Algorithm:**
1. Query embedding generation (cached)
2. FAISS semantic search (top K*2 candidates)
3. TF-IDF scoring on candidates
4. BM25 scoring on candidates
5. Hybrid score calculation with weights:
   - `extracted_text`: 38%
   - `summary`: 32%
   - `tags`: 18%
   - `bm25`: 5%
   - `tfidf`: 3%
   - `semantic`: 2%
   - Others: 2%
6. Result ranking and filtering

**Code Location:** `app.py:1456-1484`, `backend/search.py:483-537`

---

### 2. **POST `/search/assisted`**
**Simple text-based search**

**Design:**
- **Purpose**: Simplified search with AI-assisted query parsing
- **Content-Type**: `application/json`
- **Processing**: Uses OpenAI to parse natural language into structured query

**Request:**
```json
{
    "query": string (required)            // Natural language query
}
```

**Processing Flow:**
1. Natural language query → structured query (OpenAI)
2. Extract: query, tags, file_types, date_range
3. Call `search_files()` with parsed parameters

**Code Location:** `app.py:1443-1453`, `backend/search.py:557-600`

---

### 3. **POST `/search/finetuned`**
**Fine-tuned model search**

**Design:**
- **Purpose**: Search using fine-tuned language models
- **Content-Type**: `application/json`

**Request:**
```json
{
    "query": string (required)
}
```

**Code Location:** `app.py:1500-1504`

---

### 4. **POST `/search/chat`**
**Conversational search with RAG**

**Design:**
- **Purpose**: Chat-based search with retrieval-augmented generation
- **Content-Type**: `application/json`
- **Processing**: RAG pipeline with document context

**Request:**
```json
{
    "query": string (required),
    "conversation_id": string (optional),
    "file_ids": string[] (optional)       // Context documents
}
```

**Code Location:** `app.py:2448-2460`

---

### 5. **POST `/api/find-precedents`**
**Find similar historical documents**

**Design:**
- **Purpose**: Semantic search for similar documents (precedent finding)
- **Content-Type**: `application/json`
- **Algorithm**: FAISS vector similarity + hybrid scoring

**Request:**
```json
{
    "file_id": string (required),         // Document to find precedents for
    "similarity_threshold": number (0.0-1.0, default: 0.3),
    "file_types": string[] (optional),
    "date_range": [string, string] (optional),
    "top_k": number (default: 50)
}
```

**Response:**
```json
{
    "results": [
        {
            "file_id": "...",
            "file_name": "...",
            "similarity_score": 0.85,
            "semantic_score": 0.80,
            "tfidf_score": 0.75,
            "bm25_score": 0.70,
            "total_score": 0.82
        }
    ],
    "total_found": 15
}
```

**Code Location:** `app.py:2801-2850`, `backend/precedent_finder.py`

---

### 6. **POST `/api/compare-documents`**
**Side-by-side document comparison**

**Design:**
- **Purpose**: Compare two documents and find matching sections
- **Content-Type**: `application/json`

**Request:**
```json
{
    "file_id_1": string (required),
    "file_id_2": string (required)
}
```

**Response:**
```json
{
    "file_1": {
        "file_id": "...",
        "file_name": "...",
        "sections": [...]
    },
    "file_2": {
        "file_id": "...",
        "file_name": "...",
        "sections": [...]
    },
    "matching_sections": [
        {
            "section_1": "...",
            "section_2": "...",
            "similarity": 0.85
        }
    ],
    "overall_similarity": 0.78
}
```

**Code Location:** `app.py:2853-2881`, `backend/precedent_finder.py`

---

### 7. **POST `/api/precedent-analysis`**
**AI analysis of document relationships**

**Design:**
- **Purpose**: Generate AI-powered analysis explaining document relationships
- **Content-Type**: `application/json`
- **Processing**: OpenAI GPT analysis

**Request:**
```json
{
    "current_file_id": string (required),
    "precedent_file_id": string (required)
}
```

**Response:**
```json
{
    "summary": "...",
    "key_similarities": [...],
    "applicability_assessment": "...",
    "notable_differences": [...]
}
```

**Code Location:** `app.py:2884-2912`, `backend/precedent_finder.py`

---

### 8. **POST `/api/compare-multi-documents`**
**Multi-document comparison and analysis**

**Design:**
- **Purpose**: Compare and analyze multiple documents (2-20)
- **Content-Type**: `application/json`

**Request:**
```json
{
    "file_ids": string[] (required, 2-20 documents)
}
```

**Response:**
```json
{
    "documents": [
        {
            "file_id": "...",
            "summary": "...",
            "key_points": [...]
        }
    ],
    "common_themes": [...],
    "unique_aspects": [...],
    "relationships": [...],
    "comparative_report": "..."
}
```

**Code Location:** `app.py:2915-2960`, `backend/multi_doc_comparison.py`

---

### 9. **POST `/ask-file`**
**Query specific document content**

**Design:**
- **Purpose**: Ask questions about a specific document
- **Content-Type**: `application/json`
- **Processing**: RAG-based Q&A

**Request:**
```json
{
    "file_id": string (required),
    "question": string (required)
}
```

**Code Location:** `app.py:2461-2471`

---

### 10. **GET `/api/discussions/search`**
**Search discussions and comments**

**Design:**
- **Purpose**: Search within document discussions
- **Method**: GET
- **Query Parameters**: `q`, `type`, `thread_id`, `user_id`

**Code Location:** `backend/discussions_api.py:873-916`

---

## 🔧 Search Management Endpoints

### 1. **POST `/search/rebuild`**
**Rebuild search indexes**

**Design:**
- **Purpose**: Manually rebuild all search indexes (FAISS, TF-IDF, BM25)
- **Processing**: Full index reconstruction

**Response:**
```json
{
    "status": "success",
    "message": "Search indexes rebuilt successfully"
}
```

**Code Location:** `app.py:1570-1581`

---

### 2. **GET `/search/stats`**
**Get search index statistics**

**Design:**
- **Purpose**: Retrieve statistics about search indexes
- **Method**: GET

**Response:**
```json
{
    "faiss_available": true,
    "faiss_index_size": 1250,
    "metadata_cache_size": 1250,
    "tfidf_features": 10000,
    "bm25_available": true
}
```

**Code Location:** `app.py:1583-1593`

---

## 🏗️ Architecture & Design Patterns

### Ingestion Pipeline Design

```
Upload Request
    ↓
Validation (type, size, user permissions)
    ↓
GridFS Storage (binary files)
    ↓
Text Extraction (PDF/DOCX/OCR)
    ↓
Machine-Readability Check
    ↓
┌─────────────────┬─────────────────┐
│   Machine-Readable?                │
└─────────────────┴─────────────────┘
    │                    │
   Yes                   No
    │                    │
    ↓                    ↓
Auto-Approval    Manual Review Queue
    │                    │
    ↓                    ↓
AI Analysis      Admin Approval
    ↓                    │
Embedding Gen    ────────┘
    ↓                    │
Tag Generation           │
    ↓                    │
Compliance Check         │
    ↓                    │
Search Index Update      │
    ↓                    │
Email Notification        │
    ↓                    │
    └────────────────────┘
            ↓
    Success Response
```

### Search Architecture Design

```
User Query
    ↓
Query Processing
    ├─→ Embedding Generation (cached)
    └─→ Text Preprocessing
    ↓
Filter Application (tags, types, dates)
    ↓
┌─────────────────────────────────────┐
│   Hybrid Search Engine              │
├─────────────────────────────────────┤
│ 1. FAISS Semantic Search            │
│    → Top K*2 candidates             │
│                                     │
│ 2. TF-IDF Scoring                   │
│    → Keyword relevance               │
│                                     │
│ 3. BM25 Scoring                     │
│    → Text ranking                   │
│                                     │
│ 4. Hybrid Score Calculation         │
│    → Weighted combination           │
└─────────────────────────────────────┘
    ↓
Result Ranking & Filtering
    ↓
Access Control Check (if implemented)
    ↓
Formatted Response
```

### Key Design Principles

1. **Asynchronous Processing**: Email notifications and index updates run in background
2. **Caching Strategy**: Query embeddings cached (LRU, max 1000)
3. **Incremental Indexing**: New documents added incrementally to indexes
4. **Filter-First Approach**: Apply filters before search (faster than post-filtering)
5. **Multi-Algorithm Scoring**: Combines semantic, lexical, and fuzzy matching
6. **Error Handling**: Graceful degradation (fallback to text search if FAISS unavailable)

---

## 📊 Performance Characteristics

### Ingestion Endpoints
- **Upload Time**: ~2-5 seconds (depending on file size)
- **Text Extraction**: ~1-3 seconds
- **AI Analysis**: ~2-4 seconds (async)
- **Total Pipeline**: ~5-12 seconds (with async components)

### Search Endpoints
- **Simple Search**: ~200-500ms
- **Extensive Search**: ~300-800ms
- **Precedent Finding**: ~500-1000ms
- **Document Comparison**: ~1-3 seconds
- **Multi-Doc Comparison**: ~3-10 seconds (depends on count)

---

## 🔐 Security Considerations

### Current Implementation
- ✅ File type validation
- ✅ Size limits
- ✅ User authentication (Clerk)
- ✅ Department-based access control (for listing)
- ⚠️ **Search endpoints do NOT filter by user role** (security gap)

### Recommended Enhancements
- Add user-based filtering to search endpoints
- Implement rate limiting per user
- Add audit logging for all searches
- Encrypt sensitive document content

---

## 📝 Notes

1. **Index Management**: Single global index (not role-specific)
2. **Search Filtering**: Currently only filters by `approvalStatus` and `visible`, not by user access
3. **Async Operations**: Email notifications and compliance analysis run asynchronously
4. **Error Handling**: All endpoints return consistent JSON error format
5. **Response Format**: Standardized across all endpoints with `error` field for failures

