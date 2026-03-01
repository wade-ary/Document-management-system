// API Configuration
// This file centralizes all API endpoints and base URLs

// Get API base URL from environment variables with proper fallbacks
// For production builds, use the production API URL from environment
// For development, use the local Flask backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://sih-25254-8xgca.ondigitalocean.app' 
    : 'http://127.0.0.1:5000');

export const EXTERNAL_API_BASE_URL = process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL || API_BASE_URL;

// Main API endpoints
export const API_ENDPOINTS = {
  // File operations
  UPLOAD: `${API_BASE_URL}/upload`,
  VIEW_FILE: `${API_BASE_URL}/view_file`,
  DELETE_REQUEST: `${API_BASE_URL}/req/delete`,
  UPDATE_TAGS: `${API_BASE_URL}/update_tags`,
  GET_METADATA: `${API_BASE_URL}/get-metadata`,
  ANALYZE_FILE: `${API_BASE_URL}/analyze`,
  MOVE_FILES: `${API_BASE_URL}/move`,
  AGENT: `${API_BASE_URL}/agent`,
  AGENT_CHAT: `${API_BASE_URL}/api/agent/chat`,
  AGENT_CONTEXT: `${API_BASE_URL}/api/agent/context`,
  AGENT_CLEAR: `${API_BASE_URL}/api/agent/context/clear`,
  AGENT_ACTIONS: `${API_BASE_URL}/api/agent/actions`,
  ASK_FILE: `${API_BASE_URL}/ask-file`,

  // Directory operations
  LIST_DIR: `${API_BASE_URL}/listdir`,
  
  // AI-powered suggestions
  SUGGEST_DOCUMENT_TYPES: `${API_BASE_URL}/api/suggest-document-types`,
  
  // Compliance operations
  COMPLIANCE_DASHBOARD: `${API_BASE_URL}/api/compliance/dashboard`,
  COMPLIANCE_UPLOAD: `${API_BASE_URL}/api/compliance/upload`,
  COMPLIANCE_ALERTS: `${API_BASE_URL}/api/compliance/alerts`,
  COMPLIANCE_STATS: `${API_BASE_URL}/api/compliance/stats`,
  COMPLIANCE_NOTIFICATIONS: `${API_BASE_URL}/api/compliance/notifications/send`,
  CREATE_DIR: `${API_BASE_URL}/create_dir`,
  LIST_DIR_BY_DEPARTMENT: (userId: string) => `${API_BASE_URL}/listdir/department/${userId}`,
  LIST_DIR_BY_USER: (userId: string) => `${API_BASE_URL}/listdir/${userId}`,
  
  // Search operations
  SEARCH_EXTENSIVE: `${API_BASE_URL}/search/extensive`,
  WEB_SEARCH: `${API_BASE_URL}/api/web-search`,
  
  // Redaction operations
  REDACT: `${API_BASE_URL}/redact`,
  REDACT_TEMP: `${API_BASE_URL}/redact/temp`,
  IS_COMPLIANT: `${API_BASE_URL}/isCompliant`,
  
  // Translation operations
  TRANSLATE: `${API_BASE_URL}/translate`,
  
  // Compliance
  COMPLIANCE_SUMMARY: `${API_BASE_URL}/compliance-summary`,
  
  // Sharing operations
  SHARE_CREATE: `${API_BASE_URL}/api/share/create`,
  SHARE_BATCH: `${API_BASE_URL}/api/share/batch`,
  SHARE_HISTORY: (fileId: string) => `${API_BASE_URL}/api/share/history/${fileId}`,
  SHARE_REVOKE: `${API_BASE_URL}/api/share/revoke`,
  SHARE_LINK: (shareToken: string) => `${API_BASE_URL}/api/share/link/${shareToken}`,
  SHARE_VERIFY_LINK: `${API_BASE_URL}/api/share/verify-link`,
  SHARE_UPDATE: (shareId: string) => `${API_BASE_URL}/api/share/update/${shareId}`,
  SHARE_NOTIFICATIONS: (userId: string) => `${API_BASE_URL}/api/share/notifications/${userId}`,
  SHARE_USERS_SEARCH: `${API_BASE_URL}/api/share/users/search`,
  
  // Discussion operations
  DISCUSSIONS_CREATE_THREAD: `${API_BASE_URL}/api/discussions/threads/create`,
  DISCUSSIONS_GET_THREAD: (threadId: string) => `${API_BASE_URL}/api/discussions/threads/${threadId}`,
  DISCUSSIONS_GET_THREADS: `${API_BASE_URL}/api/discussions/threads`,
  DISCUSSIONS_GET_THREADS_BY_DOC: (fileId: string) => `${API_BASE_URL}/api/discussions/threads/by-document/${fileId}`,
  DISCUSSIONS_UPDATE_THREAD_STATUS: (threadId: string) => `${API_BASE_URL}/api/discussions/threads/${threadId}/status`,
  DISCUSSIONS_UPDATE_THREAD: (threadId: string) => `${API_BASE_URL}/api/discussions/threads/${threadId}`,
  DISCUSSIONS_PIN_THREAD: (threadId: string) => `${API_BASE_URL}/api/discussions/threads/${threadId}/pin`,
  DISCUSSIONS_LINK_DOCUMENT: (threadId: string) => `${API_BASE_URL}/api/discussions/threads/${threadId}/link-document`,
  DISCUSSIONS_UNLINK_DOCUMENT: (threadId: string) => `${API_BASE_URL}/api/discussions/threads/${threadId}/unlink-document`,
  DISCUSSIONS_DELETE_THREAD: (threadId: string) => `${API_BASE_URL}/api/discussions/threads/${threadId}`,
  DISCUSSIONS_CREATE_COMMENT: `${API_BASE_URL}/api/discussions/comments/create`,
  DISCUSSIONS_GET_COMMENTS: (threadId: string) => `${API_BASE_URL}/api/discussions/comments/${threadId}`,
  DISCUSSIONS_UPDATE_COMMENT: (commentId: string) => `${API_BASE_URL}/api/discussions/comments/${commentId}`,
  DISCUSSIONS_DELETE_COMMENT: (commentId: string) => `${API_BASE_URL}/api/discussions/comments/${commentId}`,
  DISCUSSIONS_ADD_REACTION: (commentId: string) => `${API_BASE_URL}/api/discussions/comments/${commentId}/react`,
  DISCUSSIONS_GET_NOTIFICATIONS: `${API_BASE_URL}/api/discussions/notifications`,
  DISCUSSIONS_MARK_NOTIFICATION_READ: (notificationId: string) => `${API_BASE_URL}/api/discussions/notifications/${notificationId}/read`,
  DISCUSSIONS_MARK_ALL_READ: `${API_BASE_URL}/api/discussions/notifications/mark-all-read`,
  DISCUSSIONS_GENERATE_SUMMARY: (threadId: string) => `${API_BASE_URL}/api/discussions/threads/${threadId}/generate-summary`,
  DISCUSSIONS_EXTRACT_ITEMS: (threadId: string) => `${API_BASE_URL}/api/discussions/threads/${threadId}/extract-items`,
  DISCUSSIONS_SEARCH: `${API_BASE_URL}/api/discussions/search`,
  DISCUSSIONS_SEARCH_USERS: `${API_BASE_URL}/api/discussions/users/search`,

  // Circulars (AICTE / MoE)
  CIRCULARS: {
    AICTE: `${API_BASE_URL}/api/circulars/aicte`,
    MOE: `${API_BASE_URL}/api/circulars/moe`,
    NAAC: `${API_BASE_URL}/api/circulars/naac`,
    UGC: `${API_BASE_URL}/api/circulars/ugc`,
    IMPORT: `${API_BASE_URL}/api/circulars/import`,
  },
  
  // Multi-document comparison
  COMPARE_MULTI_DOCS: `${API_BASE_URL}/api/compare-multi-documents`,
  
  // Chat operations
  CHAT: {
    REALTIME_STREAM: `${API_BASE_URL}/api/chat/realtime/stream`,
    REALTIME: `${API_BASE_URL}/api/chat/realtime`,
    REALTIME_INTENT: `${API_BASE_URL}/api/chat/realtime/intent`,
    REALTIME_SESSION: `${API_BASE_URL}/api/chat/realtime/session`,
  },
  
  // Admin operations
  ADMIN: {
    ACTIONS: `${API_BASE_URL}/admin/actions`,
    APPROVE_UPLOAD: `${API_BASE_URL}/admin/upload/approve`,
    REJECT_UPLOAD: `${API_BASE_URL}/admin/upload/reject`,
    APPROVE_DELETE: `${API_BASE_URL}/admin/delete/approve`,
    REJECT_DELETE: `${API_BASE_URL}/admin/delete/reject`,
    API_ACCESS_REQUESTS: `${API_BASE_URL}/admin/api_access/requests`,
    APPROVE_API_ACCESS: `${API_BASE_URL}/admin/api_access/approve`,
    REJECT_API_ACCESS: `${API_BASE_URL}/admin/api_access/reject`,
    COMBINED_SUMMARY: `${API_BASE_URL}/admin/combined-summary`,
  },
  
  // User operations
  SIGNUP: `${API_BASE_URL}/signup`,
  
  // Department operations
  LIST_DIR_DEPARTMENT_FILES: `${API_BASE_URL}/listdir/department-files`,
  API_DOCUMENTS: `${API_BASE_URL}/api/documents`,
} as const;

// External API endpoints (different port/host)
export const EXTERNAL_API_ENDPOINTS = {
  REGISTER_APP: `${EXTERNAL_API_BASE_URL}/external/register_app`,
  API_ACCESS_DETAILS: (clientId: string) => `${EXTERNAL_API_BASE_URL}/external/api_access/details?client_id=${clientId}`,
  KIE_DIRECTORY: `${EXTERNAL_API_BASE_URL}/kie-directory`,
  GENERATE_GRAPH: `${EXTERNAL_API_BASE_URL}/generate-graph`,
  GET_CLIENT_DETAILS: `${EXTERNAL_API_BASE_URL}/get-client-details`,
} as const;

// Helper function to build API URLs dynamically if needed
export const buildApiUrl = (endpoint: string, baseUrl: string = API_BASE_URL): string => {
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

// Export base URLs for direct use if needed
export { API_BASE_URL as default };
