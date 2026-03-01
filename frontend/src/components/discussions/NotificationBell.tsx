'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Badge,
  Button,
  Chip,
  Spinner,
} from '@nextui-org/react';
import { Bell, Check, CheckCheck, MessageCircle, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS } from '@/config/api';
import { useRouter } from 'next/navigation';

interface Notification {
  _id: string;
  user_id: string;
  thread_id: string;
  comment_id?: string;
  type: 'mention' | 'reply' | 'status_change' | 'new_thread';
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
}

interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
  total: number;
  unread: number;
}

export default function NotificationBell() {
  const { user } = useUser();
  const router = useRouter();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.DISCUSSIONS_GET_NOTIFICATIONS, {
        headers: {
          'X-User-ID': user.id,
        },
      });

      const data: NotificationsResponse = await response.json();

      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch on mount and when opening
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id, fetchNotifications]);

  // Refresh when opening
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        API_ENDPOINTS.DISCUSSIONS_MARK_NOTIFICATION_READ(notificationId),
        {
          method: 'PATCH',
          headers: {
            'X-User-ID': user.id,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setNotifications(prev =>
          prev.map(n => (n._id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(API_ENDPOINTS.DISCUSSIONS_MARK_ALL_READ, {
        method: 'POST',
        headers: {
          'X-User-ID': user.id,
        },
      });

      const data = await response.json();

      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    // Navigate to the discussion
    // You'll need to implement navigation to the specific thread/comment
    if (notification.action_url) {
      router.push(notification.action_url);
    }

    setIsOpen(false);
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <MessageCircle className="w-4 h-4 text-blue-600" />;
      case 'reply':
        return <MessageCircle className="w-4 h-4 text-green-600" />;
      case 'status_change':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'new_thread':
        return <MessageCircle className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <Popover 
      placement="bottom-end" 
      isOpen={isOpen} 
      onOpenChange={setIsOpen}
      classNames={{
        content: 'p-0',
      }}
    >
      <PopoverTrigger>
        <Button
          isIconOnly
          variant="light"
          className="relative"
          aria-label="Notifications"
        >
          {unreadCount > 0 ? (
            <Badge
              content={unreadCount > 99 ? '99+' : unreadCount}
              color="danger"
              placement="top-right"
              size="sm"
              classNames={{
                badge: 'min-w-[18px] h-[18px]',
              }}
            >
              <Bell className="w-5 h-5" />
            </Badge>
          ) : (
            <Bell className="w-5 h-5" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96">
        <div className="w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <h3 className="font-semibold text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <Chip size="sm" color="danger" variant="flat">
                  {unreadCount} new
                </Chip>
              )}
            </div>
            
            {notifications.length > 0 && (
              <Button
                size="sm"
                variant="light"
                onClick={markAllAsRead}
                startContent={<CheckCheck className="w-4 h-4" />}
              >
                Mark all read
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[500px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <Spinner size="sm" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-8">
                <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 text-sm">No notifications yet</p>
                <p className="text-slate-400 text-xs mt-1">
                  You&apos;ll be notified when someone mentions you or replies to your comments
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`mt-1 p-2 rounded-full ${
                        !notification.read ? 'bg-blue-100' : 'bg-slate-100'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${
                          !notification.read ? 'font-semibold text-slate-900' : 'text-slate-700'
                        }`}>
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                        </div>
                      </div>

                      {/* Mark as read button */}
                      {!notification.read && (
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification._id);
                          }}
                          aria-label="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-200 text-center">
              <Button
                size="sm"
                variant="light"
                className="text-blue-600"
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to notifications page if you have one
                  // router.push('/notifications');
                }}
              >
                View all notifications
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
