/**
 * Discussion Threads Type Definitions
 * TypeScript interfaces for threaded discussions feature
 */

// ==================== THREAD TYPES ====================

export type ThreadStatus = 'active' | 'resolved' | 'archived';

export interface LinkedDocument {
  file_id: string;
  file_name: string;
  linked_at: string;
  linked_by: string;
}

export interface Attachment {
  file_path: string;
  file_name: string;
  file_type: string;
  uploaded_by?: string;
  uploaded_at?: string;
}

export interface ActionItem {
  item: string;
  assigned_to: string;
  due_date?: string;
  status: 'pending' | 'completed';
}

export interface ThreadSummary {
  auto_generated: string | null;
  last_updated: string | null;
  decisions: string[];
  action_items: ActionItem[];
}

export interface ThreadMetadata {
  total_comments: number;
  last_activity: string;
  view_count: number;
}

export interface DiscussionThread {
  _id: string;
  thread_id: string;
  title: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  status: ThreadStatus;
  linked_documents: LinkedDocument[];
  participants: string[];
  is_pinned: boolean;
  tags: string[];
  attachments: Attachment[];
  summary: ThreadSummary;
  metadata: ThreadMetadata;
}

// ==================== COMMENT TYPES ====================

export interface CommentReactions {
  [emoji: string]: string[]; // emoji -> array of user IDs
}

export interface Comment {
  _id: string;
  comment_id: string;
  thread_id: string;
  parent_comment_id: string | null;
  content: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  edited: boolean;
  mentions: string[];
  reactions: CommentReactions;
  attachments: Attachment[];
  is_decision: boolean;
  is_action_item: boolean;
  nested_replies: string[];
  replies?: Comment[]; // For tree structure
}

// ==================== NOTIFICATION TYPES ====================

export type NotificationType = 'mention' | 'reply' | 'status_change' | 'new_thread';

export interface Notification {
  _id: string;
  user_id: string;
  thread_id: string;
  comment_id?: string;
  type: NotificationType;
  message: string;
  read: boolean;
  created_at: string;
  action_url: string;
}

// ==================== REQUEST/RESPONSE TYPES ====================

export interface CreateThreadRequest {
  title: string;
  linked_documents?: LinkedDocument[];
  tags?: string[];
  initial_comment?: string;
}

export interface UpdateThreadRequest {
  title?: string;
  tags?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface UpdateThreadStatusRequest {
  status: ThreadStatus;
}

export interface PinThreadRequest {
  is_pinned: boolean;
  file_id?: string;
}

export interface LinkDocumentRequest {
  file_id: string;
  file_name: string;
}

export interface UnlinkDocumentRequest {
  file_id: string;
}

export interface CreateCommentRequest {
  thread_id: string;
  content: string;
  parent_comment_id?: string;
  mentions?: string[];
  attachments?: Attachment[];
  is_decision?: boolean;
  is_action_item?: boolean;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface AddReactionRequest {
  emoji: string;
}

// ==================== FILTER & SEARCH TYPES ====================

export interface ThreadFilters {
  status?: ThreadStatus;
  user_id?: string;
  skip?: number;
  limit?: number;
}

export interface SearchQuery {
  q: string;
  type?: 'threads' | 'comments' | 'all';
  thread_id?: string;
  user_id?: string;
}

export interface SearchResults {
  threads?: DiscussionThread[];
  comments?: Comment[];
}

// ==================== UI STATE TYPES ====================

export interface ThreadsViewState {
  activeTab: 'active' | 'resolved' | 'archived' | 'all';
  selectedThread: DiscussionThread | null;
  showThreadViewer: boolean;
  filters: ThreadFilters;
}

export interface CommentEditorState {
  content: string;
  mentions: string[];
  attachments: Attachment[];
  parent_comment_id: string | null;
  is_decision: boolean;
  is_action_item: boolean;
}

// ==================== USER MENTION TYPES ====================

export interface MentionUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface MentionSuggestion {
  type: 'user';
  data: MentionUser;
}

// ==================== API RESPONSE TYPES ====================

export interface ThreadResponse {
  success: boolean;
  message?: string;
  thread?: DiscussionThread;
}

export interface ThreadsResponse {
  success: boolean;
  message?: string;
  threads?: DiscussionThread[];
  count?: number;
}

export interface CommentResponse {
  success: boolean;
  message?: string;
  comment?: Comment;
}

export interface CommentsResponse {
  success: boolean;
  message?: string;
  comments?: Comment[];
  count?: number;
}

export interface NotificationsResponse {
  success: boolean;
  message?: string;
  notifications?: Notification[];
  unread_count?: number;
}

export interface SummaryResponse {
  success: boolean;
  message?: string;
  summary?: {
    auto_generated: string;
    decisions: string[];
    action_items: ActionItem[];
  };
}

export interface ExtractItemsResponse {
  success: boolean;
  message?: string;
  decisions?: string[];
  action_items?: ActionItem[];
}

export interface SearchResponse {
  success: boolean;
  message?: string;
  results?: SearchResults;
}

export interface GenericResponse {
  success: boolean;
  message: string;
}

// ==================== COMPONENT PROP TYPES ====================

export interface DiscussionsTabProps {
  fileId: string;
  fileName: string;
}

export interface ThreadListProps {
  threads: DiscussionThread[];
  onSelectThread: (thread: DiscussionThread) => void;
  onPinThread: (threadId: string, isPinned: boolean) => void;
  onDeleteThread: (threadId: string) => void;
}

export interface ThreadCardProps {
  thread: DiscussionThread;
  onClick: () => void;
  onPin?: (isPinned: boolean) => void;
  onDelete?: () => void;
}

export interface ThreadViewerProps {
  thread: DiscussionThread;
  onClose: () => void;
  onUpdateStatus: (status: ThreadStatus) => void;
  onLinkDocument: (fileId: string, fileName: string) => void;
  onUnlinkDocument: (fileId: string) => void;
}

export interface CommentTreeProps {
  comments: Comment[];
  onReply: (commentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onReact: (commentId: string, emoji: string) => void;
  currentUserId: string;
}

export interface CommentItemProps {
  comment: Comment;
  level?: number;
  onReply: () => void;
  onEdit: (content: string) => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  currentUserId: string;
}

export interface CommentEditorProps {
  threadId?: string; // Optional - reserved for future use
  parentCommentId?: string;
  onSubmit: (content: string, mentions: string[], isDecision: boolean, isActionItem: boolean) => void;
  onCancel?: () => void;
  placeholder?: string;
}

export interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionSelect: (userId: string) => void;
  placeholder?: string;
}

export interface ThreadStatusBadgeProps {
  status: ThreadStatus;
  size?: 'sm' | 'md' | 'lg';
}

export interface ThreadFiltersProps {
  filters: ThreadFilters;
  onFilterChange: (filters: ThreadFilters) => void;
}

export interface ThreadSummaryPanelProps {
  summary: ThreadSummary;
  onRegenerateSummary: () => void;
  isLoading?: boolean;
}

export interface ActionItemsListProps {
  actionItems: ActionItem[];
  onUpdateItem: (index: number, updates: Partial<ActionItem>) => void;
}

export interface NotificationBellProps {
  userId: string;
}

export interface PinnedThreadsProps {
  threads: DiscussionThread[];
  onSelectThread: (thread: DiscussionThread) => void;
}
