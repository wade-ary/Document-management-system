// API Configuration — only endpoints used by Query page, Precedent Finder, and Compliance dashboard

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://sih-25254-8xgca.ondigitalocean.app"
    : "http://127.0.0.1:5000");

export const API_ENDPOINTS = {
  // Query + retrieval
  QUERY: `${API_BASE_URL}/api/query`,
  BLURB: `${API_BASE_URL}/api/blurb`,
  PRECEDENTS: `${API_BASE_URL}/api/precedents`,

  // Compliance dashboard
  COMPLIANCE_DASHBOARD: `${API_BASE_URL}/api/compliance/dashboard`,
  COMPLIANCE_UPLOAD: `${API_BASE_URL}/api/compliance/upload`,

  // File (for viewing / listing if needed)
  VIEW_FILE: `${API_BASE_URL}/view_file`,
  LIST_DIR: `${API_BASE_URL}/listdir`,
  UPLOAD: `${API_BASE_URL}/upload`,
} as const;

export { API_BASE_URL as default };
