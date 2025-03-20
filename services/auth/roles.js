// services/auth/roles.js
// Role management methods

import { logChatEvent } from '../../utils/logger.js';
import { getSetting, saveSetting } from '../../utils/storage.js';
import { getCurrentUser, isAuthenticated, hasPermission } from './authentication.js';

/**
 * Get all available roles
 * @returns {Promise<Object>} Roles retrieval result
 */
export async function getAllRoles() {
  try {
    if (!isAuthenticated()) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }
    
    // Check if user has permission to view roles
    if (!hasPermission('roles.view')) {
      return { 
        success: false, 
        error: 'Permission denied' 
      };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    try {
      const response = await fetch(`${httpServerUrl}/admin/roles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('crmplus_chat_auth_token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to retrieve roles');
      }
      
      const roles = await response.json();
      
      return {
        success: true,
        roles: roles
      };
    } catch (serverError) {
      console.error('[CRM Extension] Server roles retrieval error:', serverError);
      
      // For demo/dev purposes only
      if (getSetting('allow_local_auth', false)) {
        // Default roles for local mode
        const defaultRoles = [
          { 
            id: 'user', 
            name: 'User', 
            description: 'Standard user with basic permissions',
            permissions: ['message.create', 'channel.view']
          },
          { 
            id: 'moderator', 
            name: 'Moderator', 
            description: 'User with additional moderation powers',
            permissions: ['message.create', 'message.delete', 'channel.create', 'user.view']
          },
          { 
            id: 'admin', 
            name: 'Administrator', 
            description: 'Full system access',
            permissions: ['*']
          }
        ];
        
        return {
          success: true,
          roles: defaultRoles
        };
      }
      
      throw new Error('Server request failed: ' + serverError.message);
    }
  } catch (error) {
    console.error('[CRM Extension] Roles retrieval error:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a new role
 * @param {Object} roleData - Role creation data
 * @returns {Promise<Object>} Role creation result
 */
export async function createRole(roleData) {
  try {
    const currentUser = getCurrentUser();
    
    if (!isAuthenticated()) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }
    
    // Check if user has permission to create roles
    if (!hasPermission('roles.create')) {
      return { 
        success: false, 
        error: 'Permission denied' 
      };
    }
    
    // Validate role data
    if (!roleData.name) {
      return { 
        success: false, 
        error: 'Role name is required' 
      };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    try {
      const response = await fetch(`${httpServerUrl}/admin/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('crmplus_chat_auth_token')}`
        },
        body: JSON.stringify(roleData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create role');
      }
      
      const newRole = await response.json();
      
      // Log role creation
      logChatEvent('auth', 'Role created', { 
        roleName: newRole.name,
        createdBy: currentUser.username
      });
      
      return {
        success: true,
        role: newRole
      };
    } catch (serverError) {
      console.error('[CRM Extension] Server role creation error:', serverError);
      
      // For demo/dev purposes only
      if (getSetting('allow_local_auth', false)) {
        const localRoles = getSetting('local_roles', []);
        
        const newRole = {
          id: `role_${Date.now().toString(36)}`,
          ...roleData,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.id
        };
        
        localRoles.push(newRole);
        saveSetting('local_roles', localRoles);
        
        // Log local role creation
        logChatEvent('auth', 'Local role created', { 
          roleName: newRole.name,
          createdBy: currentUser.username,
          isLocal: true
        });
        
        return {
          success: true,
          role: newRole
        };
      }
      
      throw new Error('Server request failed: ' + serverError.message);
    }
  } catch (error) {
    console.error('[CRM Extension] Role creation error:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update an existing role
 * @param {string} roleId - Role ID to update
 * @param {Object} roleData - Updated role data
 * @returns {Promise<Object>} Role update result
 */
export async function updateRole(roleId, roleData) {
  try {
    const currentUser = getCurrentUser();
    
    if (!isAuthenticated()) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }
    
    // Check if user has permission to update roles
    if (!hasPermission('roles.update')) {
      return { 
        success: false, 
        error: 'Permission denied' 
      };
    }
    
    // Validate input
    if (!roleId) {
      return { 
        success: false, 
        error: 'Role ID is required' 
      };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    try {
      const response = await fetch(`${httpServerUrl}/admin/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('crmplus_chat_auth_token')}`
        },
        body: JSON.stringify(roleData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update role');
      }
      
      const updatedRole = await response.json();
      
      // Log role update
      logChatEvent('auth', 'Role updated', { 
        roleId,
        roleName: updatedRole.name,
        updatedBy: currentUser.username
      });
      
      return {
        success: true,
        role: updatedRole
      };
    } catch (serverError) {
      console.error('[CRM Extension] Server role update error:', serverError);
      
      // For demo/dev purposes only
      if (getSetting('allow_local_auth', false)) {
        const localRoles = getSetting('local_roles', []);
        const roleIndex = localRoles.findIndex(r => r.id === roleId);
        
        if (roleIndex === -1) {
          return { 
            success: false, 
            error: 'Role not found' 
          };
        }
        
        const updatedRole = {
          ...localRoles[roleIndex],
          ...roleData,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.id
        };
        
        localRoles[roleIndex] = updatedRole;
        saveSetting('local_roles', localRoles);
        
        // Log local role update
        logChatEvent('auth', 'Local role updated', { 
          roleId,
          roleName: updatedRole.name,
          updatedBy: currentUser.username,
          isLocal: true
        });
        
        return {
          success: true,
          role: updatedRole
        };
      }
      
      throw new Error('Server request failed: ' + serverError.message);
    }
  } catch (error) {
    console.error('[CRM Extension] Role update error:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a role
 * @param {string} roleId - Role ID to delete
 * @returns {Promise<Object>} Role deletion result
 */
export async function deleteRole(roleId) {
  try {
    const currentUser = getCurrentUser();
    
    if (!isAuthenticated()) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }
    
    // Check if user has permission to delete roles
    if (!hasPermission('roles.delete')) {
      return { 
        success: false, 
        error: 'Permission denied' 
      };
    }
    
    // Validate input
    if (!roleId) {
      return { 
        success: false, 
        error: 'Role ID is required' 
      };
    }
    
    // Prevent deleting default roles
    const defaultRoles = ['admin', 'moderator', 'user'];
    if (defaultRoles.includes(roleId)) {
      return { 
        success: false, 
        error: 'Cannot delete default roles' 
      };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    try {
      const response = await fetch(`${httpServerUrl}/admin/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('crmplus_chat_auth_token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete role');
      }
      
      // Log role deletion
      logChatEvent('auth', 'Role deleted', { 
        roleId,
        deletedBy: currentUser.username
      });
      
      return { success: true };
    } catch (serverError) {
      console.error('[CRM Extension] Server role deletion error:', serverError);
      
      // For demo/dev purposes only
      if (getSetting('allow_local_auth', false)) {
        const localRoles = getSetting('local_roles', []);
        const roleIndex = localRoles.findIndex(r => r.id === roleId);
        
        if (roleIndex === -1) {
          return { 
            success: false, 
            error: 'Role not found' 
          };
        }
        
        localRoles.splice(roleIndex, 1);
        saveSetting('local_roles', localRoles);
        
        // Log local role deletion
        logChatEvent('auth', 'Local role deleted', { 
          roleId,
          deletedBy: currentUser.username,
          isLocal: true
        });
        
        return { success: true };
      }
      
      throw new Error('Server request failed: ' + serverError.message);
    }
  } catch (error) {
    console.error('[CRM Extension] Role deletion error:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}