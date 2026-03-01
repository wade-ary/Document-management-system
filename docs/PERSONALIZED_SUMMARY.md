# Personalized Role‑Based Document Summaries — Design for TransformoDocs (KMRL)

## Goal
Provide concise, role‑tailored summaries of documents and trends to users, scoped to the fixed KMRL departments:
- safety, hr, finance, engineering, procurement, legal

Summaries must be actionable, respect access controls, be lightweight (token cost control), and usable in dashboard and file‑level workflows already present in the codebase.

---

## Quick mapping to your codebase
- Entry points / reference files:
  - `app.py` — Flask routes; add endpoints (`/personalized-summary`, `/dashboard-insights/:user_id`).
  - `backend/new_extract.py` — text extraction; use `extract_text_from_file` and precomputed `extracted_text`.
  - `backend/compliance_summary.py` — reuse `analyze_document` to include compliance context.
  - `backend/department_utils.py` — use `get_documents_by_departments`, `get_department_summary`, `get_cross_department_documents`.
  - `backend/users.py` — obtain user profile, role, and department.
  - `metadata_collection` in MongoDB (see `app.py`) — contains file metadata, tags, extracted_text, upload_time, file_id.
  - Frontend components: `frontend/src/components/PersonalizedSummary.tsx` (conceptual) and dashboard to display summaries.
- Departments (fixed): `allowed_categories = ["safety", "hr", "finance", "engineering", "procurement", "legal"]` (place of truth in `app.py`).

---

## High‑level flow
1. User requests summary (dashboard or explicit).
2. Backend validates user and retrieves role/department from `user_collection`.
3. Backend collects relevant documents from `metadata_collection` using `department_utils` and role‑based filters.
4. For each document, reuse `extracted_text` or short excerpt from `backend/new_extract.py` outputs.
5. Construct a role‑specific prompt (see templates below). Limit docs/excerpts to reduce tokens.
6. Call existing OpenAI wrapper (`generate_openai` or equivalent) to generate structured summary.
7. Post‑process: redact PII if required (use `backend/redaction.py`), attach source doc references (IDs, filenames), cache summary for TTL.
8. Return structured JSON to frontend for rendering.

---

## Document selection policy
- Time window: user chooses day | week | month | quarter.
- Role scoping:
  - CEO: all departments (aggregate).
  - Manager: own department + subordinate departments (use department hierarchy in `department_utils`).
  - Dept specialists (HR, Finance, Safety, Procurement, Legal): documents with department == role department or tagged relevant.
  - Employee: assigned files or same‑department only.
- Privacy & Sensitivity:
  - Check metadata `access_to`, `important`, `isRedacted`.
  - Redact or exclude documents flagged as sensitive for a role without clearance (use `check_sensitive_data_in_file` + `redact_pii_in_pdf`).
- Limits:
  - Max N documents (e.g., 10 most relevant).
  - Prefer newest documents and those with compliance flags or frequent access.

---

## Prompt strategy and templates (conceptual)
- General rules for prompt construction:
  - Provide short structured context per document: filename, department, upload_date, 200–500 char excerpt, tags, compliance flags.
  - Ask for output in JSON with named sections (Summary, KeyFindings, Risks, Actions, Sources). This simplifies frontend rendering.
  - Include a maximum token/length instruction (e.g., < 300 words or 6 bullets).
  - Instruct model to avoid inventing facts — tether claims to source filenames or “no claim” if not present.

- CEO template (focus: strategy + cross‑department trends)
  - Sections: Executive Summary (top 3), Cross‑Dept Trends, Financial Signals, Compliance Flags, Top Risks, Actions for Execs, Sources.

- Manager template (focus: operations + team)
  - Sections: Department Overview, Project Status, Performance Metrics, Compliance Issues, Resource Needs, Actions for Manager, Sources.

- HR template (focus: people + policy)
  - Sections: Hires & Openings, Policy Changes, Training Needs, Compliance & Legal Flags, HR Action Items, Sources.

- Finance template (focus: budgets + audits)
  - Sections: Budget Variance, Expense Alerts, Audit Signals, Cost‑Saving Opportunities, Actions, Sources.

- Safety template (focus: incidents + compliance)
  - Sections: Incident Summary, Severity & Trends, Root Causes, Controls Recommended, Regulatory Flags, Actions, Sources.

- Legal / Procurement templates: contract risks, compliance, procurement approvals, vendor issues.

- Employee template (focus: task/actionable)
  - Sections: Personal Documents, Assigned Tasks, Announcements, Actions for You, Sources.

---

## Response JSON shape (recommended, conceptual)
- `summary`: string (plaintext or HTML)
- `sections`: [{ title, bullets: [..], details? }]
- `sources`: [{ file_id, filename, department, excerpt }]
- `generated_at`: ISO timestamp
- `role`: user role
- `department`: user department
- `time_period`: selection

This maps cleanly to a frontend component and supports "View sources" drilldowns.

---

## Caching and performance
- Cache per (user_id, role, time_period) with TTL (e.g., 30–60 minutes).
- Provide “Light” vs “Detailed” modes:
  - Light: 1–3 bullets, cheaper tokens.
  - Detailed: 6–8 bullets + short paragraphs.
- Token control:
  - Always send only excerpts (<= 500 characters) for older/large docs.
  - For crucial docs (recent or flagged), include full extracted_text but cap overall token input.

---

## Security & privacy
- Enforce RBAC on backend:
  - Use `user_collection` role and department.
  - Filter `metadata_collection` queries server‑side — never trust frontend inputs.
- PII handling:
  - If `check_sensitive_data_in_file` flags PII and role lacks clearance, redact excerpts before sending to LLM.
- Logging and audit:
  - Store `actions_collection` or separate `summary_requests` with: user_id, role, time_period, doc_ids included, timestamp.

---

## UI / UX guidelines
- Dashboard widget with:
  - Header: “Personalized Summary — [Role] • [Department]”
  - Time period selector, Light/Detailed toggle, Regenerate button
  - Display: short bullets + “Show sources” expand
  - Each source links to viewer; clicking opens file viewer modal (current `FileViewer.tsx`) while enforcing role‑based visibility
- Show “Last generated at” and a small token/cost estimate optionally for admins.

---


## Metrics & observability
- Usage: summaries per day by role
- Cost: avg tokens per summary
- Quality: thumbs up/down rate, correction rate, user feedback
- Security: number of redactions performed, unauthorized access attempts

---

## Next steps (recommended)
1. Implement server endpoint `/personalized-summary` in `app.py` to accept `user_id` and `time_period`.
2. Build `backend/personalized_summary.py` which:
   - Uses `user_collection` (role/department),
   - Reuses `department_utils` and `new_extract` for doc selection and excerpts,
   - Calls existing OpenAI wrapper (`generate_openai`) with structured prompts.
3. Add `summary_requests` audit log collection.
4. Add frontend `PersonalizedSummary` component (dashboard).
5. Start with “Light” mode and conservative prompt; iterate after feedback.

---

_Last updated: generated by the design assistant for the TransformoDocs project._
