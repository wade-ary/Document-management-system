# API Integration Guide

## Overview
This document outlines the comprehensive API-first architecture for enabling seamless partner integration with our file management and analysis system.

## Table of Contents
1. [Core API Architecture](#core-api-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Endpoints](#api-endpoints)
4. [Real-Time Integration](#real-time-integration)
5. [SDK & Client Libraries](#sdk--client-libraries)
6. [Integration Patterns](#integration-patterns)
7. [Partner Onboarding](#partner-onboarding)

## Core API Architecture

### API Gateway Layer
- **Purpose**: Single entry point for all external integrations
- **Features**: Rate limiting, authentication, logging, request routing
- **Base URL**: `https://api.filemanager.com/v1`
- **Response Format**: JSON with standardized structure

### API Versioning Strategy
```
URL Versioning: /api/v1/, /api/v2/
Header Versioning: API-Version: 1.0
Backward Compatibility: 12+ months support
Deprecation Policy: 6-month notice period
```

## Authentication & Authorization

### API Key Authentication
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.filemanager.com/v1/files
```

### OAuth 2.0 Flow
```
1. Authorization Request: GET /oauth/authorize
2. Token Exchange: POST /oauth/token
3. API Access: Authorization: Bearer ACCESS_TOKEN
4. Token Refresh: POST /oauth/refresh
```

### Permission Scopes
- `files:read` - Access file metadata and content
- `files:write` - Upload and modify files
- `analytics:read` - Access analysis results
- `tags:manage` - Manage file tags and organization
- `deadlines:manage` - Set and modify deadlines

## API Endpoints

### File Management

#### List Files
```http
GET /api/v1/files
Query Parameters:
- page: Page number (default: 1)
- limit: Items per page (max: 100)
- filter[status]: analyzed, analyzing, pending, failed
- filter[tags]: Comma-separated tag list
- filter[type]: file type filter
- sort: -created_at, name, size
```

**Response:**
```json
{
  "data": [
    {
      "id": "file_123",
      "fileName": "document.pdf",
      "fileSize": 1024000,
      "filePath": "/uploads/documents/",
      "status": "analyzed",
      "tags": ["urgent", "legal"],
      "deadline": "2025-10-15T10:00:00Z",
      "createdAt": "2025-09-29T08:30:00Z",
      "updatedAt": "2025-09-29T09:15:00Z",
      "analysis": {
        "summary": "Legal contract analysis",
        "confidence": 0.95,
        "categories": ["legal", "contract"]
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### Upload File
```http
POST /api/v1/files
Content-Type: multipart/form-data

Parameters:
- file: File content
- tags: Optional comma-separated tags
- deadline: Optional ISO 8601 datetime
- autoAnalyze: Boolean (default: true)
```

#### Get File Details
```http
GET /api/v1/files/{fileId}
```

#### Update File
```http
PUT /api/v1/files/{fileId}
Content-Type: application/json

{
  "tags": ["updated", "reviewed"],
  "deadline": "2025-10-20T15:00:00Z"
}
```

#### Delete File
```http
DELETE /api/v1/files/{fileId}
```

### Analysis Operations

#### Trigger Analysis
```http
POST /api/v1/files/{fileId}/analyze
Content-Type: application/json

{
  "analysisType": "comprehensive",
  "options": {
    "extractText": true,
    "detectCategories": true,
    "generateSummary": true
  }
}
```

#### Get Analysis Results
```http
GET /api/v1/files/{fileId}/analysis
```

**Response:**
```json
{
  "data": {
    "fileId": "file_123",
    "status": "completed",
    "results": {
      "summary": "Document contains legal contract terms...",
      "categories": ["legal", "contract", "business"],
      "entities": ["Company A", "John Doe", "2025-12-31"],
      "sentiment": "neutral",
      "confidence": 0.94,
      "keyPhrases": ["payment terms", "liability clause"]
    },
    "processedAt": "2025-09-29T09:15:00Z"
  }
}
```

### Tag Management

#### Get All Tags
```http
GET /api/v1/tags
```

#### Add Tags to File
```http
POST /api/v1/files/{fileId}/tags
Content-Type: application/json

{
  "tags": ["urgent", "review-needed"]
}
```

#### Remove Tag
```http
DELETE /api/v1/files/{fileId}/tags/{tagName}
```

### Search Operations

#### Search Files
```http
GET /api/v1/files/search
Query Parameters:
- q: Search query
- type: content, filename, tags
- filter[status]: File status filter
- filter[dateRange]: created_after,created_before
```

### Deadline Management

#### Set Deadline
```http
POST /api/v1/files/{fileId}/deadline
Content-Type: application/json

{
  "deadline": "2025-10-15T10:00:00Z",
  "priority": "high",
  "notifyBefore": "24h"
}
```

#### List Deadlines
```http
GET /api/v1/deadlines
Query Parameters:
- status: upcoming, overdue, completed
- priority: low, medium, high
- days: Number of days ahead to check
```

#### Get Overdue Files
```http
GET /api/v1/deadlines/overdue
```

## Real-Time Integration

### WebSocket Connection
```javascript
const ws = new WebSocket('wss://api.filemanager.com/v1/ws?token=YOUR_TOKEN');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  switch(event.type) {
    case 'file.analyzed':
      console.log('Analysis completed:', event.data);
      break;
    case 'deadline.approaching':
      console.log('Deadline alert:', event.data);
      break;
  }
});
```

### Webhook Configuration
```http
POST /api/v1/webhooks
Content-Type: application/json

{
  "url": "https://partner.com/api/webhooks/filemanager",
  "events": ["file.uploaded", "file.analyzed", "deadline.approaching"],
  "secret": "webhook_secret_key"
}
```

**Webhook Payload Example:**
```json
{
  "event": "file.analyzed",
  "timestamp": "2025-09-29T10:00:00Z",
  "data": {
    "fileId": "file_123",
    "fileName": "document.pdf",
    "status": "analyzed",
    "analysis": {
      "summary": "...",
      "confidence": 0.95
    }
  },
  "signature": "sha256=abc123..."
}
```

## SDK & Client Libraries

### JavaScript/TypeScript SDK

#### Installation
```bash
npm install @filemanager/api-client
```

#### Usage
```typescript
import FileManagerAPI from '@filemanager/api-client';

const client = new FileManagerAPI({
  apiKey: 'your_api_key',
  baseURL: 'https://api.filemanager.com/v1'
});

// Upload file
const uploadResult = await client.files.upload({
  file: fileBlob,
  tags: ['document', 'important'],
  autoAnalyze: true
});

// Get analysis
const analysis = await client.files.getAnalysis(uploadResult.id);

// Set deadline
await client.files.setDeadline(uploadResult.id, {
  deadline: new Date('2025-10-15'),
  priority: 'high'
});
```

### Python SDK

#### Installation
```bash
pip install filemanager-api-client
```

#### Usage
```python
from filemanager_api import FileManagerClient

client = FileManagerClient(api_key='your_api_key')

# Upload and analyze file
with open('document.pdf', 'rb') as file:
    result = client.files.upload(
        file=file,
        tags=['legal', 'contract'],
        auto_analyze=True
    )

# Wait for analysis
analysis = client.files.wait_for_analysis(result.id, timeout=300)
print(f"Analysis: {analysis.summary}")
```

## Integration Patterns

### Bulk Operations

#### Batch Upload
```http
POST /api/v1/files/batch
Content-Type: multipart/form-data

{
  "files": [/* multiple files */],
  "commonTags": ["batch-upload", "2025-q4"],
  "autoAnalyze": true
}
```

#### Batch Analysis
```http
POST /api/v1/analysis/batch
Content-Type: application/json

{
  "fileIds": ["file_123", "file_124", "file_125"],
  "analysisType": "comprehensive"
}
```

### Async Job Tracking
```http
GET /api/v1/jobs/{jobId}
```

**Response:**
```json
{
  "id": "job_456",
  "status": "in_progress",
  "progress": 65,
  "totalFiles": 10,
  "processedFiles": 6,
  "estimatedCompletion": "2025-09-29T11:30:00Z"
}
```

## Error Handling

### Standard Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid file format",
    "details": {
      "field": "file",
      "supportedFormats": ["pdf", "docx", "txt"]
    },
    "requestId": "req_123456"
  }
}
```

### Common Error Codes
- `AUTHENTICATION_ERROR` (401)
- `AUTHORIZATION_ERROR` (403)
- `VALIDATION_ERROR` (400)
- `NOT_FOUND` (404)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_ERROR` (500)

## Rate Limits

### Default Limits
- **Standard Plan**: 1000 requests/hour
- **Premium Plan**: 10000 requests/hour
- **Enterprise Plan**: Custom limits

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1696089600
```

## Partner Onboarding

### 1. Registration Process
1. Apply at developer.filemanager.com
2. Provide use case and integration details
3. Receive sandbox API key
4. Complete integration testing
5. Request production access

### 2. Sandbox Environment
- Base URL: `https://sandbox-api.filemanager.com/v1`
- Test data available
- No rate limits
- Full feature access

### 3. Production Approval Checklist
- [ ] Successful sandbox integration
- [ ] Proper error handling implemented
- [ ] Webhook signature verification
- [ ] Rate limit handling
- [ ] Security review completed

### 4. Go-Live Process
1. Production API key issued
2. Webhook URLs configured
3. DNS/SSL verification
4. Initial usage monitoring
5. Technical support contact established

## Monitoring & Support

### Health Check
```http
GET /api/v1/health
```

### API Status Page
- Real-time status: status.filemanager.com
- Incident notifications
- Maintenance schedules

### Developer Support
- Technical documentation: docs.filemanager.com
- Community forum: community.filemanager.com
- Direct support: api-support@filemanager.com
- SLA: 24-hour response for production issues

## Changelog & Migration

### Version Migration
- Automatic minor version updates
- 6-month notice for breaking changes
- Migration guides for major versions
- Backward compatibility tools

### API Changelog
- Subscribe to updates: changelog.filemanager.com
- RSS feed available
- Email notifications for breaking changes

---

**Last Updated**: September 29, 2025
**API Version**: v1.0
**Document Version**: 1.0