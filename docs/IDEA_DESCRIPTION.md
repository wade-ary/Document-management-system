# KMRL Nexus   Unified Document Intelligence Platform

Website Link : https://sih25080-dods01.vercel.app/
YouTube Link : https://www.youtube.com/watch?v=XMkOPznuArc
Architecture Design : https://drive.google.com/file/d/1u7yLxg1Y4Pzcyl0v1jRxUjZPbSKoj8av/view?usp=sharing



## Executive Summary

Kochi Metro Rail Limited (KMRL) operates a complex, multi-disciplinary ecosystem that produces and consumes thousands of documents daily: engineering drawings, job cards, incident reports, vendor invoices, regulatory circulars, HR policies, legal opinions, and more arriving via email, Maximo exports, SharePoint, WhatsApp PDFs, and hard-copy scans, in English and Malayalam, often with tables, photos, and signatures. This creates an invisible productivity tax: delayed decisions, siloed awareness, compliance risk, knowledge loss, and duplicated effort.

KMRL Nexus is an organization-wide Document Intelligence Platform that automatically ingests diverse content, extracts multilingual text and structure, generates department-aware summaries, enables hybrid intelligent search, and delivers compliance notifications while maintaining full traceability to the original sources. It transforms static documents into actionable, personalized knowledge for station controllers, engineers, finance officers, and executives.

The outcome is faster cross-department coordination, improved regulatory compliance, preserved institutional memory, and higher operational reliability as KMRL expands corridors, adds depots, and integrates UNS and IoT signals.


## Problem Recap (Context at KMRL)

- Information latency: Managers spend hours skimming long documents to find the few actionable lines, slowing decisions on train availability, payments, and staffing.
- Siloed awareness: Procurement, Engineering, HR, and Safety miss each other’s updates or work off stale copies.
- Compliance exposure: Regulatory directives are buried in inboxes, risking audit non-conformities.
- Knowledge attrition: Lessons remain locked in files and vanish when people transfer or retire.
- Duplicated effort: Teams repeatedly create summaries and slide decks for the same source files.


## The Idea: An Automated, Traceable, Department-Aware Knowledge Layer

A unified platform that:

1. Ingests documents from email, uploads, Maximo/SharePoint exports, WhatsApp PDFs, and scans.
2. Extracts multilingual content (English, Malayalam), tables, and cues like signatures and stamps.
3. Generates trustworthy, department-aware summaries with explicit citations to source pages.
4. Indexes content with a hybrid search engine (semantic + lexical + fuzzy) optimized for bilingual docs.
5. Enables “Ask a File” Q&A with grounded answers using the document’s extracted context.
6. Routes compliance-critical updates to relevant teams with audit trails and approvals.
7. Preserves visibility controls, approvals, and original file lineage for traceability and audits.


## What Makes It Work (Core Capabilities)

- Unified ingestion and storage
  - Multiple sources: email, manual uploads, enterprise repositories, scans, and exports.
  - Intelligent metadata: departments, tags, source, approvals, extracted text, topics, and visibility.
  - Separation of concerns: binary files stored efficiently; rich metadata indexed for fast queries.

- Intelligent extraction, multilingual and structure-aware
  - Adaptive text extraction for born-digital PDFs, DOCX, images, and scans.
  - OCR fallback for low-quality scans; table-aware processing; signature/stamp cues.
  - Quality enhancement and language detection for English, Malayalam, and mixed scripts.

- Department-aware summarization and personalization
  - Targeted summaries aligned to the needs of Engineering, Operations, Procurement, Finance, HR, Safety, and Legal.
  - Personalized “what matters to me” highlights with citations to the source.

- Hybrid search and retrieval
  - Semantic understanding (embeddings), statistical analysis (TF‑IDF/BM25), and fuzzy matching.
  - Departmental filters, tags, and topic awareness for precise ranking.

- “Ask a File” grounded Q&A
  - Answers grounded in pre-extracted context with a tight context window for speed and reliability.
  - Department-aware prompts and citation-style responses to reduce ambiguity.

- Compliance-aware routing and notifications
  - Automatic detection of compliance-relevant content and routing to responsible teams.
  - Approval states, visibility controls, and audit trails maintained end-to-end.

- Traceability and governance by design
  - Every summary and answer links back to the original document and page spans.
  - End-to-end lineage capturing source, uploader, departments, approvals, and timestamps.


## End-to-End Architecture (High Level)

- User applications: Secure web interface for upload, search, and document views; embedded video walkthrough for onboarding.
- API layer: REST endpoints for upload, retrieval, Q&A, search, and notifications.
- Storage: Binary file store optimized for large documents; metadata store for rich attributes and indexing.
- Processing: Background workers for extraction, OCR, table parsing, compliance tagging, and embedding generation.
- Search: Hybrid engine blending semantic, lexical, and fuzzy signals with configurable weights.
- Notifications: Email (and optional chat) integrations for alerts and compliance reminders.


## Data Model (Key Entities)

- File (binary): original file, checksum, content type, size
- Metadata document:
  - file_id, filename, uploader, departments[], tags[]
  - source: email/upload/system; source pointers (e.g., message-id)
  - extracted_text (bilingual possible), language(s)
  - tables (optional parsed structures), signatures (flags)
  - embeddings (vector store references), search index markers
  - approvals: {status, by, timestamp, notes}
  - visibility: public/internal/departmental
  - compliance_flags[] and audit trail
  - created_at, updated_at


## Core User Journeys

1. Upload and auto-summarize
   - A user uploads a PDF/scan/Docx. The platform extracts text, runs compliance and department-aware summarizers, stores metadata, and produces a short, actionable summary with citations.

2. Search and discover
   - A procurement officer searches “rubber bushing PO validity Malayalam” and immediately gets relevant hits from bilingual sources, thanks to hybrid ranking plus metadata filters.

3. Ask a file
   - An engineer opens a specific incident report and asks, “Which bogie showed abnormal temperature rise and what action was recommended?” The system answers from the pre-extracted context, linking back to the exact sections.

4. Compliance pulse
   - A regulatory circular lands; Safety and Operations get notified with a personalized summary, deadlines, and required actions, logged for audit.


## Integration Surface (Now and Next)

- Email: Ingestion from dedicated mailboxes and routing to storage and summaries.
- Enterprise repositories: Connectors or export watchers for SharePoint/Maximo and similar systems.
- External apps: Simple REST APIs for third-party tools to push/pull documents and metadata.
- Messaging: Email today; MS Teams/Slack and SMS for critical alerts as optional add-ons.


## Security, Privacy, and Compliance

- Layered access control by department, role, and document visibility.
- PII-aware redaction options and selective sharing for vendor/legal documents.
- Full traceability and immutable linkage from insights back to original documents.
- Configurable retention windows and export for audits.


## Scalability and Performance

- Horizontally scalable API behind a load balancer; background workers for heavy processing.
- Storage designed for large files; metadata indexing for fast filters and queries.
- Hybrid search with pre-computed features for sub‑second retrieval at scale.
- “Ask a File” uses a compact, pre-extracted context window (≈5,000 characters) to avoid repeated parsing and speed up responses.


## Differentiators for KMRL

- Bilingual-first: Handles English, Malayalam, and mixed documents; resilient to scans via OCR.
- Department-aware outputs: Summaries and alerts contextualized for Engineering, Operations, Procurement, Finance, HR, Safety, and Legal.
- Hybrid search that works on messy, real-world data: Combines semantic, lexical, and fuzzy signals.
- Grounded Q&A: Answers cite original sources; guards against hallucinations.
- Compliance built-in: Detects and routes regulatory content; provides auditability.
- Extensible integrations: Email today; SharePoint/Maximo-ready; future UNS/IoT signal fusion.


## Expected Impact (KPIs)

- 60–80% reduction in time to understand long documents (from 20–30 min to 5–8 min typical).
- Compliance circular visibility from days to hours or minutes; tracked acknowledgments.
- 30–50% reduction in duplicated summary/reporting effort across departments.
- Improved on-time vendor payments by faster invoice triage and exception surfacing.
- Measurable reduction in decision latency for operations (train availability, staffing, and maintenance coordination).


## Implementation Phases

- Phase 1   Foundation (4–6 weeks)
  - Core ingestion, storage, extraction (PDF/DOCX/scan), basic summaries, hybrid search, and grounded Q&A.

- Phase 2   Compliance and Personalization (3–4 weeks)
  - Department-aware summarization, compliance flags, email alerts; fine-tune ranking and filters.

- Phase 3   Integrations and Governance (4–6 weeks)
  - SharePoint/Maximo connectors; approvals, visibility workflows, and expanded audit features.

- Phase 4   Analytics and Automation (3–4 weeks)
  - Dashboarding for adoption and compliance metrics; proactive nudges; UNS/IoT hooks for cross-referencing incidents with document knowledge.


## Risks and Mitigations

- OCR/extraction errors on poor scans → Use multi-engine OCR, human-in-loop validation for critical docs.
- Model hallucination risk → Ground all answers in extracted context; include citations; cap context; track confidence.
- Data sensitivity → Departmental ACLs, metadata-driven visibility, and PII redaction pipelines.
- Change management → Provide training, gradual rollout per department, built-in traceability to build trust.


## Cost and Ops Considerations (Indicative)

- Infra: 1–2 mid-tier servers (API + worker), a document store, and a metadata database; scales horizontally.
- Variable cost: Model calls primarily during indexing/summarization; Q&A optimized by context capping and reuse of extracted text.
- Flexible posture: Choice of AI providers and ability to operate in restricted or offline environments if needed.


## Live Demo Scenarios to Validate Value

1. Safety circular → Station Controller: “What actions must be completed before first departure tomorrow?”
2. Vendor invoice + PO + GRN → Finance: “Any mismatch in quantity or unit price vs PO?”
3. Engineering drawing change note → Rolling-stock engineer: “Which assemblies and depots are impacted?”
4. CRMS/MoHUA directive → Compliance officer: “Submission deadline, required forms, and responsible departments?”

Each answer links back to the exact clause/table/page.

---

## Embedded: Intelligent Document Storage & Processing Pipeline (KMRL Nexus)

### Overview

An AI-powered, multi-stage pipeline transforms raw uploads into intelligent, searchable, and compliance-ready documents. Instead of passive storage, Nexus executes five phases of value extraction:

Raw Upload → Intelligence Extraction → Compliance Analysis → Search Optimization → Smart Routing

### Processing & Storage Architecture

- Validation & binary storage with versioning and chunking for large files.
- Metadata creation with rich attributes: departments, tags, extracted text, topics, visibility, approvals, deadlines, and compliance flags.
- Background AI analysis: embeddings, topic extraction, department suggestions.
- Compliance analysis: risk assessment, deadline extraction, and regulatory keyword detection.
- Indexing: semantic vectors, text features, metadata indexes, and tags for immediate searchability.
- Notifications: upload confirmations and compliance alerts to relevant teams.

### Intelligent Metadata (Highlights)

- Identity: file_id, name, size, type, uploader, upload date.
- Access & scope: primary department, departments[], visibility/access lists.
- Content intelligence: extracted_text (bilingual), embeddings, tags, key_topics, suggested_destination.
- Compliance: risk level, detected keywords, extracted deadlines, risk matrix/radar.
- Source attribution: email details (from/to/subject/message-id) when applicable.

### Upload Flow (Condensed)

1) Validate and store file → 2) Create metadata → 3) Extract text (OCR if needed) → 4) Generate embeddings, topics, departments → 5) Analyze compliance → 6) Update search indexes → 7) Send notifications → 8) Return success + compliance data.

### Performance & Operations

- Asynchronous background processing for heavy steps (OCR, embeddings, compliance).
- Intelligent caching for embeddings and repeated operations.
- Optimized database indexes for fast filters (department, tags, visibility, status).

### Security & Access

- Multi-layer access control across role, department, and visibility.
- Smart access resolution (who can see what) with complete audit trail.

---

## Embedded: Advanced Document Search & Retrieval Architecture (KMRL Nexus)

### Overview

A hybrid multi-algorithm search engine that blends semantic understanding, statistical text analysis, and fuzzy matching to deliver highly accurate, context-aware results.

### Multi-Dimensional Scoring (Illustrative Weights)

- Direct content match (highest priority)
- Semantic similarity (embeddings)
- TF‑IDF keyword importance
- BM25 ranking with length normalization
- Key topics relevance
- File name fuzzy match
- Tag-based relevance
- Path or organizational context

Final score = Σ(Algorithm Score × Weight) with calibrated weights for KMRL’s data.

### Why It Works in KMRL Context

- Handles bilingual and mixed-script documents; robust to scans via OCR-backed text.
- Balances intent understanding with exact phrase and keyword matches.
- Recovers relevant results even with typos or partial recollections (fuzzy).

### Performance Optimizations

- Vector indexing for fast semantic recall.
- Intelligent caching of frequent queries.
- Parallel execution of independent scoring paths.
- Pre-computed embeddings at upload time.

### Expected Experience

- Sub‑second search across thousands of documents.
- High accuracy across diverse query styles (semantic, keyword, exact, fuzzy).
- Departmental routing and filters for precise, role-appropriate results.

## Conclusion

KMRL’s expansion demands that documents become living, queryable, department-aware knowledge not static files. KMRL Nexus turns everyday documents into reliable, actionable intelligence with compliance and traceability built in. It reduces decision latency, prevents compliance slippage, and preserves institutional memory directly supporting KMRL’s mission to deliver safe, efficient, and passenger-centric transit for Kochi.