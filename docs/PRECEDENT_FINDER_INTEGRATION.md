# Precedent Finder - Developer Integration Guide

## Quick Start

The Precedent Finder feature is fully integrated into the existing codebase and ready to use. Here's how to work with it:

## Backend Usage

### Import the functions
```python
from backend.precedent_finder import (
    find_precedents,
    compare_documents,
    analyze_precedent_relationship
)
```

### Find similar documents
```python
# Basic usage
result = find_precedents(
    file_id="abc123",
    similarity_threshold=0.3,
    top_k=50
)

# With filters
result = find_precedents(
    file_id="abc123",
    similarity_threshold=0.5,
    file_types=["pdf", "docx"],
    date_range=("2024-01-01", "2024-12-31"),
    top_k=25
)
```

### Compare two documents
```python
comparison = compare_documents(
    file_id_1="current_doc_id",
    file_id_2="precedent_doc_id"
)

# Access matching sections
for match in comparison['matching_sections']:
    print(f"Similarity: {match['similarity']}")
    print(f"Section 1: {match['section_1']}")
    print(f"Section 2: {match['section_2']}")
```

### Get AI analysis
```python
analysis = analyze_precedent_relationship(
    current_file_id="current_doc_id",
    precedent_file_id="precedent_doc_id"
)

# Access analysis components
print(analysis['analysis']['summary'])
print(analysis['analysis']['similarities'])
print(analysis['analysis']['applicability'])
print(analysis['analysis']['differences'])
```

## Frontend Usage

### Import components
```typescript
import PrecedentFinder from './components/PrecedentFinder';
import DocumentComparison from './components/DocumentComparison';
import PrecedentAnalysis from './components/PrecedentAnalysis';
```

### Use PrecedentFinder
```tsx
<PrecedentFinder
  fileId={currentFileId}
  onClose={() => setShowFinder(false)}
  onViewComparison={(currentId, precedentId) => {
    // Handle comparison view
    setComparisonIds([currentId, precedentId]);
    setShowComparison(true);
  }}
  onViewAnalysis={(currentId, precedentId) => {
    // Handle analysis view
    setAnalysisIds([currentId, precedentId]);
    setShowAnalysis(true);
  }}
/>
```

### Use DocumentComparison
```tsx
<DocumentComparison
  fileId1={comparisonIds[0]}
  fileId2={comparisonIds[1]}
  onClose={() => setShowComparison(false)}
/>
```

### Use PrecedentAnalysis
```tsx
<PrecedentAnalysis
  currentFileId={analysisIds[0]}
  precedentFileId={analysisIds[1]}
  onClose={() => setShowAnalysis(false)}
/>
```

### Use SearchManager utility
```typescript
import SearchManager from '@/utils/SearchManager';

// Find precedents
const result = await SearchManager.findPrecedents({
  file_id: currentFileId,
  similarity_threshold: 0.3,
  file_types: ['pdf', 'docx'],
  top_k: 50
});

if (result.success) {
  console.log('Found precedents:', result.results);
} else {
  console.error('Error:', result.error);
}

// Compare documents
const comparison = await SearchManager.compareDocuments(
  fileId1,
  fileId2
);

// Analyze precedent
const analysis = await SearchManager.analyzePrecedent(
  currentFileId,
  precedentFileId
);
```

## API Integration

### cURL Examples

#### Find Precedents
```bash
curl -X POST http://localhost:5000/api/find-precedents \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "your_file_id",
    "similarity_threshold": 0.3,
    "file_types": ["pdf"],
    "top_k": 50
  }'
```

#### Compare Documents
```bash
curl -X POST http://localhost:5000/api/compare-documents \
  -H "Content-Type: application/json" \
  -d '{
    "file_id_1": "current_doc_id",
    "file_id_2": "precedent_doc_id"
  }'
```

#### Analyze Precedent
```bash
curl -X POST http://localhost:5000/api/precedent-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "current_file_id": "current_doc_id",
    "precedent_file_id": "precedent_doc_id"
  }'
```

## Customization

### Adjust Similarity Scoring
Edit `backend/precedent_finder.py` and modify the search logic in `find_precedents()`:

```python
# Use existing search engine with custom threshold
results = search_engine.hybrid_search(query, query_embedding, top_k * 2)

# Custom filtering
precedent_results = []
for result in sorted(results.values(), key=lambda x: x["total_score"], reverse=True):
    # Apply your custom logic here
    if result["total_score"] >= similarity_threshold:
        precedent_results.append(result)
```

### Customize Section Matching
Edit `backend/precedent_finder.py` in `compare_documents()`:

```python
# Adjust minimum section length (currently 50 characters)
sections1 = [s.strip() for s in text1.split('\n') if len(s.strip()) > 50]

# Adjust similarity threshold for matches (currently 70%)
if similarity > 0.7:  # Change this value
    matching_sections.append({...})

# Adjust number of sections compared (currently first 20 from each doc)
for i, sect1 in enumerate(sections1[:20]):  # Change this value
    for j, sect2 in enumerate(sections2[:20]):
        # comparison logic
```

### Customize AI Analysis Prompt
Edit `backend/precedent_finder.py` in `analyze_precedent_relationship()`:

```python
# Modify the prompt to customize analysis output
prompt = f"""Analyze the relationship between these two documents and explain how the precedent document relates to the current document.

Current Document:
- File: {current_doc['name']}
- Key Topics: {', '.join(current_topics[:5]) if current_topics else 'N/A'}
- Content Preview: {current_text}

Precedent Document:
- File: {precedent_doc['name']}
- Key Topics: {', '.join(precedent_topics[:5]) if precedent_topics else 'N/A'}
- Upload Date: {precedent_doc.get('upload_date', 'Unknown')}
- Content Preview: {precedent_text}

Provide a concise analysis explaining:
1. Key similarities between the documents
2. How the precedent document can inform the current document
3. Any notable differences or unique aspects

Return your analysis as a JSON object with keys: "summary", "similarities", "applicability", "differences".
Each value should be a string with 2-3 sentences.
"""
```

### Customize UI Theme
Edit the component files to change colors and styling:

**PrecedentFinder.tsx:**
```tsx
// Change header color
<div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">

// Change button colors
<button className="bg-blue-600 hover:bg-blue-700 text-white">
```

**DocumentComparison.tsx:**
```tsx
// Change header color
<div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
```

**PrecedentAnalysis.tsx:**
```tsx
// Change header color
<div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6">

// Customize section colors
<div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-5">
```

## Troubleshooting

### "Document not found" error
- Verify the file_id exists in the database
- Check that the document has been processed and has embeddings
- Ensure the document is approved and visible

### No precedents found
- Lower the similarity_threshold (try 0.1 - 0.3)
- Remove file_type and date_range filters
- Check that other documents exist in the system
- Verify the current document has searchable content (extracted_text, key_topics)

### Comparison shows no matching sections
- Documents may have very different content
- Try comparing documents you know are similar
- Check that both documents have extracted_text

### AI analysis fails
- Verify OpenAI API key is configured
- Check network connectivity to OpenAI
- Ensure documents have sufficient content for analysis
- Review logs for specific error messages

## Performance Tips

1. **Adjust top_k**: Lower values (10-25) are faster
2. **Use filters**: File type and date range filters reduce search space
3. **Set appropriate threshold**: Higher thresholds (0.5+) return fewer results faster
4. **Cache results**: Store search results in component state to avoid re-fetching
5. **Pagination**: If implementing custom UI, paginate large result sets

## Best Practices

1. **User Feedback**: Always show loading states and error messages
2. **Progressive Enhancement**: Load comparison/analysis on-demand
3. **Error Handling**: Gracefully handle API failures
4. **Accessibility**: Maintain keyboard navigation and screen reader support
5. **Performance**: Debounce search triggers, lazy load heavy components
6. **Testing**: Test with various document types and sizes

## Integration Checklist

Implementation status for the Precedent Finder feature:

**Completed:**
- [x] Backend functions implemented
- [x] API endpoints registered
- [x] Frontend components created
- [x] SearchManager utility extended
- [x] Integration with ModernFileList
- [x] Error handling in place
- [x] Loading states implemented
- [x] Documentation complete

**Optional (not included in this PR):**
- [ ] Unit tests added
- [ ] E2E tests added
