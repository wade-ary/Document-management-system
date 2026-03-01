'use client';

import React from 'react';
import type { ThreadListProps } from '@/types/discussions';
import ThreadCard from './ThreadCard';


export default function ThreadList({ 
  threads, 
  onSelectThread, 
  onPinThread, 
  onDeleteThread 
}: ThreadListProps) {
  return (
    <div className="space-y-2">
      {threads.map((thread) => (
        <ThreadCard
          key={thread.thread_id}
          thread={thread}
          onClick={() => onSelectThread(thread)}
          onPin={onPinThread ? (isPinned: boolean) => onPinThread(thread.thread_id, isPinned) : undefined}
          onDelete={onDeleteThread ? () => onDeleteThread(thread.thread_id) : undefined}
        />
      ))}
    </div>
  );
}
