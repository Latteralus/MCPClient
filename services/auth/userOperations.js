// services/auth/userOperations.js
// Individual user management operations

import { logChatEvent } from '../../utils/logger.js';
import { getSetting, saveSetting } from '../../utils/storage.js';
import { getCurrentUser, isAuthenticated, hasPermission } from './authentication.js';

/**
 * Create a new user (admin-only function)
 * @param {Object} userData - User creation data
 * @returns {Promise<Object>} User creation result
 */
export async function createUser(userData) {
  try {
    const currentUser = getCurrentUser();
    
    // Check if current user is admin
    if (!isAuthenticated() || currentUser.role !== 'admin') {
      return {
        success: false,
        error: 'Administrator privileges required to create users'
      };
    }
    
    // Basic validation
    if (!userData.username || !userData.password) {
      return { 
        success: false, 
        error: 'Username and password are required' 
      };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    try {
      const response = await fetch(`${httpServerUrl}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('crmplus_chat_auth_token')}`
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }
      
      const newUser = await response.json();
      
      // Log user creation
      logChatEvent('auth', 'Admin created user', { 
        username: newUser.username,
        role: newUser.role || 'user'
      });
      
      return {
        success: true,
        user: newUser
      };
    } catch (serverError) {
      console.error('[CRM Extension] Server create user error:', serverError);
      
      // For demo/dev purposes only
      if (getSetting('allow_local_auth', false)) {
        // Create local user
        const localUsers = getSetting('local_users', []);
        
        // Check if username already exists
        if (localUsers.some(u => u.username === userData.username)) {
          return { 
            success: false, 
            error: 'Username already exists' 
          };
        }
        
        const newUser = {
          id: `user_${Date.now().toString(36)}`,
          ...userData,
          role: userData.role || 'user',
          displayName: userData.displayName || userData.username,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.id
        };
        
        localUsers.push(newUser);
        saveSetting('local_users', localUsers);
        
        // Log local user creation
        logChatEvent('auth', 'Local user created', { 
          username: newUser.username,
          role: newUser.role,
          isLocal: true
        });
        
        return {
          success: true,
          user: {
            id: newUser.id,
            username: newUser.username,
            displayName: newUser.displayName,
            role: newUser.role,
            isLocal: true
          }
        };
      }
      
      throw new Error('Server request failed: ' + serverError.message);
    }
  } catch (error) {
    console.error('[CRM Extension] Create user error:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update a user
 * @param {string} userId - User ID to update
 * @param {Object} userData - User update data
 * @returns {Promise<Object>} User update result
 */
export async function updateUser(userId, userData) {
  try {
    const currentUser = getCurrentUser();
    
    if (!isAuthenticated()) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }
    
    // Check permissions - can update self or need admin permissions
    if (userId !== currentUser.id && currentUser.role !== 'admin') {
      return { 
        success: false, 
        error: 'Permission denied' 
      };
    }
    
    if (!userId) {
      return { 
        success: false, 
        error: 'User ID is required' 
      };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    try {
      const response = await fetch(`${httpServerUrl}/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('crmplus_chat_auth_token')}`
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }
      
      const updatedUser = await response.json();
      
      // Log user update
      logChatEvent('auth', 'User updated', { 
        userId,
        updatedFields: Object.keys(userData).join(', ')
      });
      
      return {
        success: true,
        user: updatedUser
      };
    } catch (serverError) {
      console.error('[CRM Extension] Server update user error:', serverError);
      
      // For demo/dev purposes only
      if (getSetting('allow_local_auth', false)) {
        const localUsers = getSetting('local_users', []);
        const userIndex = localUsers.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
          return { 
            success: false, 
            error: 'User not found' 
          };
        }
        
        // Create updated user (preserve sensitive fields)
        const updatedUser = {
          ...localUsers[userIndex],
          displayName: userData.displayName || localUsers[userIndex].displayName,
          email: userData.email || localUsers[userIndex].email
        };
        
        // If admin is updating, also allow role update
        if (currentUser.role === 'admin' && userData.role) {
          updatedUser.role = userData.role;
        }
        
        // Update user
        localUsers[userIndex] = updatedUser;
        saveSetting('local_users', localUsers);
        
        // Log successful update
        logChatEvent('auth', 'Updated local user', { 
          userId,
          updatedFields: Object.keys(userData).join(', '),
          isLocal: true
        });
        
        return {
          success: true,
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            displayName: updatedUser.displayName,
            role: updatedUser.role,
            email: updatedUser.email,
            isLocal: true
          }
        };
      }
      
      throw new Error('Server request failed: ' + serverError.message);
    }
  } catch (error) {
    console.error('[CRM Extension] Update user error:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a user
 * @param {string} userId - User ID to delete
 * @returns {Promise<Object>} User deletion result
 */
export async function deleteUser(userId) {
  try {
    const currentUser = getCurrentUser();
    
    if (!isAuthenticated()) {
      return { success: false, error: 'Authentication required' };
    }
    
    // Check if current user is admin
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Administrator privileges required to delete users' };
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Prevent deleting self
    if (userId === currentUser.id) {
      return { success: false, error: 'Cannot delete your own account' };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send delete request to server
    try {
      const response = await fetch(`${httpServerUrl}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('crmplus_chat_auth_token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }
      
      // Log successful user deletion
      logChatEvent('auth', 'Admin deleted user', {
        adminUsername: currentUser.username,
        targetUserId: userId
      });
      
      return { success: true };
    } catch (serverError) {
      console.error('[CRM Extension] Server delete user error:', serverError);
      
      // For demo/dev purposes only
      if (getSetting('allow_local_auth', false)) {
        const localUsers = getSetting('local_users', []);
        const userIndex = localUsers.findIndex(u => u.id === userId);
        
        if (userIndex >= 0) {
          const username = localUsers[userIndex].username;
          localUsers.splice(userIndex, 1);
          saveSetting('local_users', localUsers);
          
          // Log successful local user deletion
          logChatEvent('auth', 'Admin deleted local user', {
            adminUsername: currentUser.username,
            targetUserId: userId,
            targetUsername: username,
            isLocal: true
          });
          
          return { success: true };
        } else {
          throw new Error('User not found');
        }
      }
      
      throw new Error('Server request failed: ' + serverError.message);
    }
  } catch (error) {
    console.error('[CRM Extension] Delete user error:', error);
    logChatEvent('auth', 'Admin user deletion failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get all users
 * @returns {Promise<Object>} Users retrieval result
 */
export async function getAllUsers() {
  try {
    const currentUser = getCurrentUser();
    
    if (!isAuthenticated()) {
      return { success: false, error: 'Authentication required' };
    }
    
    if (!hasPermission('user.view')) {
      return { success: false, error: 'Permission denied' };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    try {
      const response = await fetch(`${httpServerUrl}/admin/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('crmplus_chat_auth_token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get users');
      }
      
      const users = await response.json();
      
      return {
        success: true,
        users: users
      };
    } catch (serverError) {
      console.error('[CRM Extension] Server get users error:', serverError);
      
      // For demo/dev purposes only
      if (getSetting('allow_local_auth', false)) {
        // Get local users (excluding passwords)
        const localUsers = getSetting('local_users', []).map(user => ({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          createdAt: user.createdAt,
          isLocal: true
        }));
        
        return {
          success: true,
          users: localUsers
        };
      }
      
      throw new Error('Server request failed: ' + serverError.message);
    }
  } catch (error) {
    console.error('[CRM Extension] Get users error:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}