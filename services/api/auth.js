// services/api/auth.js
// JWT Authentication service for HIPAA-compliant chat

import api from './index.js';
import { logChatEvent } from '../../utils/logger.js';
import { getConfig } from '../../config/index.js';

// Constants
const TOKEN_STORAGE_KEY = 'crmplus_chat_auth_token';
const USER_STORAGE_KEY = 'crmplus_chat_user_info';
const REFRESH_TOKEN_STORAGE_KEY = 'crmplus_chat_refresh_token';

// Authentication state
let currentUser = null;
let authListeners = [];
let sessionTimeout = null;

/**
 * Initialize authentication from storage
 * @returns {boolean} Success status
 */
export function initAuth() {
  try {
    // Check for existing token
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    
    if (token) {
      // Get user info
      const userJson = localStorage.getItem(USER_STORAGE_KEY);
      
      if (userJson) {
        try {
          currentUser = JSON.parse(userJson);
          
          // Set up token refresh
          scheduleTokenRefresh(token);
          
          // Set up session timeout
          setupSessionTimeout();
          
          // Notify listeners
          notifyAuthListeners();
          
          logChatEvent('auth', 'Auth initialized from storage', {
            username: currentUser.username
          });
          
          return true;
        } catch (parseError) {
          console.error('[Auth Service] Error parsing user data:', parseError);
          clearAuthData();
        }
      } else {
        clearAuthData();
      }
    }
    
    logChatEvent('auth', 'Auth initialized (no existing session)');
    return true;
  } catch (error) {
    console.error('[Auth Service] Error initializing auth:', error);
    logChatEvent('auth', 'Auth initialization error', { error: error.message });
    return false;
  }
}

/**
 * Login a user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} Login result
 */
export async function login(username, password) {
  try {
    logChatEvent('auth', 'Login attempt', { username });
    
    // Call login API
    const response = await api.post('/auth/login', {
      username,
      password
    });
    
    if (response.success) {
      // Save token and user info
      const { token, refreshToken, user } = response.data;
      
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      
      // Set current user
      currentUser = user;
      
      // Set up token refresh
      scheduleTokenRefresh(token);
      
      // Set up session timeout
      setupSessionTimeout();
      
      // Notify listeners
      notifyAuthListeners();
      
      logChatEvent('auth', 'Login successful', { username });
      
      return {
        success: true,
        user
      };
    } else {
      logChatEvent('auth', 'Login failed', { 
        username,
        reason: response.message || 'Unknown error' 
      });
      
      return {
        success: false,
        error: response.message || 'Login failed. Please check your credentials.'
      };
    }
  } catch (error) {
    console.error('[Auth Service] Login error:', error);
    
    logChatEvent('auth', 'Login error', { 
      username, 
      error: error.message 
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    };
  }
}

/**
 * Logout a user
 * @param {string} reason - Reason for logout (optional)
 * @returns {boolean} Success status
 */
export function logout(reason = 'user_initiated') {
  try {
    // If we have a user, log the event
    if (currentUser) {
      logChatEvent('auth', 'Logout', {
        username: currentUser.username,
        reason
      });
    }
    
    // Clear token refresh
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      sessionTimeout = null;
    }
    
    // Clear auth data
    clearAuthData();
    
    // Make API call to invalidate session if reason is not 'session_expired'
    if (reason !== 'session_expired') {
      // Call in background, don't wait for response
      api.post('/auth/logout').catch(error => {
        console.error('[Auth Service] Logout API error:', error);
      });
    }
    
    return true;
  } catch (error) {
    console.error('[Auth Service] Logout error:', error);
    return false;
  }
}

/**
 * Validate an existing session
 * @param {string} token - JWT token
 * @returns {Promise<Object>} Validation result
 */
export async function validateExistingSession(token) {
  try {
    // Call validate session API
    const response = await api.get('/auth/validate', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.success) {
      logChatEvent('auth', 'Session validated');
      return { success: true };
    } else {
      logChatEvent('auth', 'Session validation failed', {
        reason: response.message || 'Unknown error'
      });
      
      // Clear auth data
      clearAuthData();
      
      return {
        success: false,
        error: response.message || 'Session validation failed'
      };
    }
  } catch (error) {
    console.error('[Auth Service] Session validation error:', error);
    
    // Clear auth data
    clearAuthData();
    
    return {
      success: false,
      error: 'Session validation error'
    };
  }
}

/**
 * Refresh the authentication token
 * @returns {Promise<Object>} Refresh result
 */
export async function refreshToken() {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    
    if (!refreshToken) {
      return {
        success: false,
        error: 'No refresh token available'
      };
    }
    
    // Call refresh token API
    const response = await api.post('/auth/refresh', {
      refreshToken
    });
    
    if (response.success) {
      // Save new token
      const { token, refreshToken: newRefreshToken } = response.data;
      
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      
      // Save new refresh token if provided
      if (newRefreshToken) {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, newRefreshToken);
      }
      
      // Set up token refresh
      scheduleTokenRefresh(token);
      
      logChatEvent('auth', 'Token refreshed');
      
      return { success: true };
    } else {
      logChatEvent('auth', 'Token refresh failed', {
        reason: response.message || 'Unknown error'
      });
      
      // Force logout due to refresh failure
      logout('refresh_failed');
      
      return {
        success: false,
        error: response.message || 'Token refresh failed'
      };
    }
  } catch (error) {
    console.error('[Auth Service] Token refresh error:', error);
    
    // Force logout
    logout('refresh_error');
    
    return {
      success: false,
      error: 'Token refresh error'
    };
  }
}

/**
 * Register a new user
 * @param {Object} userInfo - User information
 * @returns {Promise<Object>} Registration result
 */
export async function registerUser(userInfo) {
  try {
    logChatEvent('auth', 'Registration attempt', {
      username: userInfo.username
    });
    
    // Call register API
    const response = await api.post('/auth/register', userInfo);
    
    if (response.success) {
      logChatEvent('auth', 'Registration successful', {
        username: userInfo.username
      });
      
      return {
        success: true,
        user: response.data.user
      };
    } else {
      logChatEvent('auth', 'Registration failed', {
        username: userInfo.username,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'Registration failed'
      };
    }
  } catch (error) {
    console.error('[Auth Service] Registration error:', error);
    
    logChatEvent('auth', 'Registration error', {
      username: userInfo.username,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred during registration'
    };
  }
}

/**
 * Update user profile
 * @param {Object} updates - Profile updates
 * @returns {Promise<Object>} Update result
 */
export async function updateUserProfile(updates) {
  try {
    if (!isAuthenticated()) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }
    
    // Call update profile API
    const response = await api.put('/users/profile', updates);
    
    if (response.success) {
      // Update current user
      const updatedUser = {
        ...currentUser,
        ...response.data.user
      };
      
      // Save updated user
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      currentUser = updatedUser;
      
      // Notify listeners
      notifyAuthListeners();
      
      logChatEvent('auth', 'Profile updated');
      
      return {
        success: true,
        user: updatedUser
      };
    } else {
      logChatEvent('auth', 'Profile update failed', {
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'Profile update failed'
      };
    }
  } catch (error) {
    console.error('[Auth Service] Profile update error:', error);
    
    logChatEvent('auth', 'Profile update error', {
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while updating profile'
    };
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated() {
  return !!currentUser && !!localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Get the current authenticated user
 * @returns {Object|null} Current user or null if not authenticated
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Get all users (admin function)
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of users
 */
export async function getAllUsers(options = {}) {
  try {
    if (!isAuthenticated() || !hasPermission('user.read')) {
      return [];
    }
    
    // Call get users API
    const response = await api.get('/users', {
      params: options
    });
    
    if (response.success) {
      return response.data.users || [];
    } else {
      console.error('[Auth Service] Get users error:', response.message);
      return [];
    }
  } catch (error) {
    console.error('[Auth Service] Get users error:', error);
    return [];
  }
}

/**
 * Delete a user (admin function)
 * @param {string} userId - User ID to delete
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteUser(userId) {
  try {
    if (!isAuthenticated() || !hasPermission('user.delete')) {
      return {
        success: false,
        error: 'Insufficient permissions'
      };
    }
    
    // Call delete user API
    const response = await api.delete(`/users/${userId}`);
    
    if (response.success) {
      logChatEvent('auth', 'User deleted', { targetUserId: userId });
      
      return { success: true };
    } else {
      logChatEvent('auth', 'User deletion failed', {
        targetUserId: userId,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'User deletion failed'
      };
    }
  } catch (error) {
    console.error('[Auth Service] Delete user error:', error);
    
    logChatEvent('auth', 'User deletion error', {
      targetUserId: userId,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while deleting user'
    };
  }
}

/**
 * Update user role (admin function)
 * @param {string} userId - User ID
 * @param {string} roleId - New role ID
 * @returns {Promise<Object>} Update result
 */
export async function updateUserRole(userId, roleId) {
  try {
    if (!isAuthenticated() || !hasPermission('user.update')) {
      return {
        success: false,
        error: 'Insufficient permissions'
      };
    }
    
    // Call update user role API
    const response = await api.put(`/users/${userId}/role`, {
      roleId
    });
    
    if (response.success) {
      logChatEvent('auth', 'User role updated', {
        targetUserId: userId,
        roleId
      });
      
      return { success: true };
    } else {
      logChatEvent('auth', 'User role update failed', {
        targetUserId: userId,
        roleId,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'User role update failed'
      };
    }
  } catch (error) {
    console.error('[Auth Service] Update user role error:', error);
    
    logChatEvent('auth', 'User role update error', {
      targetUserId: userId,
      roleId,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while updating user role'
    };
  }
}

/**
 * Reset user password (admin function)
 * @param {string} userId - User ID
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Reset result
 */
export async function resetUserPassword(userId, newPassword) {
  try {
    if (!isAuthenticated() || !hasPermission('user.update')) {
      return {
        success: false,
        error: 'Insufficient permissions'
      };
    }
    
    // Call reset password API
    const response = await api.post(`/users/${userId}/reset-password`, {
      newPassword
    });
    
    if (response.success) {
      logChatEvent('auth', 'User password reset', {
        targetUserId: userId
      });
      
      return { success: true };
    } else {
      logChatEvent('auth', 'User password reset failed', {
        targetUserId: userId,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'Password reset failed'
      };
    }
  } catch (error) {
    console.error('[Auth Service] Reset password error:', error);
    
    logChatEvent('auth', 'User password reset error', {
      targetUserId: userId,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while resetting password'
    };
  }
}

/**
 * Import users from data (admin function)
 * @param {Array} users - Array of user objects
 * @returns {Promise<Object>} Import result
 */
export async function importUsers(users) {
  try {
    if (!isAuthenticated() || !hasPermission('user.create')) {
      return {
        success: false,
        error: 'Insufficient permissions'
      };
    }
    
    // Call import users API
    const response = await api.post('/users/import', {
      users
    });
    
    if (response.success) {
      logChatEvent('auth', 'Users imported', {
        count: users.length
      });
      
      return {
        success: true,
        imported: response.data.imported || 0,
        failed: response.data.failed || 0
      };
    } else {
      logChatEvent('auth', 'User import failed', {
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'User import failed'
      };
    }
  } catch (error) {
    console.error('[Auth Service] Import users error:', error);
    
    logChatEvent('auth', 'User import error', {
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while importing users'
    };
  }
}

/**
 * Force logout a user (admin function)
 * @param {string} userId - User ID to force logout
 * @returns {Promise<Object>} Logout result
 */
export async function forceLogoutUser(userId) {
  try {
    if (!isAuthenticated() || !hasPermission('user.update')) {
      return {
        success: false,
        error: 'Insufficient permissions'
      };
    }
    
    // Call force logout API
    const response = await api.post(`/users/${userId}/force-logout`);
    
    if (response.success) {
      logChatEvent('auth', 'User forced logout', {
        targetUserId: userId
      });
      
      return { success: true };
    } else {
      logChatEvent('auth', 'User force logout failed', {
        targetUserId: userId,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'Force logout failed'
      };
    }
  } catch (error) {
    console.error('[Auth Service] Force logout error:', error);
    
    logChatEvent('auth', 'User force logout error', {
      targetUserId: userId,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while forcing logout'
    };
  }
}

/**
 * Check if user has a specific permission
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user has permission
 */
export function hasPermission(permission) {
  if (!currentUser || !currentUser.permissions) {
    return false;
  }
  
  return currentUser.permissions.includes(permission);
}

/**
 * Get current session status information
 * @returns {Object} Session status
 */
export function getSessionStatus() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  
  if (!token) {
    return {
      active: false,
      expiresIn: 0
    };
  }
  
  try {
    // Decode JWT token (without verification)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonPayload);
    
    // Calculate time until expiration
    const expiresIn = payload.exp ? (payload.exp * 1000) - Date.now() : 0;
    
    return {
      active: expiresIn > 0,
      expiresIn: Math.max(0, Math.floor(expiresIn / 1000)), // in seconds
      expirationTime: payload.exp ? new Date(payload.exp * 1000) : null
    };
  } catch (error) {
    console.error('[Auth Service] Error parsing token:', error);
    return {
      active: false,
      expiresIn: 0
    };
  }
}

/**
 * Add listener for authentication state changes
 * @param {Function} listener - Callback for auth state changes
 * @returns {Function} Unsubscribe function
 */
export function addAuthListener(listener) {
  if (typeof listener === 'function' && !authListeners.includes(listener)) {
    authListeners.push(listener);
    
    // Immediately notify with current state
    listener({
      authenticated: isAuthenticated(),
      user: currentUser
    });
  }
  
  // Return unsubscribe function
  return () => removeAuthListener(listener);
}

/**
 * Remove authentication state listener
 * @param {Function} listener - Listener to remove
 */
export function removeAuthListener(listener) {
  authListeners = authListeners.filter(l => l !== listener);
}

/**
 * Notify all auth listeners of state change
 */
function notifyAuthListeners() {
  const authState = {
    authenticated: isAuthenticated(),
    user: currentUser
  };
  
  authListeners.forEach(listener => {
    try {
      listener(authState);
    } catch (error) {
      console.error('[Auth Service] Error in auth listener:', error);
    }
  });
}

/**
 * Schedule token refresh before expiration
 * @param {string} token - JWT token
 */
function scheduleTokenRefresh(token) {
  try {
    const status = getSessionStatus();
    
    if (status.active && status.expiresIn > 0) {
      // Calculate refresh time (refresh at 80% of lifetime)
      const refreshTime = Math.floor(status.expiresIn * 0.8) * 1000;
      
      // Schedule refresh
      setTimeout(() => {
        refreshToken().catch(error => {
          console.error('[Auth Service] Scheduled token refresh error:', error);
        });
      }, refreshTime);
      
      logChatEvent('auth', 'Token refresh scheduled', {
        refreshIn: Math.floor(refreshTime / 1000) // in seconds
      });
    }
  } catch (error) {
    console.error('[Auth Service] Error scheduling token refresh:', error);
  }
}

/**
 * Setup session timeout
 */
function setupSessionTimeout() {
  // Clear existing timeout if any
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
  }
  
  // Get session timeout from config
  const sessionTimeoutDuration = getConfig('security.sessionTimeout', 15 * 60 * 1000); // Default 15 minutes
  
  if (!getConfig('security.enableSessionTimeout', true)) {
    return;
  }
  
  // Set up timeout
  sessionTimeout = setTimeout(() => {
    // If user is still authenticated, log them out
    if (isAuthenticated()) {
      logout('session_timeout');
    }
  }, sessionTimeoutDuration);
}

/**
 * Reset session timeout (called on user activity)
 */
export function resetSessionTimeout() {
  if (isAuthenticated()) {
    setupSessionTimeout();
  }
}

/**
 * Clear all authentication data
 */
function clearAuthData() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  
  currentUser = null;
  
  // Notify listeners
  notifyAuthListeners();
}

/**
 * Get authentication token for API requests
 * @returns {string|null} JWT token or null if not authenticated
 */
export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

// Add listener for unauthorized events from API client
window.addEventListener('auth:unauthorized', (event) => {
  console.log('[Auth Service] Received unauthorized event:', event.detail);
  logout('session_expired');
});

// Export for direct use by API service
export default {
  getAuthToken,
  isAuthenticated,
  initAuth,
  login,
  logout,
  getCurrentUser,
  hasPermission
};