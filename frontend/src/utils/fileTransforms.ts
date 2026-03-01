import { File } from '../app/types';

export interface BackendFile {
  name: string;
  type: string;
  tags?: string[];
  path: string;
  file_id: string;
  user_id?: string;
  department?: string;
  access_to?: string;
  deadline?: string;
  uploaded_by?: string;
  upload_date?: string;
  dept_summaries?: Record<string, unknown>;
  dept_action_points?: Record<string, unknown>;
}

export interface CategorizedFiles {
  uploaded_by_user: BackendFile[];
  uploaded_by_department: BackendFile[];
  accessible_to_user: BackendFile[];
}

export function transformBackendFileToFrontend(backendFile: BackendFile): File {
  return {
    fileId: backendFile.file_id,
    fileName: backendFile.name,
    filePath: backendFile.path || undefined,
    isDirectory: backendFile.name.endsWith("/"),
    isApproved: true, // Assuming files from backend are approved
    status: null,
    uploadStatus: "uploaded",
    uploadDate: backendFile.upload_date ? new Date(backendFile.upload_date) : new Date(),
    userId: backendFile.user_id || "",
    fileSize: 0, // Backend doesn't provide this in listing
    fileType: "", // Backend doesn't provide this in listing
    tags: backendFile.tags || [],
    originalPath: backendFile.path || "",
    // Optional fields with defaults
    contentSummary: null,
    sensitiveInfoDetected: false,
    redactedVersionAvailable: false,
    importantPhrases: null,
    embeddings: null,
    viewCount: 0,
    lastAccessed: null,
    lastAccessedBy: null,
    processingStatus: "completed",
    redactedVersion: false,
    complianceScore: null,
    redactedPath: null,
    fileViews: null,
  };
}

export function transformCategorizedFiles(categorized: CategorizedFiles) {
  return {
    uploaded_by_user: categorized.uploaded_by_user.map(transformBackendFileToFrontend),
    uploaded_by_department: categorized.uploaded_by_department.map(transformBackendFileToFrontend),
    accessible_to_user: categorized.accessible_to_user.map(transformBackendFileToFrontend),
  };
}

// Utility function to check if response is categorized format
export function isCategorizedResponse(response: unknown): response is CategorizedFiles {
  return (
    typeof response === 'object' &&
    response !== null &&
    'uploaded_by_user' in response &&
    'uploaded_by_department' in response &&
    'accessible_to_user' in response
  );
}