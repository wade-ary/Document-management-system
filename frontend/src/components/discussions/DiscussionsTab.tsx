'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button, Card, CardBody, Tabs, Tab, Chip, Spinner } from '@nextui-org/react';
import { MessageCircle, Plus, Pin } from 'lucide-react';
import { API_ENDPOINTS } from '@/config/api';
import type { 
  DiscussionThread, 
  ThreadStatus, 
  DiscussionsTabProps,
  ThreadsResponse,
  ThreadResponse 
} from '@/types/discussions';
import ThreadViewer from './ThreadViewer';
import ThreadList from './ThreadList';
import CreateThreadModal from './CreateThreadModal';


export default function DiscussionsTab({ fileId, fileName }: DiscussionsTabProps) {
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
    console.log('🔍 Discussions Tab - User Info:', {
      isLoaded,
      isSignedIn,
      userId: user?.id,
      userName: user?.fullName,
      userEmail: user?.primaryEmailAddress?.emailAddress
    });
  }, [user, isLoaded, isSignedIn]);
  
  // State
  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<DiscussionThread | null>(null);
  const [showThreadViewer, setShowThreadViewer] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'resolved' | 'archived'>('all');

  // Fetch threads for this document
  const fetchThreads = useCallback(async (status?: ThreadStatus) => {
    setLoading(true);
    try {
      const url = status 
        ? `${API_ENDPOINTS.DISCUSSIONS_GET_THREADS_BY_DOC(fileId)}?status=${status}`
        : API_ENDPOINTS.DISCUSSIONS_GET_THREADS_BY_DOC(fileId);

      const response = await fetch(url, {
        headers: {
          'X-User-ID': user?.id || 'anonymous',
          'X-User-Name': getUserName(),
        },
      });

      const data: ThreadsResponse = await response.json();

      if (data.success && data.threads) {
        setThreads(data.threads);
      } else {
        console.error('Failed to fetch threads:', data.message);
        setThreads([]);
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [fileId, user?.id, getUserName]);

  // Initial load
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Handle tab change
  const handleTabChange = (key: string) => {
    const tab = key as 'all' | 'active' | 'resolved' | 'archived';
    setActiveTab(tab);
    
    if (tab === 'all') {
      fetchThreads();
    } else {
      fetchThreads(tab);
    }
  };

  // Handle thread selection
  const handleSelectThread = (thread: DiscussionThread) => {
    setSelectedThread(thread);
    setShowThreadViewer(true);
  };

  // Handle thread creation
  const handleCreateThread = async (title: string, initialComment: string, tags: string[]) => {
    try {
      const response = await fetch(API_ENDPOINTS.DISCUSSIONS_CREATE_THREAD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user?.id || 'anonymous',
          'X-User-Name': getUserName(),
        },
        body: JSON.stringify({
          title,
          linked_documents: [{ file_id: fileId, file_name: fileName }],
          tags,
          initial_comment: initialComment,
        }),
      });

      const data: ThreadResponse = await response.json();

      if (data.success && data.thread) {
        // Refresh threads
        fetchThreads(activeTab === 'all' ? undefined : activeTab);
        setShowCreateModal(false);
        
        // Open the new thread
        setSelectedThread(data.thread);
        setShowThreadViewer(true);
      } else {
        console.error('Failed to create thread:', data.message);
      }
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  };

  // Handle pin thread
  const handlePinThread = async (threadId: string, isPinned: boolean) => {
    try {
      const response = await fetch(API_ENDPOINTS.DISCUSSIONS_PIN_THREAD(threadId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user?.id || 'anonymous',
        },
        body: JSON.stringify({ is_pinned: isPinned, file_id: fileId }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh threads
        fetchThreads(activeTab === 'all' ? undefined : activeTab);
      } else {
        console.error('Failed to pin thread:', data.message);
      }
    } catch (error) {
      console.error('Error pinning thread:', error);
    }
  };

  // Handle delete thread
  const handleDeleteThread = async (threadId: string) => {
    if (!confirm('Are you sure you want to delete this thread? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.DISCUSSIONS_DELETE_THREAD(threadId), {
        method: 'DELETE',
        headers: {
          'X-User-ID': user?.id || 'anonymous',
        },
      });

      const data = await response.json();

      if (data.success) {
        // Refresh threads
        fetchThreads(activeTab === 'all' ? undefined : activeTab);
        
        // Close viewer if deleted thread was selected
        if (selectedThread?.thread_id === threadId) {
          setShowThreadViewer(false);
          setSelectedThread(null);
        }
      } else {
        console.error('Failed to delete thread:', data.message);
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  };

  // Close thread viewer
  const handleCloseThreadViewer = () => {
    setShowThreadViewer(false);
    setSelectedThread(null);
    // Refresh threads to get updated counts
    fetchThreads(activeTab === 'all' ? undefined : activeTab);
  };

  // Separate pinned and regular threads
  const pinnedThreads = threads.filter(t => t.is_pinned);
  const regularThreads = threads.filter(t => !t.is_pinned);

  if (showThreadViewer && selectedThread) {
    return (
      <ThreadViewer
        thread={selectedThread}
        onClose={handleCloseThreadViewer}
        onUpdateStatus={() => {
          // Status update is handled in ThreadViewer
        }}
        onLinkDocument={() => {
          // Document linking handled in ThreadViewer
        }}
        onUnlinkDocument={() => {
          // Document unlinking handled in ThreadViewer
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-800">Discussions</h3>
        </div>
        
        <Button
          color="primary"
          size="sm"
          startContent={<Plus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          New Discussion
        </Button>
      </div>

      {/* Pinned Threads Section */}
      {pinnedThreads.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Pin className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-slate-700">Pinned Discussions</span>
          </div>
          <ThreadList
            threads={pinnedThreads}
            onSelectThread={handleSelectThread}
            onPinThread={handlePinThread}
            onDeleteThread={handleDeleteThread}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => handleTabChange(key as string)}
        variant="underlined"
        color="primary"
        className="mb-4"
      >
        <Tab
          key="all"
          title={
            <div className="flex items-center gap-2">
              <span>All</span>
              <Chip size="sm" variant="flat">{threads.length}</Chip>
            </div>
          }
        />
        <Tab
          key="active"
          title={
            <div className="flex items-center gap-2">
              <span>Active</span>
              <Chip size="sm" variant="flat" color="success">
                {threads.filter(t => t.status === 'active').length}
              </Chip>
            </div>
          }
        />
        <Tab
          key="resolved"
          title={
            <div className="flex items-center gap-2">
              <span>Resolved</span>
              <Chip size="sm" variant="flat" color="primary">
                {threads.filter(t => t.status === 'resolved').length}
              </Chip>
            </div>
          }
        />
        <Tab
          key="archived"
          title={
            <div className="flex items-center gap-2">
              <span>Archived</span>
              <Chip size="sm" variant="flat" color="default">
                {threads.filter(t => t.status === 'archived').length}
              </Chip>
            </div>
          }
        />
      </Tabs>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" color="primary" />
          </div>
        ) : regularThreads.length === 0 ? (
          <Card className="bg-slate-50">
            <CardBody className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 font-medium mb-2">No discussions yet</p>
              <p className="text-sm text-slate-500 mb-4">
                Start a conversation about this document
              </p>
              <Button
                color="primary"
                variant="flat"
                startContent={<Plus className="w-4 h-4" />}
                onClick={() => setShowCreateModal(true)}
              >
                Create First Discussion
              </Button>
            </CardBody>
          </Card>
        ) : (
          <ThreadList
            threads={regularThreads}
            onSelectThread={handleSelectThread}
            onPinThread={handlePinThread}
            onDeleteThread={handleDeleteThread}
          />
        )}
      </div>

      {/* Create Thread Modal */}
      {showCreateModal && (
        <CreateThreadModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateThread}
          documentName={fileName}
        />
      )}
    </div>
  );
}
