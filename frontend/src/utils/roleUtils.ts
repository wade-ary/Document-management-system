/**
 * Utility functions for handling user roles and ministry types
 */

export interface RoleInfo {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'ministry';
}

export const ROLE_DEFINITIONS: RoleInfo[] = [
  // System Roles
  { id: 'admin', name: 'Admin', description: 'System Administrator', category: 'system' },
  { id: 'manager', name: 'Manager', description: 'Manager', category: 'system' },
  { id: 'staff', name: 'Staff', description: 'Staff Member', category: 'system' },
  
  // Ministry Roles
  { id: 'ministry of education', name: 'Ministry of Education', description: 'Ministry of Education', category: 'ministry' },
  { id: 'ministry of finance', name: 'Ministry of Finance', description: 'Ministry of Finance', category: 'ministry' },
  { id: 'ministry of health & family welfare', name: 'Ministry of Health & Family Welfare', description: 'Ministry of Health & Family Welfare', category: 'ministry' },
  { id: 'ministry of agriculture & farmers welfare', name: 'Ministry of Agriculture & Farmers Welfare', description: 'Ministry of Agriculture & Farmers Welfare', category: 'ministry' },
  { id: 'ministry of defence', name: 'Ministry of Defence', description: 'Ministry of Defence', category: 'ministry' },
  { id: 'ministry of home affairs', name: 'Ministry of Home Affairs', description: 'Ministry of Home Affairs', category: 'ministry' },
  { id: 'ministry of external affairs', name: 'Ministry of External Affairs', description: 'Ministry of External Affairs', category: 'ministry' },
  { id: 'ministry of commerce & industry', name: 'Ministry of Commerce & Industry', description: 'Ministry of Commerce & Industry', category: 'ministry' },
  { id: 'ministry of rural development', name: 'Ministry of Rural Development', description: 'Ministry of Rural Development', category: 'ministry' },
  { id: 'ministry of environment, forest & climate change', name: 'Ministry of Environment, Forest & Climate Change', description: 'Ministry of Environment, Forest & Climate Change', category: 'ministry' },
  { id: 'ministry of road transport & highways', name: 'Ministry of Road Transport & Highways', description: 'Ministry of Road Transport & Highways', category: 'ministry' },
  { id: 'ministry of railways', name: 'Ministry of Railways', description: 'Ministry of Railways', category: 'ministry' },
  { id: 'ministry of labour & employment', name: 'Ministry of Labour & Employment', description: 'Ministry of Labour & Employment', category: 'ministry' },
  { id: 'ministry of women & child development', name: 'Ministry of Women & Child Development', description: 'Ministry of Women & Child Development', category: 'ministry' },
  { id: 'ministry of science & technology', name: 'Ministry of Science & Technology', description: 'Ministry of Science & Technology', category: 'ministry' },
  { id: 'ministry of information & broadcasting', name: 'Ministry of Information & Broadcasting', description: 'Ministry of Information & Broadcasting', category: 'ministry' },
];

/**
 * Get display name for a role
 */
export function getRoleDisplayName(roleId: string | undefined): string {
  if (!roleId) return 'Unknown Role';
  
  const role = ROLE_DEFINITIONS.find(
    r => r.id.toLowerCase() === roleId.toLowerCase()
  );
  
  return role ? role.name : roleId;
}

/**
 * Get role information
 */
export function getRoleInfo(roleId: string | undefined): RoleInfo | null {
  if (!roleId) return null;
  
  return ROLE_DEFINITIONS.find(
    r => r.id.toLowerCase() === roleId.toLowerCase()
  ) || null;
}

/**
 * Check if role is a ministry role
 */
export function isMinistryRole(roleId: string | undefined): boolean {
  if (!roleId) return false;
  
  const role = getRoleInfo(roleId);
  return role?.category === 'ministry';
}

/**
 * Check if role is a system role (admin, manager, staff)
 */
export function isSystemRole(roleId: string | undefined): boolean {
  if (!roleId) return false;
  
  const role = getRoleInfo(roleId);
  return role?.category === 'system';
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(roleId: string | undefined): boolean {
  return roleId?.toLowerCase() === 'admin';
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(roleId: string | undefined): string {
  if (!roleId) return 'bg-gray-100 text-gray-700';
  
  const role = getRoleInfo(roleId);
  
  if (roleId.toLowerCase() === 'admin') {
    return 'bg-red-100 text-red-700';
  }
  
  if (role?.category === 'ministry') {
    return 'bg-blue-100 text-blue-700';
  }
  
  if (roleId.toLowerCase() === 'manager') {
    return 'bg-purple-100 text-purple-700';
  }
  
  return 'bg-green-100 text-green-700';
}

/**
 * Get all ministry roles
 */
export function getMinistryRoles(): RoleInfo[] {
  return ROLE_DEFINITIONS.filter(r => r.category === 'ministry');
}

/**
 * Get all system roles
 */
export function getSystemRoles(): RoleInfo[] {
  return ROLE_DEFINITIONS.filter(r => r.category === 'system');
}
