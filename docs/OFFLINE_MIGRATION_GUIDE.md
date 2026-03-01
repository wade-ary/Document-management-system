# 🌐➡️💻 KMRL Nexus Offline Migration Guide

## Overview
This guide outlines the steps to transform your Flask application from cloud-dependent to fully offline-capable.

## 🔍 Current External Dependencies

### 1. **AI/ML Services**
- **OpenAI API**: Used for embeddings, summaries, action points
- **Google Gemini API**: Used for compliance analysis, document processing
- **Location**: `backend/summary.py`, `backend/compliance_summary.py`, `backend/file.py`, `backend/search.py`

### 2. **Authentication & Communication**
- **Clerk API**: User authentication and management
- **SendGrid API**: Email notifications
- **Location**: `backend/users.py`, `backend/email_notifications.py`, `app.py`

## 🛠️ Offline Alternatives

### Phase 1: Local AI Models

#### 1.1 Replace OpenAI with Local Models
```bash
# Install Ollama for local LLM hosting
curl -fsSL https://ollama.ai/install.sh | sh

# Pull required models
ollama pull llama2:13b          # For general text processing
ollama pull codellama:7b        # For code analysis
ollama pull mistral:7b          # Alternative lightweight model
```

#### 1.2 Replace OpenAI Embeddings with Local Alternative
```python
# Option A: Use sentence-transformers (Recommended)
pip install sentence-transformers

from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')  # 80MB model

# Option B: Use Ollama embeddings
ollama pull nomic-embed-text    # For embeddings
```

#### 1.3 Replace Google Gemini with Local Models
```python
# Use Ollama with vision capabilities for document analysis
ollama pull llava:13b           # For vision + text analysis
ollama pull phi3:14b           # For detailed text analysis
```

### Phase 2: Authentication & Communication

#### 2.1 Replace Clerk with Local Auth
```python
# Use Flask-Login + local database authentication
pip install Flask-Login bcrypt

# Implement in backend/auth_local.py
from flask_login import LoginManager, UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
```

#### 2.2 Replace SendGrid with Local Email
```python
# Option A: SMTP server (if available locally)
pip install Flask-Mail

# Option B: File-based notifications (offline-friendly)
# Option C: In-app notification system
```

### Phase 3: Implementation Plan

#### Step 1: Create Offline Configuration
```python
# Create backend/config.py
OFFLINE_MODE = True
LOCAL_AI_BASE_URL = "http://localhost:11434"  # Ollama default
LOCAL_EMBEDDINGS_MODEL = "all-MiniLM-L6-v2"
LOCAL_LLM_MODEL = "llama2:13b"
```

#### Step 2: Create AI Service Abstraction Layer
```python
# Create backend/ai_services.py
class AIServiceFactory:
    @staticmethod
    def get_llm_service():
        if OFFLINE_MODE:
            return OllamaService()
        else:
            return OpenAIService()
    
    @staticmethod 
    def get_embeddings_service():
        if OFFLINE_MODE:
            return LocalEmbeddingsService()
        else:
            return OpenAIEmbeddingsService()
```

#### Step 3: Update Core Modules

##### 3.1 Update backend/summary.py
```python
# Replace OpenAI calls with local service
from backend.ai_services import AIServiceFactory

class DocumentSummarizer:
    def __init__(self):
        self.llm_service = AIServiceFactory.get_llm_service()
    
    def generate_summary(self, text, department):
        # Use local LLM instead of OpenAI
        return self.llm_service.generate_completion(prompt, text)
```

##### 3.2 Update backend/compliance_summary.py
```python
# Replace Gemini with local multimodal model
class OfflineComplianceAnalyzer:
    def __init__(self):
        self.vision_model = OllamaVisionService("llava:13b")
    
    def analyze_document(self, file_path, mime_type):
        # Process locally instead of uploading to Gemini
        return self.vision_model.analyze_compliance(file_path)
```

##### 3.3 Update backend/search.py
```python
# Replace OpenAI embeddings with local model
from sentence_transformers import SentenceTransformer

class LocalSearchService:
    def __init__(self):
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def generate_embeddings(self, text):
        return self.embedding_model.encode(text)
```

## 🗄️ Data Storage Considerations

### Local Database Setup
```python
# Ensure MongoDB is running locally
# Update connection string in backend/db.py
MONGO_URI = "mongodb://localhost:27017"  # Local MongoDB

# For completely offline: Use SQLite as fallback
pip install sqlite3
```

### File Storage
```python
# Use local GridFS or file system
# Update backend/storage.py for local file handling
LOCAL_STORAGE_PATH = "/path/to/local/storage"
```

## 📦 Installation Script

Create `setup_offline.sh`:
```bash
#!/bin/bash

echo "🚀 Setting up KMRL Nexus for Offline Mode..."

# 1. Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Pull required models
echo "📥 Downloading AI models (this may take a while)..."
ollama pull llama2:13b
ollama pull llava:13b  
ollama pull nomic-embed-text

# 3. Install Python dependencies
pip install sentence-transformers Flask-Login bcrypt Flask-Mail

# 4. Setup local MongoDB
brew install mongodb/brew/mongodb-community
brew services start mongodb-community

echo "✅ Offline setup complete!"
echo "🔧 Please update your .env file with OFFLINE_MODE=true"
```

## ⚙️ Environment Configuration

Update `.env` file:
```bash
# Offline Mode Configuration
OFFLINE_MODE=true
LOCAL_AI_URL=http://localhost:11434
EMBEDDINGS_MODEL=all-MiniLM-L6-v2
LLM_MODEL=llama2:13b
VISION_MODEL=llava:13b

# Local Database
MONGO_URI=mongodb://localhost:27017

# Disable external APIs
OPENAI_API_KEY=""
GEMINI_API_KEY=""
SENDGRID_API_KEY=""
CLERK_AUTH_TOKEN=""
```

## 🔄 Migration Checklist

### Pre-Migration
- [ ] Backup your current database
- [ ] Test current system functionality
- [ ] Install required offline dependencies

### During Migration  
- [ ] Implement AI service abstraction layer
- [ ] Replace OpenAI calls with local LLM
- [ ] Replace Gemini calls with local vision model
- [ ] Replace embedding service with local model
- [ ] Implement local authentication
- [ ] Replace email notifications with local system

### Post-Migration Testing
- [ ] Test document upload and processing
- [ ] Test search functionality
- [ ] Test compliance analysis
- [ ] Test user authentication
- [ ] Test all department-specific features
- [ ] Performance benchmarking

## 📊 Performance Considerations

### Resource Requirements
- **RAM**: 16GB+ recommended (for LLM models)
- **Storage**: 50GB+ for models and documents
- **CPU**: Multi-core processor for model inference

### Optimization Tips
- Use quantized models for better performance
- Implement caching for embeddings
- Use model-specific batch processing
- Consider GPU acceleration if available

## 🚨 Limitations & Trade-offs

### Pros ✅
- Complete offline functionality
- Data privacy and security
- No API costs
- Full control over system

### Cons ❌
- Larger system requirements
- Potentially slower AI inference
- Manual model updates
- Limited to local model capabilities

## 🔧 Troubleshooting

### Common Issues
1. **Model download failures**: Check internet during setup
2. **Memory issues**: Use smaller models or increase RAM
3. **Performance issues**: Consider GPU acceleration
4. **MongoDB connection**: Ensure local MongoDB is running

### Support
- Check Ollama logs: `ollama logs`
- Monitor system resources: `htop` or Activity Monitor
- Database status: `mongo --eval "db.adminCommand('ismaster')"`

## 📈 Future Enhancements

1. **Hybrid Mode**: Switch between online/offline based on connectivity
2. **Model Updates**: Automated offline model update system
3. **Distributed Processing**: Multi-node offline processing
4. **Advanced Caching**: Intelligent result caching system

---

**Note**: This migration requires significant system resources and setup time. Consider implementing in phases and maintaining a backup of your current system.