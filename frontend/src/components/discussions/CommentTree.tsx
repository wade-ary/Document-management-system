'use client';

import React from 'react';
import type { CommentTreeProps } from '@/types/discussions';
import CommentItem from './CommentItem';


export default function CommentTree({
  comments,
  onReply,
  onEdit,
  onDelete,
  onReact,
  currentUserId,
}: CommentTreeProps) {
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem
          key={comment.comment_id}
          comment={comment}
          level={0}
          onReply={() => onReply(comment.comment_id)}
          onEdit={(content: string) => onEdit(comment.comment_id, content)}
          onDelete={() => onDelete(comment.comment_id)}
          onReact={(emoji: string) => onReact(comment.comment_id, emoji)}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}
