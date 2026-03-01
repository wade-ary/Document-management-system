'use client';

import React from 'react';
import { Card, CardBody, Chip, Button } from '@nextui-org/react';
import { MessageCircle, Pin, Trash2, Clock, User, Link as LinkIcon } from 'lucide-react';
import type { ThreadCardProps } from '@/types/discussions';

export default function ThreadCard({ thread, onClick, onPin, onDelete }: ThreadCardProps) {
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

  return (
    <Card
      className={`hover:shadow-md transition-all cursor-pointer ${thread.is_pinned ? 'bg-amber-50 border border-amber-200' : ''}`}
    >
      <CardBody className="p-4" onClick={onClick}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title and status */}
            <div className="flex items-center gap-2 mb-2">
              {thread.is_pinned && <Pin className="w-4 h-4 text-amber-600 flex-shrink-0" />}
              <h4 className="font-semibold text-slate-800 truncate">{thread.title}</h4>
              <Chip size="sm" color={getStatusColor()} variant="flat">
                {thread.status}
              </Chip>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-slate-600 mb-2">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{thread.created_by_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                <span>{thread.metadata.total_comments} comments</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatTimeAgo(thread.metadata.last_activity)}</span>
              </div>
              {thread.linked_documents.length > 1 && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  <span>{thread.linked_documents.length} docs</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {thread.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {thread.tags.map((tag, idx) => (
                  <Chip key={idx} size="sm" variant="bordered" className="text-xs">
                    {tag}
                  </Chip>
                ))}
              </div>
            )}

            {/* Participants count */}
            {thread.participants.length > 1 && (
              <div className="mt-2 text-xs text-slate-500">
                {thread.participants.length} participants
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {onPin && (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onClick={(e) => {
                  e.stopPropagation();
                  onPin(!thread.is_pinned);
                }}
              >
                <Pin className={`w-4 h-4 ${thread.is_pinned ? 'fill-current text-amber-600' : ''}`} />
              </Button>
            )}
            {onDelete && (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
