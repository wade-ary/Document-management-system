# Precedent Finder Feature

## Overview
The Precedent Finder is an AI-powered feature that helps users find historically similar documents or cases based on content similarity, enabling informed decision-making by referencing past precedents.

## Features

### 1. Find Similar Documents
- **Semantic Search**: Uses existing FAISS-based semantic search infrastructure
- **Configurable Similarity Threshold**: Adjustable from 10% to 100% match
- **Advanced Filtering**: Filter by file type, date range, and more
- **Relevance Scoring**: Multiple scoring factors including semantic similarity, text matching, and topic alignment

### 2. Document Comparison
- **Side-by-Side View**: Compare current document with historical precedent
- **Matching Sections**: Automatically identifies and highlights similar sections
- **Visual Similarity Indicators**: Shows percentage match for each section
- **Metadata Comparison**: Compare tags, topics, and dates

### 3. AI-Powered Analysis
- **Relationship Summary**: AI explains how documents are related
- **Key Similarities**: Identifies common themes and content
- **Applicability Assessment**: Explains how precedent applies to current document
- **Notable Differences**: Highlights unique aspects and differences

## Backend Implementation

### API Endpoints

#### 1. `/api/find-precedents` (POST)
Find historical similar documents for a given document.

**Request Body:**
```json
{
  "file_id": "string (required)",
  "similarity_threshold": 0.3,  // 0.0 to 1.0, default: 0.3
  "file_types": ["pdf", "docx"],  // optional
  "date_range": ["2024-01-01", "2024-12-31"],  // optional
  "top_k": 50  // max results, default: 50
}
```

**Response:**
```json
{
  "results": [
    {
      "file_id": "string",
      "file_name": "string",
      "path": "string",
      "relevance_score": 0.85,
      "semantic_score": 0.82,
      "tags": ["tag1", "tag2"],
      "file_type": "pdf",
      "upload_date": "2024-01-15",
      "key_topics": ["topic1", "topic2"]
    }
  ],
  "total_found": 25,
  "current_document": {
    "file_id": "string",
    "file_name": "string",
    "path": "string"
  }
}
```

#### 2. `/api/compare-documents` (POST)
Compare two documents side-by-side.

**Request Body:**
```json
{
  "file_id_1": "string (required)",
  "file_id_2": "string (required)"
}
```

**Response:**
```json
{
  "document_1": {
    "file_id": "string",
    "file_name": "string",
    "path": "string",
    "tags": [],
    "key_topics": []
  },
  "document_2": {
    "file_id": "string",
    "file_name": "string",
    "path": "string",
    "tags": [],
    "key_topics": []
  },
  "matching_sections": [
    {
      "section_1": "text from doc 1",
      "section_2": "text from doc 2",
      "similarity": 0.85,
      "position_1": 0,
      "position_2": 1
    }
  ],
  "total_matches": 10
}
```

#### 3. `/api/precedent-analysis` (POST)
Generate AI-powered analysis of precedent relationship.

**Request Body:**
```json
{
  "current_file_id": "string (required)",
  "precedent_file_id": "string (required)"
}
```

**Response:**
```json
{
  "current_document": {
    "file_id": "string",
    "file_name": "string"
  },
  "precedent_document": {
    "file_id": "string",
    "file_name": "string",
    "upload_date": "2024-01-15"
  },
  "analysis": {
    "summary": "AI-generated summary",
    "similarities": "Key similarities identified",
    "applicability": "How precedent applies",
    "differences": "Notable differences"
  }
}
```

### Backend Modules

#### `backend/precedent_finder.py`
Core module containing:
- `find_precedents()`: Main precedent search function
- `compare_documents()`: Document comparison logic
- `analyze_precedent_relationship()`: AI-powered analysis

**Key Features:**
- Reuses existing search infrastructure (FAISS, TF-IDF, BM25)
- Filters out current document from results
- Supports multiple search strategies for robustness
- Uses fuzzy matching for section comparison

## Frontend Implementation

### Components

#### 1. `PrecedentFinder.tsx`
Main UI for finding precedents.

**Features:**
- Similarity threshold slider (10% - 100%)
- File type filters (PDF, DOCX, TXT, PPTX)
- Search button with loading state
- Results list with relevance scores
- Quick actions: Compare and Analyze buttons

**UI Elements:**
- Color-coded relevance scores:
  - Green: ≥70% match (High relevance)
  - Yellow: 50-69% match (Medium relevance)
  - Orange: <50% match (Lower relevance)
- Compact results view with key metadata
- Responsive design

#### 2. `DocumentComparison.tsx`
Side-by-side document comparison modal.

**Features:**
- Document metadata comparison
- Matching sections display
- Similarity percentage for each match
- Color-coded highlights for both documents
- Scroll-friendly layout

#### 3. `PrecedentAnalysis.tsx`
AI analysis viewer modal.

**Features:**
- Document information header
- Four analysis sections:
  - Summary (Indigo/Purple theme)
  - Key Similarities (Green theme)
  - Applicability (Blue theme)
  - Notable Differences (Orange theme)
- Loading state with animation
- Error handling

### Integration

#### ModernFileList Integration
The Precedent Finder is integrated into the existing file modal as a new tab:

1. **New Tab Button**: "🔍 Precedents" added to tab bar
2. **Modal Workflow**: 
   - Click Precedents tab → Opens PrecedentFinder
   - Click Compare → Opens DocumentComparison
   - Click Analyze → Opens PrecedentAnalysis
   - Close comparison/analysis → Returns to PrecedentFinder
   - Close PrecedentFinder → Returns to file modal

### SearchManager Utility

Extended with three new methods:

```typescript
// Find precedents for a document
SearchManager.findPrecedents({
  file_id: string,
  similarity_threshold?: number,
  file_types?: string[],
  date_range?: string[],
  top_k?: number
})

// Compare two documents
SearchManager.compareDocuments(fileId1: string, fileId2: string)

// Analyze precedent relationship
SearchManager.analyzePrecedent(currentFileId: string, precedentFileId: string)
```

## Technical Details

### Search Algorithm
1. Extract query from current document:
   - Key topics (top 5)
   - Extracted text snippet (first 500 chars)
   - Tags
2. Generate query embedding using OpenAI
3. Apply filters (file type, date range, exclude current doc)
4. Perform hybrid search (semantic + TF-IDF + BM25)
5. Filter by similarity threshold
6. Return top k results sorted by relevance

### Performance Optimizations
- Reuses existing FAISS index (no rebuild needed)
- Caches query embeddings
- Filters at database level before search
- Limits section comparison to first 20 sections
- Returns top 10 matching sections only

### Dependencies
**Backend:**
- Existing: FAISS, scikit-learn, fuzzywuzzy, pymongo, OpenAI
- No new dependencies added

**Frontend:**
- Existing: React, lucide-react, react-hot-toast
- No new dependencies added

## Usage Examples

### Finding Precedents
1. Open a document in ModernFileList
2. Click the "🔍 Precedents" tab
3. Adjust similarity threshold if needed (default: 30%)
4. Optionally select file types to filter
5. Click "Find Precedents"
6. View results sorted by relevance

### Comparing Documents
1. Find precedents (steps above)
2. Click "Compare" button on any result
3. Review side-by-side comparison
4. Examine matching sections
5. Click back to return to results

### Getting AI Analysis
1. Find precedents (first steps)
2. Click "Analyze" button on any result
3. Read AI-generated analysis:
   - Overall summary
   - Key similarities
   - How to apply precedent
   - Important differences

## Configuration

### Similarity Threshold Guidelines
- **0.1 - 0.3**: Broad search, finds loosely related documents (default: 0.3)
- **0.3 - 0.5**: Moderate search, balanced relevance
- **0.5 - 0.7**: Strict search, only similar documents
- **0.7 - 1.0**: Very strict, nearly identical documents only

### Performance Tuning
Adjust `top_k` parameter to control number of results:
- Default: 50 results
- Lower values (10-25): Faster for quick checks
- Higher values (50-100): More comprehensive search

## Error Handling

### Backend
- Missing document: Returns `{"error": "Document not found"}`
- No content: Returns `{"error": "No searchable content in document"}`
- Invalid parameters: Returns 400 status with error message
- Server errors: Returns 500 status with error details

### Frontend
- Network errors: Shows toast notification
- Empty results: Displays helpful message with suggestions
- Loading states: Shows spinner animations
- Invalid file IDs: Handled gracefully with error messages

## Testing Checklist

The following items have been implemented and validated:

- [x] Backend module compiles without syntax errors
- [x] API endpoints registered correctly
- [x] Frontend components created with proper TypeScript types
- [x] SearchManager utility extended
- [x] Integration with ModernFileList complete

The following require a deployed environment with documents:

- [ ] End-to-end testing with real documents
- [ ] UI/UX validation with screenshots
- [ ] Performance testing with large document sets

## Future Enhancements

Potential improvements for future iterations:
1. Save frequently used precedent searches
2. Export comparison results as reports
3. Bulk precedent analysis for multiple documents
4. Historical trend visualization
5. Custom precedent categories/tags
6. Collaborative precedent annotations
