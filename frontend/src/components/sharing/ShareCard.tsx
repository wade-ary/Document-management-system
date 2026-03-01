import React, { useState } from 'react';
import { Button, Chip, Tooltip } from '@nextui-org/react';
import { Copy, Clock, Eye, Lock, Users, User, Edit2, Trash2, Shield } from 'lucide-react';
import { Share, SharePermission } from '@/types/sharing';
import { toast } from 'react-toastify';

interface ShareCardProps {
  share: Share;
  onRevoke: (shareId: string) => void;
  onUpdate?: (shareId: string, updates: { permission?: SharePermission; expiration_date?: string }) => void;
  onCopyLink?: (shareToken: string) => void;
}

const ShareCard: React.FC<ShareCardProps> = ({ share, onRevoke, onCopyLink }) => {
  const [isRevoking, setIsRevoking] = useState(false);

  const getPermissionColor = (permission: SharePermission) => {
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

  const getPermissionIcon = (permission: SharePermission) => {
    switch (permission) {
      case 'view':
        return <Eye className="w-3 h-3" />;
      case 'comment':
        return <Edit2 className="w-3 h-3" />;
      case 'edit':
        return <Shield className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const handleCopyLink = () => {
    if (share.share_token) {
      if (onCopyLink) {
        onCopyLink(share.share_token);
      } else {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/share/${share.share_token}`;
        navigator.clipboard.writeText(link);
        toast.success('Share link copied to clipboard!');
      }
    }
  };

  const handleRevoke = async () => {
    if (window.confirm('Are you sure you want to revoke this share? The link will no longer work.')) {
      setIsRevoking(true);
      try {
        await onRevoke(share._id);
        toast.success('Share revoked successfully');
      } catch {
        toast.error('Failed to revoke share');
      } finally {
        setIsRevoking(false);
      }
    }
  };

  const isExpired = () => {
    if (!share.expiration_date) return false;
    return new Date(share.expiration_date) < new Date();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRecipientDisplay = () => {
    if (share.shared_with.length === 0) return null;

    const firstRecipient = share.shared_with[0];
    const hasMore = share.shared_with.length > 1;

    return (
      <div className="flex items-center gap-2">
        {firstRecipient.type === 'user' ? (
          <User className="w-4 h-4 text-blue-600" />
        ) : (
          <Users className="w-4 h-4 text-purple-600" />
        )}
        <span className="font-medium text-slate-800">
          {firstRecipient.name}
        </span>
        {hasMore && (
          <Chip size="sm" variant="flat" color="default">
            +{share.shared_with.length - 1} more
          </Chip>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl border-2 p-4 transition-all duration-200 ${
      share.revoked || isExpired()
        ? 'border-slate-200 opacity-60'
        : 'border-emerald-200 hover:border-emerald-400 hover:shadow-lg'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {getRecipientDisplay()}
          
          {/* Permission Badge */}
          <div className="mt-2 flex items-center gap-2">
            <Chip
              size="sm"
              color={getPermissionColor(share.shared_with[0]?.permission || 'view')}
              startContent={getPermissionIcon(share.shared_with[0]?.permission || 'view')}
              variant="flat"
              className="font-semibold"
            >
              {share.shared_with[0]?.permission.charAt(0).toUpperCase() + share.shared_with[0]?.permission.slice(1)}
            </Chip>

            {share.has_password && (
              <Tooltip content="Password protected">
                <Chip size="sm" variant="flat" color="secondary" startContent={<Lock className="w-3 h-3" />}>
                  Protected
                </Chip>
              </Tooltip>
            )}

            {share.revoked && (
              <Chip size="sm" variant="flat" color="danger">
                Revoked
              </Chip>
            )}

            {isExpired() && !share.revoked && (
              <Chip size="sm" variant="flat" color="warning">
                Expired
              </Chip>
            )}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-2 text-xs text-slate-600 mb-3">
        {/* Expiration */}
        {share.expiration_date && (
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>
              {isExpired() ? 'Expired' : 'Expires'}: {formatDate(share.expiration_date)}
            </span>
          </div>
        )}

        {!share.expiration_date && (
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>No expiration</span>
          </div>
        )}

        {/* Access Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{share.access_count} views</span>
          </div>
          
          {share.last_accessed && (
            <div>
              Last accessed: {formatDate(share.last_accessed)}
            </div>
          )}
        </div>

        {/* Created Date */}
        <div className="text-slate-500">
          Created: {formatDate(share.created_at)}
        </div>
      </div>

      {/* Message if present */}
      {share.message && (
        <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-200">
          <p className="text-xs text-blue-800 italic">&ldquo;{share.message}&rdquo;</p>
        </div>
      )}

      {/* All Recipients */}
      {share.shared_with.length > 1 && (
        <div className="mb-3 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs font-semibold text-slate-700 mb-2">All Recipients:</p>
          <div className="flex flex-wrap gap-1">
            {share.shared_with.map((recipient, idx) => (
              <Chip
                key={idx}
                size="sm"
                variant="flat"
                startContent={
                  recipient.type === 'user' ? (
                    <User className="w-3 h-3" />
                  ) : (
                    <Users className="w-3 h-3" />
                  )
                }
              >
                {recipient.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-slate-200">
        <Button
          size="sm"
          variant="flat"
          color="primary"
          startContent={<Copy className="w-3 h-3" />}
          onClick={handleCopyLink}
          className="flex-1"
          isDisabled={share.revoked || isExpired()}
        >
          Copy Link
        </Button>

        {!share.revoked && !isExpired() && (
          <Button
            size="sm"
            variant="flat"
            color="danger"
            startContent={<Trash2 className="w-3 h-3" />}
            onClick={handleRevoke}
            isLoading={isRevoking}
          >
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
};

export default ShareCard;
