import React, { useState, useEffect } from 'react';
import { Input, Chip, Spinner } from '@nextui-org/react';
import { Search, X, User, Users } from 'lucide-react';
import { UserOption, RoleOption, ShareRecipient } from '@/types/sharing';
import { API_ENDPOINTS } from '@/config/api';

interface UserRoleSelectorProps {
  selectedRecipients: ShareRecipient[];
  onRecipientsChange: (recipients: ShareRecipient[]) => void;
}

const UserRoleSelector: React.FC<UserRoleSelectorProps> = ({
  selectedRecipients,
  onRecipientsChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    users: UserOption[];
    roles: RoleOption[];
  }>({ users: [], roles: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults({ users: [], roles: [] });
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      setShowResults(true);

      try {
        const response = await fetch(
          `${API_ENDPOINTS.SHARE_USERS_SEARCH}?q=${encodeURIComponent(searchQuery)}`
        );
        const data = await response.json();

        if (data.success) {
          setSearchResults({
            users: data.users || [],
            roles: data.roles || []
          });
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleAddUser = (user: UserOption) => {
    const newRecipient: ShareRecipient = {
      type: 'user',
      identifier: user.id,
      name: user.name,
      permission: 'view' // Default permission, can be changed later
    };

    // Check if already selected
    const exists = selectedRecipients.some(
      r => r.type === 'user' && r.identifier === user.id
    );

    if (!exists) {
      onRecipientsChange([...selectedRecipients, newRecipient]);
    }

    setSearchQuery('');
    setShowResults(false);
  };

  const handleAddRole = (role: RoleOption) => {
    const newRecipient: ShareRecipient = {
      type: 'role',
      identifier: role.id,
      name: role.name,
      permission: 'view'
    };

    // Check if already selected
    const exists = selectedRecipients.some(
      r => r.type === 'role' && r.identifier === role.id
    );

    if (!exists) {
      onRecipientsChange([...selectedRecipients, newRecipient]);
    }

    setSearchQuery('');
    setShowResults(false);
  };

  const handleRemoveRecipient = (index: number) => {
    const updated = selectedRecipients.filter((_, i) => i !== index);
    onRecipientsChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Input
          placeholder="Search users or select roles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
          startContent={
            isSearching ? (
              <Spinner size="sm" />
            ) : (
              <Search className="w-4 h-4 text-emerald-600" />
            )
          }
          classNames={{
            input: "bg-white",
            inputWrapper: "border-2 border-emerald-200 hover:border-emerald-400 rounded-xl"
          }}
        />

        {/* Search Results Dropdown */}
        {showResults && (searchResults.users.length > 0 || searchResults.roles.length > 0) && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
            {/* Users Section */}
            {searchResults.users.length > 0 && (
              <div className="p-2">
                <p className="text-xs font-semibold text-slate-600 px-2 mb-1">Users</p>
                {searchResults.users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleAddUser(user)}
                    className="w-full px-3 py-2 hover:bg-blue-50 rounded-lg text-left flex items-center gap-2 transition-colors"
                  >
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    
                      <Chip size="sm" variant="flat" color="default">
                        {user.accountType}
                      </Chip>
                      {user.department && (
                        <Chip size="sm" variant="flat" color="default" >
                          {user.department}
                        </Chip>
                      )}
                    
                  </button>
                ))}
              </div>
            )}
            
            {/* Roles Section */}
            {searchResults.roles.length > 0 && (
              <div className="p-2">
                <p className="text-xs font-semibold text-slate-600 px-2 mb-1">Roles</p>
                {searchResults.roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleAddRole(role)}
                    className="w-full px-3 py-2 hover:bg-purple-50 rounded-lg text-left flex items-center gap-2 transition-colors"
                  >
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                      <Users className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{role.name}</p>
                      {role.description && (
                        <p className="text-xs text-slate-500">{role.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            
          </div>
        )}
      </div>

      {/* Selected Recipients */}
      {selectedRecipients.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-emerald-800">Selected Recipients:</p>
          <div className="flex flex-wrap gap-2">
            {selectedRecipients.map((recipient, index) => (
              <Chip
                key={index}
                variant="flat"
                color={recipient.type === 'user' ? 'primary' : 'secondary'}
                onClose={() => handleRemoveRecipient(index)}
                startContent={
                  recipient.type === 'user' ? (
                    <User className="w-3 h-3" />
                  ) : (
                    <Users className="w-3 h-3" />
                  )
                }
                endContent={
                  <button
                    onClick={() => handleRemoveRecipient(index)}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                }
              >
                {recipient.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* No recipients selected state */}
      {selectedRecipients.length === 0 && (
        <div className="text-center py-4 text-slate-500 text-sm">
          Search and select users or roles to share with
        </div>
      )}
    </div>
  );
};

export default UserRoleSelector;
