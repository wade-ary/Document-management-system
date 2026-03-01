'use client';

import React, { useState } from 'react';
import { Card, CardBody, Button, Avatar, Chip } from '@nextui-org/react';
import { Reply, Edit2, Trash2 } from 'lucide-react';
import type { CommentItemProps } from '@/types/discussions';

export default function CommentItem({
  comment,
  level = 0,
  onReply,
  onEdit,
  onDelete,
  onReact,
  currentUserId,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isOwner = comment.created_by === currentUserId;
  const maxLevel = 3;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString();
    } else if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    }
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit(editContent.trim());
    }
    setIsEditing(false);
  };

  const reactions = comment.reactions || {};
  const reactionEmojis = ['👍', '❤️', '🎯'];

  return (
    <div className={`${level > 0 ? 'ml-8 mt-3' : ''}`}>
      <Card className="shadow-sm">
        <CardBody className="p-4">
          {/* Author and metadata */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar
                name={comment.created_by_name}
                size="sm"
                className="flex-shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-800">
                    {comment.created_by_name}
                  </span>
                  {comment.is_decision && (
                    <Chip size="sm" color="success" variant="flat">
                      Decision
                    </Chip>
                  )}
                  {comment.is_action_item && (
                    <Chip size="sm" color="warning" variant="flat">
                      Action Item
                    </Chip>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {formatTimeAgo(comment.created_at)}
                  {comment.edited && ' (edited)'}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mb-3">
              <textarea
                className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" color="primary" onClick={handleSaveEdit}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 mb-3 whitespace-pre-wrap">
              {comment.content}
            </p>
          )}

          {/* Reactions and actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Reaction buttons */}
              {reactionEmojis.map((emoji) => {
                const count = reactions[emoji]?.length || 0;
                const hasReacted = reactions[emoji]?.includes(currentUserId);

                return (
                  <Button
                    key={emoji}
                    size="sm"
                    variant={hasReacted ? 'flat' : 'light'}
                    color={hasReacted ? 'primary' : 'default'}
                    onClick={() => onReact(emoji)}
                    className="min-w-unit-12 h-7"
                  >
                    <span className="text-base">{emoji}</span>
                    {count > 0 && <span className="text-xs ml-1">{count}</span>}
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center gap-1">
              {level < maxLevel && (
                <Button
                  size="sm"
                  variant="light"
                  startContent={<Reply className="w-3 h-3" />}
                  onClick={onReply}
                  className="text-xs"
                >
                  Reply
                </Button>
              )}
              {isOwner && (
                <>
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    isIconOnly
                    onClick={onDelete}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.comment_id}
              comment={reply}
              level={level + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
