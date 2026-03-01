import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from "@nextui-org/react";
import { API_ENDPOINTS } from '@/config/api';

interface MentionUser {
  id: string;
  username: string;
  email: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  onMentionsChange?: (mentions: string[]) => void;
}

export default function MentionTextarea({
  value,
  onChange,
  placeholder = 'Add a comment...',
  minRows = 3,
  maxRows = 8,
  onMentionsChange,
}: MentionTextareaProps) {
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<MentionUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch real users from database on mount
  useEffect(() => {
    fetch(`${API_ENDPOINTS.DISCUSSIONS_SEARCH_USERS}?limit=50`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.users) {
          // Map backend user format to frontend format
          const users = data.users.map((u: { user_id: string; username: string; email: string }) => ({
            id: u.user_id,
            username: u.username,
            email: u.email,
          }));
          setAvailableUsers(users);
        }
      })
      .catch(err => console.error('Failed to fetch users:', err));
  }, []);

  // Detect @ mention typing
  useEffect(() => {
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex === -1) {
      setShowMentionDropdown(false);
      return;
    }

    // Check if @ is at start or after a space
    const charBefore = lastAtIndex > 0 ? value[lastAtIndex - 1] : ' ';
    if (charBefore !== ' ' && charBefore !== '\n' && lastAtIndex !== 0) {
      setShowMentionDropdown(false);
      return;
    }

    // Get text after @
    const textAfterAt = value.slice(lastAtIndex + 1);
    const spaceIndex = textAfterAt.search(/\s/);
    const searchTerm = spaceIndex === -1 ? textAfterAt : textAfterAt.slice(0, spaceIndex);

    // Only show dropdown if search term is reasonable length
    if (searchTerm.length <= 20 && !searchTerm.includes('@')) {
      // Filter users
      const filtered = availableUsers.filter(
        u => u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
             u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      setShowMentionDropdown(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowMentionDropdown(false);
    }
  }, [value, availableUsers]);

  // Get filtered users for display
  const getFilteredUsers = () => {
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex === -1) return [];

    const textAfterAt = value.slice(lastAtIndex + 1);
    const spaceIndex = textAfterAt.search(/\s/);
    const searchTerm = spaceIndex === -1 ? textAfterAt : textAfterAt.slice(0, spaceIndex);

    return availableUsers.filter(
      u => u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
           u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Handle user selection
  const selectUser = (username: string) => {
    const lastAtIndex = value.lastIndexOf('@');
    const textBefore = value.slice(0, lastAtIndex + 1);
    const textAfter = value.slice(lastAtIndex + 1);
    const spaceIndex = textAfter.search(/\s/);
    const afterMention = spaceIndex === -1 ? '' : textAfter.slice(spaceIndex);

    const newValue = `${textBefore}${username} ${afterMention}`;
    onChange(newValue);
    setShowMentionDropdown(false);

    // Extract all mentions and notify parent
    if (onMentionsChange) {
      const mentions: string[] = [];
      const mentionPattern = /@(\w+)/g;
      let match;
      while ((match = mentionPattern.exec(newValue)) !== null) {
        mentions.push(match[1]);
      }
      onMentionsChange(mentions);
    }

    // Focus back on textarea
    textareaRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMentionDropdown) return;

    const filteredUsers = getFilteredUsers();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
    } else if (e.key === 'Enter' && filteredUsers.length > 0) {
      e.preventDefault();
      selectUser(filteredUsers[selectedIndex].username);
    } else if (e.key === 'Escape') {
      setShowMentionDropdown(false);
    }
  };

  const filteredUsers = getFilteredUsers();

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        minRows={minRows}
        maxRows={maxRows}
        size="lg"
        classNames={{
          input: 'font-mono text-sm', // Makes @ mentions more visible
        }}
      />

      {/* Mention Dropdown */}
      {showMentionDropdown && filteredUsers.length > 0 && (
        <div className="absolute z-50 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              onClick={() => selectUser(user.username)}
              className={`w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                {user.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">@{user.username}</div>
                {user.email && (
                  <div className="text-xs text-slate-500">{user.email}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Helper text */}
      <div className="mt-1 text-xs text-slate-500">
        💡 Type <code className="px-1 py-0.5 bg-slate-100 rounded">@</code> to mention someone
      </div>
    </div>
  );
}
