'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button, Card, CardBody, CardHeader, Input, Spinner, Chip } from '@nextui-org/react';
import { Lock, AlertCircle, CheckCircle, Clock, User, Eye, Edit2, MessageSquare, FileText, Calendar } from 'lucide-react';
import FileViewer from '@/components/FileViewer';
import { API_ENDPOINTS } from '@/config/api';

interface ShareData {
  _id: string;
  file_id: string;
  file_name: string;
  file_path?: string; // Added file path from backend
  shared_by: string;
  shared_by_name?: string;
  shared_with: Array<{
    type: 'user' | 'role';
    identifier: string;
    name: string;
    permission: 'view' | 'comment' | 'edit';
  }>;
  share_token: string;
  has_password: boolean;
  expiration_date?: string;
  created_at: string;
  revoked: boolean;
  access_count: number;
  last_accessed?: string;
  message?: string;
}

export default function ShareLinkPage() {
  const params = useParams();
  const token = params.token as string;
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [filePath, setFilePath] = useState('');

  // Fetch share data on mount
  useEffect(() => {
    if (token) {
      fetchShareData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchShareData = async (pwd?: string) => {
    setLoading(true);
    setError(null);
    setPasswordError('');

    try {
      const url = pwd 
        ? `${API_ENDPOINTS.SHARE_LINK(token)}?password=${encodeURIComponent(pwd)}`
        : API_ENDPOINTS.SHARE_LINK(token);

      const response = await fetch(url, {
        headers: {
          'X-User-ID': user?.id || 'anonymous',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShareData(data.share);
        setRequiresPassword(false);
        
        // Set file path directly from share response
        if (data.share.file_path) {
          setFilePath(data.share.file_path);
        } else {
          console.error('No file path in share response');
          setError('Unable to locate file');
        }
      } else {
        if (response.status === 401 && data.requires_password) {
          setRequiresPassword(true);
          setError(null);
        } else {
          setError(data.message || 'Failed to access share link');
          setRequiresPassword(false);
        }
      }
    } catch (err) {
      console.error('Error fetching share data:', err);
      setError('An error occurred while accessing the share link');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setPasswordError('Please enter a password');
      return;
    }

    setVerifying(true);
    setPasswordError('');

    try {
      const response = await fetch(API_ENDPOINTS.SHARE_VERIFY_LINK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user?.id || 'anonymous',
        },
        body: JSON.stringify({
          share_token: token,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShareData(data.share);
        setRequiresPassword(false);
        setError(null);
        
        // Set file path directly from share response
        if (data.share.file_path) {
          setFilePath(data.share.file_path);
        } else {
          console.error('No file path in share response');
          setError('Unable to locate file');
        }
      } else {
        setPasswordError(data.message || 'Invalid password');
      }
    } catch (err) {
      console.error('Error verifying password:', err);
      setPasswordError('An error occurred. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'view':
        return <Eye className="w-4 h-4" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4" />;
      case 'edit':
        return <Edit2 className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'view':
        return 'primary';
      case 'comment':
        return 'warning';
      case 'edit':
        return 'success';
      default:
        return 'default';
    }
  };

  const isExpired = (expirationDate?: string) => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardBody className="flex flex-col items-center gap-4 py-12">
            <Spinner size="lg" color="primary" />
            <p className="text-slate-600 font-medium">Loading shared document...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Password required state
  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="flex flex-col items-center gap-2 pb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Password Protected</h1>
            <p className="text-sm text-slate-600 text-center">
              This document requires a password to access
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                label="Password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                isInvalid={!!passwordError}
                errorMessage={passwordError}
                startContent={<Lock className="w-4 h-4 text-slate-400" />}
                size="lg"
              />
              <Button
                type="submit"
                color="primary"
                size="lg"
                className="w-full"
                isLoading={verifying}
              >
                {verifying ? 'Verifying...' : 'Access Document'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardBody className="flex flex-col items-center gap-4 py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Access Denied</h1>
            <p className="text-slate-600 text-center">{error}</p>
            <Button
              color="primary"
              variant="flat"
              onClick={() => window.location.href = '/'}
            >
              Go to Home
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Check if share is expired or revoked
  if (shareData) {
    if (shareData.revoked) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardBody className="flex flex-col items-center gap-4 py-12">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Link Revoked</h1>
              <p className="text-slate-600 text-center">
                This share link has been revoked by the owner and is no longer accessible.
              </p>
            </CardBody>
          </Card>
        </div>
      );
    }

    if (isExpired(shareData.expiration_date)) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardBody className="flex flex-col items-center gap-4 py-12">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Link Expired</h1>
              <p className="text-slate-600 text-center">
                This share link expired on {formatDate(shareData.expiration_date!)}
              </p>
            </CardBody>
          </Card>
        </div>
      );
    }
  }

  // Success - Display the shared document
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header with share info */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">{shareData?.file_name}</h1>
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <User className="w-3 h-3" />
                  Shared by {shareData?.shared_by_name || 'Unknown'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {shareData?.shared_with.map((recipient, idx) => (
                <Chip
                  key={idx}
                  color={getPermissionColor(recipient.permission) as "primary" | "warning" | "success" | "default"}
                  variant="flat"
                  startContent={getPermissionIcon(recipient.permission)}
                  size="sm"
                >
                  {recipient.permission.charAt(0).toUpperCase() + recipient.permission.slice(1)} Access
                </Chip>
              ))}
              
              {shareData?.expiration_date && (
                <Chip
                  color="warning"
                  variant="flat"
                  startContent={<Calendar className="w-3 h-3" />}
                  size="sm"
                >
                  Expires {new Date(shareData.expiration_date).toLocaleDateString()}
                </Chip>
              )}
            </div>
          </div>

          {/* Message from sharer */}
          {shareData?.message && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Message:</strong> {shareData.message}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* File Viewer */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Card className="shadow-lg">
          <CardBody className="p-0">
            {filePath && shareData ? (
              <div className="min-h-[600px] min-w-full">
                <FileViewer 
                  filePath={filePath}
                  fileName={shareData.file_name}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-500">Unable to load document</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Share metadata */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardBody className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Shared On</p>
                <p className="text-sm font-semibold text-slate-800">
                  {shareData ? formatDate(shareData.created_at) : 'N/A'}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Views</p>
                <p className="text-sm font-semibold text-slate-800">
                  {shareData?.access_count || 0}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Last Accessed</p>
                <p className="text-sm font-semibold text-slate-800">
                  {shareData?.last_accessed ? formatDate(shareData.last_accessed) : 'Never'}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}