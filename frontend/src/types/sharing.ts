// Sharing types and interfaces for document sharing feature

export type SharePermission = 'view' | 'comment' | 'edit';

export type ShareRecipientType = 'user' | 'role';

export interface ShareRecipient {
  type: ShareRecipientType;
  identifier: string; // user_id or role name
  name: string; // Display name
  permission: SharePermission;
}

export interface Share {
  _id: string;
  file_id: string;
  file_name: string;
  shared_by: string;
  shared_by_name?: string;
  shared_with: ShareRecipient[];
  share_token: string;
  has_password: boolean;
  expiration_date?: string;
  created_at: string;
  updated_at: string;
  revoked: boolean;
  revoked_at?: string;
  access_count: number;
  last_accessed?: string;
  message?: string;
}

export interface ShareCreateRequest {
  file_id: string;
  file_name: string;
  shared_with: Array<{
    type: ShareRecipientType;
    identifier: string;
    name: string;
  }>;
  permission: SharePermission;
  expiration_date?: string;
  password?: string;
  message?: string;
}

export interface ShareBatchRequest {
  file_ids: string[];
  shared_with: Array<{
    type: ShareRecipientType;
    identifier: string;
    name: string;
  }>;
  permission: SharePermission;
  expiration_date?: string;
  password?: string;
  message?: string;
}

export interface ShareUpdateRequest {
  permission?: SharePermission;
  expiration_date?: string;
  password?: string;
}

export interface ShareLinkVerifyRequest {
  share_token: string;
  password?: string;
}

export interface ShareActivity {
  _id: string;
  share_id: string;
  file_id: string;
  user_id: string;
  user_name?: string;
  action: 'accessed' | 'downloaded' | 'commented' | 'edited';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface UserOption {
  id: string;
  name: string;
  email: string;
  accountType: string;
  department?: string;
}

export interface RoleOption {
  id: string;
  name: string;
  description?: string;
}
