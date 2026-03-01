'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Button,
  Card,
  CardBody,
  Chip,
  Spinner,
  Select,
  SelectItem,
} from '@nextui-org/react';
import { ArrowLeft, Pin, Link as LinkIcon, AlertCircle, Sparkles } from 'lucide-react';
import { API_ENDPOINTS } from '@/config/api';
import type {
  ThreadViewerProps,
  Comment,
  ThreadStatus,
  CommentsResponse,
  SummaryResponse,
} from '@/types/discussions';
import CommentTree from './CommentTree';
import CommentEditor from './CommentEditor';
import ThreadSummaryPanel from './ThreadSummaryPanel';

export default function ThreadViewer({
  thread,
  onClose,
}: ThreadViewerProps) {
  const { user, isLoaded, isSignedIn } = useUser();

  // Helper function to get user's display name (username only)
  const getUserName = useCallback(() => {
    if (!user) return 'Anonymous';
    
    // Only use username
    if (user.username) return user.username;
    
    // Fallback to email username if no username is set
    if (user.primaryEmailAddress?.emailAddress) {
      return user.primaryEmailAddress.emailAddress.split('@')[0];
    }
    
    return 'Anonymous';
  }, [user]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 Thread Viewer - User Info:', {
      isLoaded,
      isSignedIn,
      userId: user?.id,
      fullName: user?.fullName,
      firstName: user?.firstName,
      lastName: user?.lastName,
      username: user?.username,
      primaryEmail: user?.primaryEmailAddress?.emailAddress,
      // Log entire user object to see all available properties
      allUserKeys: user ? Object.keys(user) : [],
      // Test our helper function
      computedName: getUserName()
    });
  }, [user, isLoaded, isSignedIn, getUserName]);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [summary, setSummary] = useState(thread.summary);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const response = await fetch(
        `${API_ENDPOINTS.DISCUSSIONS_GET_COMMENTS(thread.thread_id)}?tree=true`,
        {
          headers: {
            'X-User-ID': user?.id || 'anonymous',
          },
        }
      );

      const data: CommentsResponse = await response.json();

      if (data.success && data.comments) {
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [thread.thread_id, user?.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Update status
  const handleUpdateStatus = async (newStatus: ThreadStatus) => {
    try {
      const response = await fetch(
        API_ENDPOINTS.DISCUSSIONS_UPDATE_THREAD_STATUS(thread.thread_id),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user?.id || 'anonymous',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (data.success) {
        thread.status = newStatus;
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Add comment
  const handleAddComment = async (
    content: string,
    mentions: string[],
    isDecision: boolean,
    isActionItem: boolean
  ) => {
    try {
      const response = await fetch(API_ENDPOINTS.DISCUSSIONS_CREATE_COMMENT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user?.id || 'anonymous',
          'X-User-Name': getUserName(),
        },
        body: JSON.stringify({
          thread_id: thread.thread_id,
          content,
          parent_comment_id: replyingTo,
          mentions,
          is_decision: isDecision,
          is_action_item: isActionItem,
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchComments();
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Edit comment
  const handleEditComment = async (commentId: string, content: string) => {
    try {
      const response = await fetch(
        API_ENDPOINTS.DISCUSSIONS_UPDATE_COMMENT(commentId),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user?.id || 'anonymous',
          },
          body: JSON.stringify({ content }),
        }
      );

      const data = await response.json();

      if (data.success) {
        fetchComments();
      }
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        API_ENDPOINTS.DISCUSSIONS_DELETE_COMMENT(commentId),
        {
          method: 'DELETE',
          headers: {
            'X-User-ID': user?.id || 'anonymous',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        fetchComments();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Add reaction
  const handleAddReaction = async (commentId: string, emoji: string) => {
    try {
      const response = await fetch(
        API_ENDPOINTS.DISCUSSIONS_ADD_REACTION(commentId),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user?.id || 'anonymous',
          },
          body: JSON.stringify({ emoji }),
        }
      );

      const data = await response.json();

      if (data.success) {
        fetchComments();
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Generate summary
  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const response = await fetch(
        API_ENDPOINTS.DISCUSSIONS_GENERATE_SUMMARY(thread.thread_id),
        {
          method: 'POST',
          headers: {
            'X-User-ID': user?.id || 'anonymous',
          },
        }
      );

      const data: SummaryResponse = await response.json();

      if (data.success && data.summary) {
        setSummary({
          ...data.summary,
          last_updated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const getStatusColor = () => {
    switch (thread.status) {
      case 'active':
        return 'success';
      case 'resolved':
        return 'primary';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onClick={onClose}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              {thread.is_pinned && <Pin className="w-4 h-4 text-amber-600" />}
              <h3 className="text-lg font-semibold text-slate-800">{thread.title}</h3>
            </div>
            <p className="text-sm text-slate-600">
              by {thread.created_by_name} • {thread.metadata.total_comments} comments
            </p>
          </div>
        </div>

        {/* Status selector */}
        <Select
          size="sm"
          selectedKeys={[thread.status]}
          onChange={(e) => handleUpdateStatus(e.target.value as ThreadStatus)}
          className="w-32"
          classNames={{
            trigger: 'h-8',
          }}
        >
          <SelectItem key="active" value="active">Active</SelectItem>
          <SelectItem key="resolved" value="resolved">Resolved</SelectItem>
          <SelectItem key="archived" value="archived">Archived</SelectItem>
        </Select>
      </div>

      {/* Status and meta info */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Chip size="sm" color={getStatusColor()} variant="flat">
          {thread.status}
        </Chip>
        {thread.linked_documents.length > 0 && (
          <Chip size="sm" variant="bordered" startContent={<LinkIcon className="w-3 h-3" />}>
            {thread.linked_documents.length} linked docs
          </Chip>
        )}
        {thread.tags.map((tag, idx) => (
          <Chip key={idx} size="sm" variant="bordered">
            {tag}
          </Chip>
        ))}
      </div>

      {/* AI Summary Panel */}
      {(summary.auto_generated || comments.length > 3) && (
        <div className="mb-4">
          <ThreadSummaryPanel
            summary={summary}
            onRegenerateSummary={handleGenerateSummary}
            isLoading={generatingSummary}
          />
        </div>
      )}

      {/* Generate Summary Button (if no summary yet) */}
      {!summary.auto_generated && comments.length > 3 && (
        <Card className="mb-4 bg-blue-50 border border-blue-200">
          <CardBody className="flex flex-row items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">AI Summary Available</p>
                <p className="text-sm text-blue-700">
                  Get a summary of this discussion with key decisions and action items
                </p>
              </div>
            </div>
            <Button
              color="primary"
              variant="flat"
              onClick={handleGenerateSummary}
              isLoading={generatingSummary}
            >
              Generate Summary
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Comments Section */}
      <div className="flex-1 overflow-y-auto mb-4">
        {loadingComments ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" color="primary" />
          </div>
        ) : comments.length === 0 ? (
          <Card className="bg-slate-50">
            <CardBody className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No comments yet. Start the conversation!</p>
            </CardBody>
          </Card>
        ) : (
          <CommentTree
            comments={comments}
            onReply={setReplyingTo}
            onEdit={handleEditComment}
            onDelete={handleDeleteComment}
            onReact={handleAddReaction}
            currentUserId={user?.id || ''}
          />
        )}
      </div>

      {/* Comment Editor */}
      <div className="border-t border-slate-200 pt-4">
        <CommentEditor
          threadId={thread.thread_id}
          parentCommentId={replyingTo || undefined}
          onSubmit={handleAddComment}
          onCancel={replyingTo ? () => setReplyingTo(null) : undefined}
          placeholder={
            replyingTo
              ? 'Write your reply...'
              : 'Add a comment to this discussion...'
          }
        />
      </div>
    </div>
  );
}
