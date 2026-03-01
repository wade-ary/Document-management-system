# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**KMRL Document Management System (TransformoDocs)** - An AI-powered document processing system for Kochi Metro Rail Limited addressing critical challenges in information latency, siloed awareness, compliance exposure, and knowledge attrition.

### Core Architecture

- **Backend**: Flask-based Python application with MongoDB storage and AI processing pipeline
- **Frontend**: Next.js React application with TypeScript
- **Database**: MongoDB with GridFS for file storage
- **AI/ML**: OpenAI, spaCy, PaddleOCR for document processing
- **Features**: Multi-format support (PDF, DOCX, images), bilingual processing (English/Malayalam), role-based access

## Development Commands

### Backend Setup & Development

```bash
# Install Poetry environment
poetry install

# Fast development startup (recommended)
poetry run python start_dev.py

# Standard Flask development server
poetry run python app.py

# Alternative: Use Flask CLI
poetry run flask run

# Setup spaCy models and dependencies
poetry run python setup.py

# Validate environment setup
poetry run python validate_env.py

# Run tests
poetry run python test_api.py
poetry run python test_extraction.py
poetry run python test_direct_extraction.py
```

### Frontend Development

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Database Operations

```bash
# MongoDB typically runs on: mongodb://localhost:27017
# Database name: EDUDATA
# Key collections: metadata, actions, directories, users

# Check MongoDB connection
mongosh mongodb://localhost:27017/EDUDATA
```

### Performance Optimization Commands

```bash
# Rebuild search indexes manually
curl -X POST http://localhost:5000/search/rebuild

# Get search statistics
curl -X GET http://localhost:5000/search/stats

# Clear Poetry cache if needed
poetry cache clear pypi --all
poetry env remove python
poetry install
```

## Architecture Overview

### Backend Module Structure

- **app.py**: Main Flask application with all API endpoints
- **backend/storage.py**: File management and MongoDB operations with GridFS
- **backend/main.py**: Document analysis and AI-powered routing
- **backend/new_extract.py**: Text extraction from PDFs, DOCX, images with OCR
- **backend/search.py**: Advanced hybrid search with FAISS, TF-IDF, and BM25
- **backend/lazy_nlp.py**: Performance optimization for AI model loading
- **backend/RAG.py**: Retrieval Augmented Generation implementation
- **backend/redaction.py**: PII removal for compliance
- **backend/compliance_api.py**: Regulatory document management

### Key Design Patterns

- **Lazy Loading**: Heavy AI models (spaCy, OpenAI) load only when needed via `lazy_nlp.py`
- **Modular Processing**: Separate concerns for text extraction, analysis, and storage
- **Department-based Routing**: Smart categorization for KMRL departments (safety, hr, finance, engineering, procurement, legal)
- **Async Processing**: Background workers for email notifications and compliance analysis
- **Hybrid Search**: Combines semantic (OpenAI embeddings), TF-IDF, and BM25 for optimal relevance

### Database Collections

- **metadata**: Document metadata, analysis results, embeddings
- **actions**: User actions requiring admin approval
- **directories**: Folder structure and permissions
- **users**: User management with department mapping
- **GridFS**: Large file storage with efficient retrieval

### API Architecture

- **REST Endpoints**: `/upload`, `/search/*`, `/analyze`, `/compliance-summary`
- **Streaming**: `/api/objects/{file_id}` for efficient file serving
- **Webhook Support**: `/webhook` for external system integration (n8n, email)
- **Admin Workflows**: `/admin/*` endpoints for approval processes

## KMRL Business Context

### Stakeholder Requirements

- **Station Controllers**: Safety bulletins, service disruptions, equipment status
- **Rolling-stock Engineers**: Technical drawings, maintenance job cards, equipment manuals
- **Finance Officers**: Vendor invoices, purchase orders, audit documentation
- **Executive Directors**: Board minutes, performance dashboards, compliance status
- **HR Teams**: Policy updates, training materials, organizational announcements
- **Procurement**: Contract management, vendor correspondence, procurement policies

### Document Types Handled

- Engineering drawings, maintenance job cards, incident reports
- Vendor invoices, purchase orders, regulatory directives
- Environmental studies, safety circulars, HR policies
- Legal opinions, board minutes, compliance records

### Compliance Requirements

- **Audit Trails**: Complete document access and modification history
- **Role-based Access**: Department-specific document visibility
- **PII Redaction**: Automatic sensitive data removal
- **Deadline Tracking**: Automated compliance alerts

## Development Guidelines

### Environment Variables Required

```bash
# Core Configuration
MONGO_URI=mongodb://localhost:27017
OPENAI_API_KEY=your_openai_key
SENDGRID_API_KEY=your_sendgrid_key
CLERK_AUTH_TOKEN=your_clerk_token
GEMINI_API_KEY=your_gemini_key

# Development Mode
DEVELOPMENT_MODE=true  # Enables lazy loading for faster startup

# Frontend API Configuration
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5001
NEXT_PUBLIC_EXTERNAL_API_BASE_URL=http://localhost:5000
```

### Performance Considerations

- Use `DEVELOPMENT_MODE=true` for faster startup during development
- AI models load lazily via `get_nlp_model()` function
- FAISS indexing provides ultra-fast semantic search when available
- GridFS handles large files efficiently with streaming

### Testing Strategy

- Test files create sample PDFs with tables and signatures
- Mock external API calls (OpenAI, etc.) in tests
- Test document processing pipeline with various file formats
- Validate department-based routing logic

### Code Quality Rules

- Always include try-catch blocks for file operations
- Use structured logging for debugging document processing
- Implement caching for frequently accessed documents
- Handle bilingual content (English/Malayalam) appropriately
- Follow department categorization: safety, hr, finance, engineering, procurement, legal

### Deployment Considerations

- Set `DEVELOPMENT_MODE=false` for production
- Configure proper MongoDB connection strings with authentication
- Implement SSL certificates for secure document handling
- Plan for document archival strategies for KMRL expansion
- Monitor AI model performance and costs

## Common Issues & Solutions

### Backend Issues

```bash
# Port 5000 conflicts (macOS AirPlay)
lsof -ti:5000 | xargs kill -9

# OpenCV installation issues
brew install opencv
poetry install

# spaCy model missing
poetry run python -m spacy download en_core_web_sm

# MongoDB connection issues
brew services start mongodb-community
```

### Frontend Issues

```bash
# API base URL configuration
# Check frontend/.env.local for correct API endpoints

# Next.js build issues
rm -rf .next
npm run build
```

### Performance Issues

```bash
# Clear caches and rebuild search indexes
poetry cache clear pypi --all
curl -X POST http://localhost:5000/search/rebuild
```

This system is designed to scale with KMRL's expansion plans including new corridors, depots, and IoT integration while maintaining regulatory compliance and operational efficiency.