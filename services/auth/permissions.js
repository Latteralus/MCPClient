// services/auth/permissions.js
// Permission management methods

import { getCurrentUser, isAuthenticated } from './authentication.js';
import { logChatEvent } from '../../utils/logger.js';

// Comprehensive permission catalog
const PERMISSION_CATALOG = {
  // User-related permissions
  USER: {
    VIEW: 'user.view',
    CREATE: 'user.create',
    UPDATE: 'user.update',
    DELETE: 'user.delete',
    MANAGE_ROLES: 'user.manage_roles'
  },
  
  // Channel-related permissions
  CHANNEL: {
    VIEW: 'channel.view',
    CREATE: 'channel.create',
    UPDATE: 'channel.update',
    DELETE: 'channel.delete',
    INVITE: 'channel.invite'
  },
  
  // Message-related permissions
  MESSAGE: {
    VIEW: 'message.view',
    CREATE: 'message.create',
    UPDATE: 'message.update',
    DELETE: 'message.delete',
    UPDATE_OWN: 'message.update.own',
    DELETE_OWN: 'message.delete.own'
  },
  
  // Admin-related permissions
  ADMIN: {
    SYSTEM_SETTINGS: 'admin.system_settings',
    AUDIT_LOG: 'admin.audit_log',
    MANAGE_ROLES: 'admin.manage_roles'
  }
};

// Role-based default permission sets
const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSION_CATALOG).flatMap(Object.values),
  moderator: [
    // Moderator permissions
    PERMISSION_CATALOG.USER.VIEW,
    PERMISSION_CATALOG.CHANNEL.VIEW,
    PERMISSION_CATALOG.CHANNEL.CREATE,
    PERMISSION_CATALOG.MESSAGE.VIEW,
    PERMISSION_CATALOG.MESSAGE.CREATE,
    PERMISSION_CATALOG.MESSAGE.DELETE
  ],
  user: [
    // Basic user permissions
    PERMISSION_CATALOG.MESSAGE.CREATE,
    PERMISSION_CATALOG.MESSAGE.VIEW,
    PERMISSION_CATALOG.MESSAGE.UPDATE_OWN,
    PERMISSION_CATALOG.MESSAGE.DELETE_OWN,
    PERMISSION_CATALOG.CHANNEL.VIEW
  ]
};

/**
 * Check if a user has a specific permission
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether the user has the permission
 */
export function hasPermission(permission) {
  // If not authenticated, no permissions
  if (!isAuthenticated()) {
    return false;
  }
  
  const currentUser = getCurrentUser();
  
  // Admin always has all permissions
  if (currentUser.role === 'admin') {
    return true;
  }
  
  // Get permissions for the user's role
  const rolePermissions = ROLE_PERMISSIONS[currentUser.role] || [];
  
  // Check if permission exists in role permissions
  return rolePermissions.includes(permission);
}

/**
 * Get all available permissions
 * @returns {Object} Comprehensive permission catalog
 */
export function getAllPermissions() {
  // Ensure user is authenticated and has admin privileges
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    logChatEvent('permissions', 'Unauthorized permissions access attempt', {
      requestingUser: currentUser?.username || 'unauthenticated'
    });
    return null;
  }
  
  return {
    catalog: PERMISSION_CATALOG,
    roleSets: ROLE_PERMISSIONS
  };
}

/**
 * Validate a set of permissions
 * @param {string[]} permissions - Permissions to validate
 * @returns {Object} Validation result
 */
export function validatePermissions(permissions) {
  const allValidPermissions = Object.values(PERMISSION_CATALOG).flatMap(Object.values);
  
  const invalidPermissions = permissions.filter(
    perm => !allValidPermissions.includes(perm)
  );
  
  return {
    valid: invalidPermissions.length === 0,
    invalidPermissions
  };
}

/**
 * Get permissions for a specific role
 * @param {string} role - Role to get permissions for
 * @returns {string[]} Array of permissions
 */
export function getPermissionsForRole(role) {
  // Ensure user is authenticated and has admin privileges
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    logChatEvent('permissions', 'Unauthorized role permissions access', {
      requestedRole: role,
      requestingUser: currentUser?.username || 'unauthenticated'
    });
    return [];
  }
  
  return ROLE_PERMISSIONS[role] || [];
}

// Expose the permission catalog for easy reference
export const PermissionCatalog = PERMISSION_CATALOG;