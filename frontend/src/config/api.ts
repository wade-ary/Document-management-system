// API Configuration — only the six document API endpoints

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://sih-25254-8xgca.ondigitalocean.app"
    : "http://127.0.0.1:5000");

export const API_ENDPOINTS = {
  // Standard ingestion pipeline for docs
  INGEST: `${API_BASE_URL}/api/ingest`,

  // Retrieval using a query
  QUERY_SEARCH: `${API_BASE_URL}/api/query_search`,

  // Document precedent finder — query using a doc
  DOC_SEARCH: `${API_BASE_URL}/api/doc_search`,

  // Retrieve docs using hard filters in metadata
  RETRIEVE_HARD_FILTERS: `${API_BASE_URL}/api/retrieve_hard_filters`,

  // Update anything about the doc
  UPDATE: `${API_BASE_URL}/api/update`,

  // Delete a doc from all places
  DELETE: `${API_BASE_URL}/api/delete`,
} as const;

export { API_BASE_URL as default };
