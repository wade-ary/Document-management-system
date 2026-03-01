# Precedent Finder - Visual Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRECEDENT FINDER SYSTEM                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐ │
│  │ PrecedentFinder    │  │ DocumentComparison   │  │ PrecedentAnalysis│ │
│  │ ──────────────     │  │ ─────────────────    │  │ ────────────────│ │
│  │ • Threshold slider │  │ • Side-by-side view  │  │ • AI Summary    │ │
│  │ • File type filter │  │ • Matching sections  │  │ • Similarities  │ │
│  │ • Results display  │  │ • Similarity %       │  │ • Applicability │ │
│  │ • Compare button   │  │                      │  │ • Differences   │ │
│  │ • Analyze button   │  │                      │  │                 │ │
│  └────────┬───────────┘  └──────────┬───────────┘  └────────┬────────┘ │
│           │                         │                        │          │
└───────────┼─────────────────────────┼────────────────────────┼──────────┘
            │                         │                        │
            └─────────────┬───────────┴───────────┬────────────┘
                          │                       │
                    ┌─────▼──────────────────────▼─────┐
                    │     SearchManager Utility        │
                    │     ─────────────────────        │
                    │  • findPrecedents()              │
                    │  • compareDocuments()            │
                    │  • analyzePrecedent()            │
                    └─────────────┬───────────────────┘
                                  │
                                  │ HTTP/JSON
                                  │
┌─────────────────────────────────▼─────────────────────────────────────┐
│                            API LAYER (Flask)                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  POST /api/find-precedents      POST /api/compare-documents            │
│  ─────────────────────────      ───────────────────────────            │
│  • Receives file_id             • Receives 2 file_ids                  │
│  • Returns precedent list       • Returns matching sections            │
│  • With relevance scores        • With similarity scores               │
│                                                                         │
│  POST /api/precedent-analysis                                          │
│  ────────────────────────────                                          │
│  • Receives current & precedent file_ids                               │
│  • Returns AI-generated analysis                                       │
│                                                                         │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  │
┌─────────────────────────────────▼──────────────────────────────────────┐
│                         BACKEND LOGIC LAYER                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ precedent_finder.py                                              │  │
│  │ ───────────────────                                              │  │
│  │                                                                  │  │
│  │  find_precedents()                                               │  │
│  │  ├─ Extract query from document (topics, text, tags)            │  │
│  │  ├─ Generate embedding via OpenAI                               │  │
│  │  ├─ Apply filters (file type, date range, exclude current)      │  │
│  │  ├─ Perform hybrid search (FAISS + TF-IDF + BM25)              │  │
│  │  ├─ Filter by similarity threshold                              │  │
│  │  └─ Return top k results sorted by relevance                    │  │
│  │                                                                  │  │
│  │  compare_documents()                                             │  │
│  │  ├─ Fetch both documents from MongoDB                           │  │
│  │  ├─ Split into sections (by newline, min 50 chars)             │  │
│  │  ├─ Fuzzy match sections (70% threshold)                        │  │
│  │  ├─ Identify top 10 matching sections                           │  │
│  │  └─ Return comparison with similarity scores                    │  │
│  │                                                                  │  │
│  │  analyze_precedent_relationship()                                │  │
│  │  ├─ Fetch both documents from MongoDB                           │  │
│  │  ├─ Extract topics and text previews                            │  │
│  │  ├─ Construct AI prompt for analysis                            │  │
│  │  ├─ Call OpenAI API for structured analysis                     │  │
│  │  └─ Return summary, similarities, applicability, differences    │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
                                   │
┌──────────────────────────────────▼────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                              │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ MongoDB           │  │ FAISS Index      │  │ OpenAI API       │   │
│  │ ────────          │  │ ───────────      │  │ ──────────       │   │
│  │ • Documents       │  │ • Vector search  │  │ • Embeddings     │   │
│  │ • Metadata        │  │ • Cosine sim.    │  │ • GPT analysis   │   │
│  │ • Embeddings      │  │ • Fast lookup    │  │ • JSON response  │   │
│  └───────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                         │
│  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ TF-IDF Matrix     │  │ BM25 Index       │  │ LRU Cache        │   │
│  │ ──────────        │  │ ──────────       │  │ ─────────        │   │
│  │ • Keyword match   │  │ • Text ranking   │  │ • Query cache    │   │
│  │ • Term weighting  │  │ • Document score │  │ • Fast retrieval │   │
│  └───────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## User Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION FLOW                         │
└───────────────────────────────────────────────────────────────────────┘

START
  │
  ├─► User opens document in file modal
  │
  ├─► User clicks "🔍 Precedents" tab
  │
  ▼
┌─────────────────────────────────────┐
│   PrecedentFinder Component Opens   │
│   ─────────────────────────────     │
│   • Shows similarity slider (30%)   │
│   • Shows file type filters         │
│   • Shows "Find Precedents" button  │
└──────────────┬──────────────────────┘
               │
               ├─► User adjusts threshold (optional)
               ├─► User selects file types (optional)
               │
               ├─► User clicks "Find Precedents"
               │
               ▼
       ┌──────────────────┐
       │  API Call        │────► POST /api/find-precedents
       │  • file_id       │
       │  • threshold     │
       │  • filters       │
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │  Backend Search  │
       │  • Query extract │
       │  • Embedding gen │
       │  • Hybrid search │
       │  • Filter/sort   │
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │  Results Display │
       │  • Precedent 1   │  [85% Match] [Compare] [Analyze]
       │  • Precedent 2   │  [72% Match] [Compare] [Analyze]
       │  • Precedent 3   │  [68% Match] [Compare] [Analyze]
       │  • ...           │
       └──────┬───────┬───┘
              │       │
      ┌───────┘       └────────┐
      │                        │
      ▼                        ▼
┌──────────────────┐   ┌──────────────────┐
│ User clicks      │   │ User clicks      │
│ "Compare"        │   │ "Analyze"        │
└─────┬────────────┘   └─────┬────────────┘
      │                      │
      ▼                      ▼
┌──────────────────┐   ┌──────────────────┐
│ DocumentComparison│  │ PrecedentAnalysis│
│ Component Opens  │   │ Component Opens  │
│ ────────────────│   │ ────────────────│
│ • Doc metadata   │   │ • AI Summary     │
│ • Matching       │   │ • Similarities   │
│   sections       │   │ • Applicability  │
│ • Similarity %   │   │ • Differences    │
└──────┬───────────┘   └──────┬───────────┘
       │                      │
       ├─► User reviews       ├─► User reads
       │   comparison         │   analysis
       │                      │
       ├─► User clicks        ├─► User clicks
       │   "Close"            │   "Close"
       │                      │
       ▼                      ▼
       └──────────┬───────────┘
                  │
                  ├─► Returns to results
                  │
                  └─► User can select another result
                      or close Precedent Finder

END
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW - FIND PRECEDENTS                  │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ MongoDB      │
│ ────────     │    1. Fetch current document
│ Document:    │◄───────────────────────────────────┐
│ {            │                                    │
│   file_id,   │                                    │
│   name,      │    2. Extract content              │
│   tags,      │────────────────────────────────┐   │
│   topics,    │                                │   │
│   text       │                                ▼   │
│ }            │                        ┌────────────────┐
└──────────────┘                        │ Query Builder  │
                                        │ ─────────────  │
                                        │ • Topics (5)   │
                                        │ • Text (500)   │
                                        │ • Tags         │
                                        └───────┬────────┘
                                                │
                                                │ 3. Generate query
                                                ▼
                                        ┌────────────────┐
                                        │ OpenAI API     │
                                        │ ──────────     │
                                        │ text-embedding │
                                        │ -3-large       │
                                        └───────┬────────┘
                                                │
                                                │ 4. Return embedding
                                                ▼
                                        ┌────────────────┐
                                        │ Search Engine  │
                                        │ ─────────────  │
                                        │ • FAISS search │
                                        │ • TF-IDF       │
                                        │ • BM25         │
                                        │ • Hybrid score │
                                        └───────┬────────┘
                                                │
                                                │ 5. Search all docs
                                                ▼
┌──────────────┐                        ┌────────────────┐
│ MongoDB      │    6. Filter/sort      │ Results        │
│ ────────     │◄───────────────────────│ ──────────     │
│ All approved │                        │ [{             │
│ documents    │                        │   file_id,     │
│ with         │                        │   score: 0.85  │
│ embeddings   │    7. Return top k     │ }, ...]        │
└──────────────┘────────────────────────►                │
                                        └───────┬────────┘
                                                │
                                                │ 8. Filter threshold
                                                ▼
                                        ┌────────────────┐
                                        │ Frontend       │
                                        │ ────────       │
                                        │ Display        │
                                        │ results with   │
                                        │ color codes    │
                                        └────────────────┘
```

## Component Hierarchy

```
ModernFileList
├── Modal (File Viewer)
│   ├── Tabs
│   │   ├── Preview
│   │   ├── Summary
│   │   ├── Actions
│   │   ├── Chat
│   │   ├── Content
│   │   ├── Compliance
│   │   ├── Translation
│   │   └── Precedents ◄──────────── NEW TAB
│   │       │
│   │       └── PrecedentFinder ◄─── NEW COMPONENT
│   │           │
│   │           ├── Threshold Slider
│   │           ├── File Type Filters
│   │           ├── Search Button
│   │           └── Results List
│   │               ├── Result Item 1
│   │               │   ├── Compare Button ──► DocumentComparison Modal
│   │               │   └── Analyze Button ──► PrecedentAnalysis Modal
│   │               ├── Result Item 2
│   │               └── ...
│   │
│   └── Footer Buttons
│
└── [Other components...]
```

## Scoring Algorithm Visualization

```
┌─────────────────────────────────────────────────────────────────────┐
│                     HYBRID SCORING ALGORITHM                        │
└─────────────────────────────────────────────────────────────────────┘

Document Score = Σ (weight_i × score_i)

┌─────────────────────┬──────────┬──────────────────────────────────┐
│ Component           │ Weight   │ Description                      │
├─────────────────────┼──────────┼──────────────────────────────────┤
│ Extracted Text      │ 0.25 ★★★ │ Direct text content matching    │
│ Semantic Similarity │ 0.20 ★★☆ │ FAISS vector similarity         │
│ TF-IDF Score       │ 0.18 ★★☆ │ Keyword importance matching     │
│ BM25 Score         │ 0.15 ★☆☆ │ Text relevance ranking          │
│ Key Topics         │ 0.15 ★☆☆ │ Topic alignment                 │
│ File Name          │ 0.06 ☆☆☆ │ Filename matching               │
│ Tags               │ 0.04 ☆☆☆ │ Tag overlap                     │
│ Path               │ 0.02 ☆☆☆ │ Directory path matching         │
├─────────────────────┼──────────┼──────────────────────────────────┤
│ TOTAL              │ 1.00     │                                  │
└─────────────────────┴──────────┴──────────────────────────────────┘

Final Score Range: 0.0 (no match) to 1.0 (perfect match)

Color Coding:
  0.7 - 1.0  🟢 Green   (High Relevance)
  0.5 - 0.7  🟡 Yellow  (Medium Relevance)
  0.0 - 0.5  🟠 Orange  (Lower Relevance)
```

This visual guide provides a comprehensive overview of the Precedent Finder architecture, data flow, and implementation details.
