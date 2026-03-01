# Dependency Troubleshooting Guide

## Common Issues and Solutions

### 1. pdfminer Import Error (HOCRConverter)

**Error:**
```
ImportError: cannot import name 'HOCRConverter' from 'pdfminer.converter'
```

**Solution:**
1. Update `pdfminer.six` to the latest version:
   ```bash
   poetry update pdfminer.six
   ```

2. If poetry.lock is corrupted, clean install:
   ```bash
   rm poetry.lock
   poetry lock
   poetry install
   ```

**Root Cause:** Older versions of `pdfminer.six` had compatibility issues where `HOCRConverter` was removed but still referenced in imports.

### 2. PyPDF Cryptography Deprecation Warning

**Warning:**
```
CryptographyDeprecationWarning: ARC4 has been moved to cryptography.hazmat.decrepit.ciphers.algorithms.ARC4 and will be removed from cryptography.hazmat.primitives.ciphers.algorithms in 48.0.0.
```

**Status:** This is a deprecation warning, not an error. The application will continue to work normally.

**Solution (Optional):**
To suppress this warning, you can either:
1. Wait for `pypdf` to update their cryptography usage
2. Pin cryptography to an older version temporarily:
   ```toml
   cryptography = "<48.0.0"
   ```
3. Suppress the warning in code (not recommended for production)

**Root Cause:** `pypdf` library is using deprecated cryptography APIs that will be removed in future versions.

### 3. Database Consistency

**Important:** All storage now uses the `EDUDATA` database consistently:
- GridFS file storage: `EDUDATA` database
- Metadata collection: `EDUDATA` database
- User collections: `EDUDATA` database

**Files to check if you see "file not found in GridFS" errors:**
- `backend/storage.py` - should use `MongoDB.get_fs('EDUDATA')`
- `backend/view_file.py` - should use `MongoDB.get_fs('EDUDATA')`
- `backend/dataextraction.py` - should use `MongoDB.get_fs('EDUDATA')`
- `backend/RAG.py` - should use `MongoDB.get_fs('EDUDATA')`
- `app.py` - should use `MongoDB.get_fs('EDUDATA')`

### 4. Clean Installation Process

If you encounter dependency conflicts after pulling changes:

```bash
# 1. Remove lock file
rm poetry.lock

# 2. Generate new lock file
poetry lock

# 3. Install dependencies
poetry install

# 4. Test the application
poetry run flask run
```

### 5. Frontend Compliance Summary

The compliance summary now uses access-aware lookup instead of direct file_id:
- Frontend sends: `{file_name, user_id}`
- Backend resolves the correct `file_id` using user access permissions
- This prevents "file not found" errors due to access control

## For New Team Members

1. **First Setup:**
   ```bash
   git clone <repo>
   cd SIH2025-25080
   poetry install
   poetry run flask run
   ```

2. **If you get import errors:**
   - Follow the clean installation process above
   - Check this troubleshooting guide
   - Ask team members who have it working

3. **Before committing dependency changes:**
   - Test that `poetry run flask run` works
   - Test that frontend can connect to backend
   - Test file upload and viewing functionality

## Dependencies Overview

Key packages and their purposes:
- `pdfminer.six`: PDF text extraction
- `camelot-py[cv]`: Table extraction from PDFs  
- `paddleocr`: OCR for scanned documents
- `pymupdf`: PDF processing fallback
- `gridfs`: MongoDB file storage
- `flask-cors`: Cross-origin requests

**Last Updated:** September 14, 2025