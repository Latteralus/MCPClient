// chat/services/userService.js
// User management service for HIPAA-compliant chat

import { logChatEvent } from '../utils/logger.js';
import { getUsers, saveUser } from '../utils/storage.js';
import { getCurrentUser, getAuthToken, isAuthenticated, hasPermission } from './auth';

// Current online users
let onlineUsers = [];

// User status listeners
let userStatusListeners = [];

/**
 * Initialize the user service
 * @returns {boolean} Success status
 */
export function initUserService() {
  try {
    // Initialize with any cached users
    loadCachedUsers();
    
    // Log initialization
    logChatEvent('system', 'User service initialized');
    
    console.log('[CRM Extension] User service initialized');
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error initializing user service:', error);
    return false;
  }
}

/**
 * Load cached users from storage
 */
function loadCachedUsers() {
  const users = getUsers();
  if (users.length > 0) {
    // Mark all users as offline initially
    users.forEach(user => {
      user.online = false;
      user.lastSeen = user.lastSeen || new Date().toISOString();
    });
  }
}

/**
 * Update online users list
 * @param {Array} users - Array of online user objects
 */
export function updateOnlineUsers(users) {
  try {
    if (!Array.isArray(users)) return;
    
    // Track previous online users for change detection
    const prevOnlineUserIds = onlineUsers.map(u => u.id);
    
    // Update online users list
    onlineUsers = users.map(user => ({
      ...user,
      online: true,
      lastSeen: new Date().toISOString()
    }));
    
    // Update cached user data
    onlineUsers.forEach(user => {
      saveUser(user);
    });
    
    // Get current online user IDs
    const currentOnlineUserIds = onlineUsers.map(u => u.id);
    
    // Find users who went offline
    const offlineUsers = prevOnlineUserIds.filter(id => !currentOnlineUserIds.includes(id));
    
    // Update offline users
    if (offlineUsers.length > 0) {
      const cachedUsers = getUsers();
      
      offlineUsers.forEach(userId => {
        const userIndex = cachedUsers.findIndex(u => u.id === userId);
        if (userIndex >= 0) {
          cachedUsers[userIndex].online = false;
          cachedUsers[userIndex].lastSeen = new Date().toISOString();
          saveUser(cachedUsers[userIndex]);
        }
      });
    }
    
    // Notify listeners of user status changes
    notifyUserStatusListeners();
  } catch (error) {
    console.error('[CRM Extension] Error updating online users:', error);
  }
}

/**
 * Get all online users
 * @returns {Array} Array of online user objects
 */
export function getOnlineUsers() {
  return [...onlineUsers];
}

/**
 * Get a specific user by ID
 * @param {string} userId - User ID
 * @returns {Object|null} User object or null if not found
 */
export function getUserById(userId) {
  try {
    if (!userId) return null;
    
    // First check online users
    const onlineUser = onlineUsers.find(u => u.id === userId);
    if (onlineUser) return onlineUser;
    
    // Then check cached users
    const cachedUsers = getUsers();
    return cachedUsers.find(u => u.id === userId) || null;
  } catch (error) {
    console.error('[CRM Extension] Error getting user by ID:', error);
    return null;
  }
}

/**
 * Get a specific user by username
 * @param {string} username - Username
 * @returns {Object|null} User object or null if not found
 */
export function getUserByUsername(username) {
  try {
    if (!username) return null;
    
    // First check online users
    const onlineUser = onlineUsers.find(u => u.username === username);
    if (onlineUser) return onlineUser;
    
    // Then check cached users
    const cachedUsers = getUsers();
    return cachedUsers.find(u => u.username === username) || null;
  } catch (error) {
    console.error('[CRM Extension] Error getting user by username:', error);
    return null;
  }
}

/**
 * Add a user status listener
 * @param {Function} listener - Function to call with user status updates
 * @returns {Function} Function to remove the listener
 */
export function addUserStatusListener(listener) {
  if (typeof listener !== 'function') return () => {};
  
  userStatusListeners.push(listener);
  
  // Immediately call with current online users
  listener(getOnlineUsers());
  
  return () => {
    userStatusListeners = userStatusListeners.filter(l => l !== listener);
  };
}

/**
 * Notify all user status listeners
 */
function notifyUserStatusListeners() {
  const users = getOnlineUsers();
  
  userStatusListeners.forEach(listener => {
    try {
      listener(users);
    } catch (error) {
      console.error('[CRM Extension] Error in user status listener:', error);
    }
  });
}

/**
 * Create a new user (admin function)
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Creation result
 */
export async function createUser(userData) {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Authentication required' };
    }
    
    if (!hasPermission('user.create')) {
      return { success: false, error: 'Permission denied' };
    }
    
    // Validate user data
    if (!userData.username) {
      return { success: false, error: 'Username is required' };
    }
    
    // Check if username is already taken
    const existingUser = getUserByUsername(userData.username);
    if (existingUser) {
      return { success: false, error: 'Username already taken' };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    const response = await fetch(`${httpServerUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create user');
    }
    
    const newUser = await response.json();
    
    // Save to local cache
    saveUser(newUser);
    
    // Log user creation
    logChatEvent('user', 'User created', { username: newUser.username });
    
    return {
      success: true,
      user: newUser
    };
  } catch (error) {
    console.error('[CRM Extension] Error creating user:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update a user (admin function or self)
 * @param {string} userId - User ID
 * @param {Object} updates - User data updates
 * @returns {Promise<Object>} Update result
 */
export async function updateUser(userId, updates) {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Authentication required' };
    }
    
    const currentUser = getCurrentUser();
    
    // Check permissions - can update self or need admin permissions
    if (userId !== currentUser.id && !hasPermission('user.update')) {
      return { success: false, error: 'Permission denied' };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    const response = await fetch(`${httpServerUrl}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update user');
    }
    
    const updatedUser = await response.json();
    
    // Save to local cache
    saveUser(updatedUser);
    
    // Log user update
    logChatEvent('user', 'User updated', { userId });
    
    return {
      success: true,
      user: updatedUser
    };
  } catch (error) {
    console.error('[CRM Extension] Error updating user:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a user (admin function)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteUser(userId) {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Authentication required' };
    }
    
    if (!hasPermission('user.delete')) {
      return { success: false, error: 'Permission denied' };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    const response = await fetch(`${httpServerUrl}/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete user');
    }
    
    // Remove from local cache
    const cachedUsers = getUsers();
    const updatedUsers = cachedUsers.filter(u => u.id !== userId);
    localStorage.setItem('crmplus_chat_users', JSON.stringify(updatedUsers));
    
    // Log user deletion
    logChatEvent('user', 'User deleted', { userId });
    
    return { success: true };
  } catch (error) {
    console.error('[CRM Extension] Error deleting user:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all users (cached and online)
 * @returns {Array} Array of all users
 */
export function getAllUsers() {
  try {
    const cachedUsers = getUsers();
    const onlineUserIds = onlineUsers.map(u => u.id);
    
    // Mark cached users as online/offline
    const mergedUsers = cachedUsers.map(user => ({
      ...user,
      online: onlineUserIds.includes(user.id)
    }));
    
    // Add any online users not in cache
    onlineUsers.forEach(onlineUser => {
      if (!mergedUsers.some(u => u.id === onlineUser.id)) {
        mergedUsers.push({
          ...onlineUser,
          online: true
        });
      }
    });
    
    return mergedUsers;
  } catch (error) {
    console.error('[CRM Extension] Error getting all users:', error);
    return [];
  }
}

/**
 * Set user status (away, busy, etc.)
 * @param {string} status - Status to set
 * @returns {Promise<boolean>} Success status
 */
export async function setUserStatus(status) {
  try {
    if (!isAuthenticated()) {
      return false;
    }
    
    const currentUser = getCurrentUser();
    
    // Send status update to server
    // This will typically be handled through the WebSocket connection
    const statusMessage = {
      type: 'status_update',
      userId: currentUser.id,
      status,
      timestamp: new Date().toISOString()
    };
    
    // This assumes messageService has a sendToServer function
    // You may need to modify this based on your actual implementation
    if (typeof window.sendToServer === 'function') {
      window.sendToServer(statusMessage);
    }
    
    // Update local cache
    const user = getUserById(currentUser.id);
    if (user) {
      user.status = status;
      saveUser(user);
    }
    
    // Log status update
    logChatEvent('user', 'Status updated', { status });
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error setting user status:', error);
    return false;
  }
}

/**
 * Search for users by name or username
 * @param {string} query - Search query
 * @returns {Array} Matching users
 */
export function searchUsers(query) {
  try {
    if (!query || typeof query !== 'string') return [];
    
    const normalizedQuery = query.toLowerCase();
    const allUsers = getAllUsers();
    
    return allUsers.filter(user => 
      user.username.toLowerCase().includes(normalizedQuery) ||
      (user.displayName && user.displayName.toLowerCase().includes(normalizedQuery))
    );
  } catch (error) {
    console.error('[CRM Extension] Error searching users:', error);
    return [];
  }
}