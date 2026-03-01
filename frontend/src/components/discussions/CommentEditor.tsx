'use client';

import React, { useState } from 'react';
import { Button, Checkbox } from '@nextui-org/react';
import { Send, X } from 'lucide-react';
import type { CommentEditorProps } from '@/types/discussions';
import MentionTextarea from './MentionTextarea';


export default function CommentEditor({
  parentCommentId,
  onSubmit,
  onCancel,
  placeholder = 'Add a comment...',
}: CommentEditorProps) {
  const [content, setContent] = useState('');
  const [isDecision, setIsDecision] = useState(false);
  const [isActionItem, setIsActionItem] = useState(false);

  const handleSubmit = () => {
    if (!content.trim()) return;

    // Extract ALL mentions from content (both autocomplete and manually typed)
    const allMentions: string[] = [];
    const mentionPattern = /@(\w+)/g;
    let match;
    while ((match = mentionPattern.exec(content)) !== null) {
      allMentions.push(match[1]);
    }

    // Use the extracted mentions (prioritize manual extraction to catch all)
    onSubmit(content.trim(), allMentions, isDecision, isActionItem);

    // Reset
    setContent('');
    setIsDecision(false);
    setIsActionItem(false);
  };

  return (
    <div className="space-y-3">
      <MentionTextarea
        placeholder={placeholder}
        value={content}
        onChange={setContent}
        minRows={parentCommentId ? 2 : 3}
        maxRows={8}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Checkbox
            size="sm"
            isSelected={isDecision}
            onValueChange={setIsDecision}
          >
            Mark as Decision
          </Checkbox>
          <Checkbox
            size="sm"
            isSelected={isActionItem}
            onValueChange={setIsActionItem}
          >
            Mark as Action Item
          </Checkbox>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              size="sm"
              variant="flat"
              startContent={<X className="w-4 h-4" />}
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            color="primary"
            startContent={<Send className="w-4 h-4" />}
            onClick={handleSubmit}
            isDisabled={!content.trim()}
          >
            {parentCommentId ? 'Reply' : 'Comment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
