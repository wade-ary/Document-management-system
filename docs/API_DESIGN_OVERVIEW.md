# API Design Overview — KMRL Document Management System

This document summarizes the API design, how it strengthens the system, fallback strategies, impact on user experience, libraries in use, and notable implementation details.

---

## 1. API Design at a Glance

- **Style**: REST over HTTP; JSON request/response.
- **Backend**: Flask app with **blueprints** for domains (documents, compliance, sharing, discussions, circulars, agent, external app).
- **Frontend**: Single source of truth in `frontend/src/config/api.ts` — all endpoints and base URLs are defined there; UI code imports `API_ENDPOINTS` and optional helpers like `buildApiUrl`.
- **Conventions**:
  - Success: `{ "message": "...", "data": {...}, "status": 200 }` (or endpoint-specific payloads).
  - Errors: `{ "error": "...", "details": "...", "code": 4xx/5xx }`.
  - Global **HTTP exception handler** converts Werkzeug HTTP errors to JSON (code, name, description), so clients always get JSON instead of HTML error pages.

---

## 2. What Makes the Design Strong

| Aspect | How it helps |
|--------|----------------|
| **Centralized API config** | One place (`api.ts`) for base URL and all paths; env-based dev/prod and easy switching (e.g. production default `https://sih-25254-8xgca.ondigitalocean.app`). |
| **Blueprint modularity** | Domains (documents, compliance, sharing, discussions, circulars, agent, external) are isolated; easier to maintain, test, and scale. |
| **Consistent error handling** | Global `@app.errorhandler(HTTPException)` plus per-route `try/except` with `jsonify({"error": ..., "details": ...})` and proper status codes (400, 404, 401, 500). |
| **Explicit validation** | Endpoints validate required fields (e.g. `user_id`, `file_id`, `path`) and return 400 with clear messages instead of failing later. |
| **CORS** | Configured for all origins and common methods/headers so the Next.js frontend can call the Flask backend from different origins/ports. |
| **Role- and department-aware APIs** | Endpoints like `POST /listdir`, `POST /listdir/department/<user_id>`, `POST /listdir/<user_id>`, and `POST /listdir/department-files` enforce access by user/department. |
| **Approval workflows** | Request/approve/reject flows for upload and delete (`/req/upload`, `/req/delete`, `/admin/upload/approve`, etc.) keep governance and auditability. |
| **Structured search** | `ExtensiveSearchRequest`-style params (searchText, fileType, peopleNames, customTags, dateRange) support rich, filterable search from the UI. |

---

## 3. Fallbacks and Resilience

Fallbacks are used so that partial failures don’t break the whole flow and the UX degrades gracefully.

| Area | Primary path | Fallback(s) |
|------|--------------|-------------|
| **Search** | Semantic (embeddings) + TF-IDF + BM25 hybrid. | If no semantic results, **text-based fallback**: expand to all documents in cache and score with lexical methods (`backend/search.py`: “No semantic results found, using text-based search fallback”). |
| **Search engine init** | `init_search_engine()` at startup. | On exception, log and **continue without search**; app still runs, search features may be disabled. |
| **Translation** | Google Translate (or primary provider). | **MyMemory API** as fallback (`backend/utils/translation.py`); chunking for long text. |
| **Document extraction / Ask-file** | Use pre-extracted text from metadata. | If missing: **PDF** → PyPDF2 `extract_text`; empty pages → **fitz (PyMuPDF) + image + OCR (e.g. OpenAI vision)**; **text/JSON** → `extract_text_from_file`. Length capped (e.g. 5000 chars) with truncation message. |
| **Email** | SendGrid for upload/compliance notifications. | Notifications are **queued** (`email_task_queue`); a **background worker** consumes the queue. If SendGrid or task fails, worker logs and continues; no blocking of upload or compliance flows. Email service init can be no-op (e.g. in test), so app runs without email. |
| **Admin actions (uploader email)** | Resolve from metadata / actions. | **Fallback chain**: metadata → actions → users collection → “final fallback: keep action.email if present” so admin views still get a best-effort email. |
| **Webhook ingest (filename)** | Use provided attachment filename. | **ensure_filename**: if missing or `"0"`, use `attachment.<fallback_type>`; if no extension, append allowed extension (e.g. `pdf`); validates against allowed list so ingest always has a safe filename. |
| **Realtime chat intent** | Backend intent analysis. | Frontend **fallback intent** when backend is unavailable or fails (`useRealtimeChat.ts`). |
| **Compliance API** | Real user and stats. | **Fallback user ID** for testing; **default stats** when no items; optional mock data for dev. |

These ensure that search, translation, extraction, notifications, and admin features either work with a degraded mode or fail gracefully without taking down the app.

---

## 4. How the API Improves User Experience

- **Single config, no scattered URLs**  
  All UI code uses `API_ENDPOINTS` and optional `buildApiUrl`. Changing backend host or path is done in one file; typo and env mistakes are reduced.

- **Environment-aware base URL**  
  `NEXT_PUBLIC_API_BASE_URL` or `NODE_ENV === 'production'` with production default lets the same frontend build work in dev and prod without code changes.

- **Predictable error handling**  
  JSON errors with `error` (and often `details`) allow the UI to show toast or inline messages (e.g. “Failed to fetch data from the agent. Please try again.”) instead of generic failures.

- **Loading and toasts**  
  Components use loading state during requests and `toast.promise` (e.g. upload, redacted upload) for pending/success/error, so users get clear feedback.

- **Proxied / same-origin friendly**  
  Some features (e.g. agent chat) use relative or same-origin URLs so they work behind a single host or reverse proxy.

- **Access-aware listing**  
  Department- and user-specific list endpoints mean users see only what they’re allowed to see, reducing clutter and confusion.

- **Approval and compliance flows**  
  Request/approve/reject and compliance APIs support governance and notifications, so the UX can guide users through controlled workflows.

---

## 5. Libraries and Stack

**Backend (Flask app)**  
- **Flask** — routing, request/response, blueprints.  
- **flask-cors** — CORS.  
- **Werkzeug** — HTTP exceptions, `FileStorage`, request handling.  
- **PyMongo / MongoDB** — persistence; GridFS for file binaries.  
- **SendGrid** — transactional email (optional; queue + worker still run if SendGrid is unavailable).  
- **Other backend** — e.g. `requests` (MyMemory, external APIs), PDF/text libraries (PyMuPDF/fitz, PyPDF2, etc.), OCR and table extraction stacks as in the rest of the codebase.

**Frontend (Next.js)**  
- **Native `fetch`** for API calls (no axios); consistent with Next.js and modern browsers.  
- **react-hot-toast** (and similar) for success/error toasts.  
- **Next.js 15**, **React 18**, **TypeScript**; **NextUI**, **Tailwind**, **Recharts**, **Framer Motion**, **Zustand**, etc. for UI and state.

**Config**  
- **Environment variables**: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_EXTERNAL_API_BASE_URL`, `NODE_ENV`; backend uses `MONGO_URI`, `SENDGRID_API_KEY`, `CLERK_AUTH_TOKEN`, `DEVELOPMENT_MODE`, etc.

---

## 6. Interesting Implementation Details

- **Background email queue**  
  Upload and compliance notifications are put in a queue and processed by a dedicated thread. Upload and compliance responses return immediately; emails are sent asynchronously, improving perceived performance and isolating email failures.

- **Hybrid search pipeline**  
  Search combines semantic (embeddings), TF-IDF, and BM25; when semantic results are empty, it falls back to the full document set with lexical scoring so users still get results.

- **Multi-step extraction for “Ask file”**  
  Pre-extracted text → PyPDF2 → fitz + OCR per page → generic `extract_text_from_file` for other types, with length limits and truncation messaging so answers stay within context limits.

- **Bilingual and translation fallback**  
  Translation is designed for English/Malayalam with automatic detection and MyMemory as fallback when the primary provider fails.

- **Webhook ingest**  
  Single webhook endpoint accepts multipart or JSON (including base64 attachments), normalizes booleans and filenames with `ensure_filename`, and reuses the same upload pipeline as the main upload flow for consistency.

- **External API access**  
  Registration and approval flows (`/external/register_app`, `/admin/api_access/approve`, etc.) allow third-party apps to use the API in a controlled way.

- **Agent and chat APIs**  
  Dedicated agent and realtime chat endpoints (e.g. `/api/agent/chat`, `/api/chat/realtime`) support conversational and document-grounded use cases with session and context handling.

- **Compliance and discussions**  
  Dedicated compliance (dashboard, upload, alerts, stats, notifications) and discussions (threads, comments, reactions, summaries, search) APIs support governance and collaboration without overloading core document endpoints.

---

## 7. Summary

The API is built for clarity (REST, JSON, one config), resilience (search, translation, extraction, email, and admin fallbacks), and control (validation, CORS, error handler, role/department and approval flows). Centralized config and consistent errors improve frontend UX; background email and fallbacks keep the system stable under partial failures. The same design supports both internal users and external API consumers with clear boundaries and documentation (see `.cursor/rules/api-endpoints.mdc` for the endpoint reference).
