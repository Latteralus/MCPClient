// services/api/users.js
// User service for HIPAA-compliant chat

import api from './index.js';
import auth from './auth.js';
import { logChatEvent } from '../../utils/logger.js';

// In-memory cache for online users
let onlineUsers = [];
let userStatusListeners = [];

/**
 * Get all online users
 * @returns {Array} Array of online users
 */
export function getOnlineUsers() {
  return [...onlineUsers];
}

/**
 * Set online users (called from WebSocket service)
 * @param {Array} users - Array of online users
 */
export function setOnlineUsers(users) {
  onlineUsers = users || [];
  notifyUserStatusListeners(onlineUsers);
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User object
 */
export async function getUserById(userId) {
  try {
    if (!auth.isAuthenticated()) {
      return null;
    }

    // Check cache first
    const cachedUser = onlineUsers.find(user => user.id === userId);
    if (cachedUser) {
      return cachedUser;
    }

    // Call API
    const response = await api.get(`/users/${userId}`);
    
    if (response.success) {
      return response.data.user;
    } else {
      console.error('[User Service] Get user error:', response.message);
      return null;
    }
  } catch (error) {
    console.error('[User Service] Get user error:', error);
    return null;
  }
}

/**
 * Get user by username
 * @param {string} username - Username
 * @returns {Promise<Object>} User object
 */
export async function getUserByUsername(username) {
  try {
    if (!auth.isAuthenticated()) {
      return null;
    }

    // Check cache first
    const cachedUser = onlineUsers.find(user => user.username === username);
    if (cachedUser) {
      return cachedUser;
    }

    // Call API
    const response = await api.get('/users', {
      params: { username }
    });
    
    if (response.success && response.data.users && response.data.users.length > 0) {
      return response.data.users[0];
    } else {
      console.error('[User Service] Get user by username error:', response.message);
      return null;
    }
  } catch (error) {
    console.error('[User Service] Get user by username error:', error);
    return null;
  }
}

/**
 * Get all users
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of users
 */
export async function getAllUsers(filters = {}) {
  try {
    if (!auth.isAuthenticated()) {
      return [];
    }

    // Call API
    const response = await api.get('/users', {
      params: filters
    });
    
    if (response.success) {
      return response.data.users || [];
    } else {
      console.error('[User Service] Get all users error:', response.message);
      return [];
    }
  } catch (error) {
    console.error('[User Service] Get all users error:', error);
    return [];
  }
}

/**
 * Add user status listener
 * @param {Function} listener - Callback for user status changes
 * @returns {Function} Unsubscribe function
 */
export function addUserStatusListener(listener) {
  if (typeof listener === 'function' && !userStatusListeners.includes(listener)) {
    userStatusListeners.push(listener);
    
    // Immediately notify with current online users
    listener(onlineUsers);
  }
  
  // Return unsubscribe function
  return () => {
    userStatusListeners = userStatusListeners.filter(l => l !== listener);
  };
}

/**
 * Notify all user status listeners
 * @param {Array} users - Updated online users
 */
function notifyUserStatusListeners(users) {
  userStatusListeners.forEach(listener => {
    try {
      listener(users);
    } catch (error) {
      console.error('[User Service] Error in user status listener:', error);
    }
  });
}

/**
 * Set current user status
 * @param {string} status - User status ('online', 'away', 'busy', 'offline')
 * @returns {Promise<boolean>} Success status
 */
export async function setUserStatus(status) {
  try {
    if (!auth.isAuthenticated()) {
      return false;
    }

    // Call API
    const response = await api.put('/users/status', { status });
    
    if (response.success) {
      // Log status change
      logChatEvent('user', 'Status changed', { status });
      return true;
    } else {
      console.error('[User Service] Set user status error:', response.message);
      return false;
    }
  } catch (error) {
    console.error('[User Service] Set user status error:', error);
    return false;
  }
}

/**
 * Search users
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of matching users
 */
export async function searchUsers(query, options = {}) {
  try {
    if (!auth.isAuthenticated()) {
      return [];
    }

    // Call search API
    const response = await api.get('/users/search', {
      params: {
        query,
        ...options
      }
    });
    
    if (response.success) {
      return response.data.users || [];
    } else {
      console.error('[User Service] Search users error:', response.message);
      return [];
    }
  } catch (error) {
    console.error('[User Service] Search users error:', error);
    return [];
  }
}

/**
 * Create a new user (admin function)
 * @param {Object} user - User data
 * @returns {Promise<Object>} Creation result
 */
export async function createUser(user) {
  try {
    if (!auth.isAuthenticated() || !auth.hasPermission('user.create')) {
      return {
        success: false,
        error: 'Insufficient permissions'
      };
    }
    
    // Call API
    const response = await api.post('/users', user);
    
    if (response.success) {
      logChatEvent('user', 'User created', {
        username: user.username
      });
      
      return {
        success: true,
        user: response.data.user
      };
    } else {
      logChatEvent('user', 'User creation failed', {
        username: user.username,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'User creation failed'
      };
    }
  } catch (error) {
    console.error('[User Service] Create user error:', error);
    
    logChatEvent('user', 'User creation error', {
      username: user.username,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while creating user'
    };
  }
}

/**
 * Update an existing user
 * @param {string} userId - User ID
 * @param {Object} updates - User updates
 * @returns {Promise<Object>} Update result
 */
export async function updateUser(userId, updates) {
  try {
    if (!auth.isAuthenticated() || !auth.hasPermission('user.update')) {
      return {
        success: false,
        error: 'Insufficient permissions'
      };
    }
    
    // Call API
    const response = await api.put(`/users/${userId}`, updates);
    
    if (response.success) {
      logChatEvent('user', 'User updated', {
        userId
      });
      
      return {
        success: true,
        user: response.data.user
      };
    } else {
      logChatEvent('user', 'User update failed', {
        userId,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'User update failed'
      };
    }
  } catch (error) {
    console.error('[User Service] Update user error:', error);
    
    logChatEvent('user', 'User update error', {
      userId,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while updating user'
    };
  }
}

/**
 * Delete a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteUser(userId) {
  try {
    if (!auth.isAuthenticated() || !auth.hasPermission('user.delete')) {
      return {
        success: false,
        error: 'Insufficient permissions'
      };
    }
    
    // Call API
    const response = await api.delete(`/users/${userId}`);
    
    if (response.success) {
      logChatEvent('user', 'User deleted', {
        userId
      });
      
      return { success: true };
    } else {
      logChatEvent('user', 'User deletion failed', {
        userId,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'User deletion failed'
      };
    }
  } catch (error) {
    console.error('[User Service] Delete user error:', error);
    
    logChatEvent('user', 'User deletion error', {
      userId,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while deleting user'
    };
  }
}

/**
 * Get user permissions
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of permissions
 */
export async function getUserPermissions(userId) {
  try {
    if (!auth.isAuthenticated()) {
      return [];
    }
    
    // Call API
    const response = await api.get(`/users/${userId}/permissions`);
    
    if (response.success) {
      return response.data.permissions || [];
    } else {
      console.error('[User Service] Get user permissions error:', response.message);
      return [];
    }
  } catch (error) {
    console.error('[User Service] Get user permissions error:', error);
    return [];
  }
}

/**
 * Process incoming user status update
 * @param {Object} update - Status update from WebSocket
 */
export function processUserStatusUpdate(update) {
  if (!update || !update.userId) return;
  
  // Find user in online users
  const userIndex = onlineUsers.findIndex(u => u.id === update.userId);
  
  if (update.status === 'offline' && userIndex !== -1) {
    // Remove user from online users
    onlineUsers.splice(userIndex, 1);
    notifyUserStatusListeners(onlineUsers);
  } else if (update.status !== 'offline') {
    if (userIndex !== -1) {
      // Update existing user
      onlineUsers[userIndex] = {
        ...onlineUsers[userIndex],
        status: update.status
      };
    } else {
      // Add new user (with minimal info, will be enriched later)
      onlineUsers.push({
        id: update.userId,
        status: update.status,
        username: update.username || 'Unknown'
      });
      
      // Try to get complete user info
      getUserById(update.userId).then(user => {
        if (user) {
          // Find and update with complete info
          const idx = onlineUsers.findIndex(u => u.id === update.userId);
          if (idx !== -1) {
            onlineUsers[idx] = { ...user, status: update.status };
            notifyUserStatusListeners(onlineUsers);
          }
        }
      }).catch(error => {
        console.error('[User Service] Error fetching user info:', error);
      });
    }
    
    notifyUserStatusListeners(onlineUsers);
  }
}

/**
 * Initialize user service
 * @returns {boolean} Success status
 */
export function initUserService() {
  try {
    // Subscribe to user events from WebSocket
    // This will be implemented when WebSocket service is created
    
    logChatEvent('system', 'User service initialized');
    return true;
  } catch (error) {
    console.error('[User Service] Initialization error:', error);
    return false;
  }
}

export default {
  getOnlineUsers,
  setOnlineUsers,
  getUserById,
  getUserByUsername,
  getAllUsers,
  addUserStatusListener,
  setUserStatus,
  searchUsers,
  createUser,
  updateUser,
  deleteUser,
  initUserService,
  processUserStatusUpdate
};