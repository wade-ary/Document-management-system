/* eslint-disable @typescript-eslint/no-explicit-any */
export interface File {
  fileId: string; // Required
  fileName: string; // Required
  filePath: string | undefined; // Required
  isDirectory: boolean; // Required
  isApproved: boolean; // Required
  status: "pending" | "failed" | "analyzing" | "analyzed" | null;
  uploadStatus: "pending" | "uploaded" | "deleted" | null;
  uploadDate: Date; // Required
  userId: string; // Required
  fileSize: number; // Required
  fileType: string; // Required
  contentSummary?: string | null; // Optional, can be null
  sensitiveInfoDetected?: boolean; // Optional, default is false
  redactedVersionAvailable?: boolean; // Optional, default is false
  tags?: string[] | null; // Optional, can be null
  importantPhrases?: string[] | null; // Optional, can be null
  embeddings?: string | null; // Optional, can be null
  viewCount?: number; // Optional, default is 0
  lastAccessed?: Date | null; // Optional, can be null
  lastAccessedBy?: string | null; // Optional, can be null
  processingStatus?: "pending" | "completed"; // Optional, default is "pending"
  originalPath: string; // Required
  redactedVersion?: boolean; // Optional, default is false
  complianceScore?: number | null; // Optional, must be between 0 and 100, can be null
  redactedPath?: string | null; // Optional, can be null
  fileViews?: Record<string, any>[] | null; // Optional, can be null
  // Additional metadata properties
  size?: number; // File size in bytes
  department?: string; // Department that owns/uploaded the file
  uploadedBy?: string; // User who uploaded the file
  deadline?: string | Date | null; // Deadline for the file
  relevanceScore?: number; // Relevance score for search results (0-100)
};

export interface Action {
  _id: string; // Required
  action: string; // Required
  action_id: string; // Required
  email: string; // Required
  file_id: string; // Required
  file_name: string; // Required
  file_path: string; // Required
  status: string; // Required
  timestamp: string; // Required
  user_id: string; // Required
  username: string; // Required
  isRedacted: boolean;
  account_type: string;
  department: string;
  access_to: string;
  // Optional deadline ISO string (e.g. '2025-09-30')
  deadline?: string | null;
  // Enriched uploader fields populated by /admin/actions
  uploader_email?: string | null;
  uploaded_by_department?: string | null;
}