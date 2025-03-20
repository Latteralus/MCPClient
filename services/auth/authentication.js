// services/auth/authentication.js
// Core authentication methods

import { logChatEvent } from '../../utils/logger.js';
import { getSetting, saveSetting } from '../../utils/storage.js';
import { hasPermission } from './permissions.js';

// Storage keys
const AUTH_TOKEN_KEY = 'crmplus_chat_auth_token';
const USER_INFO_KEY = 'crmplus_chat_user_info';
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

// In-memory state
let currentUser = null;
let authToken = null;
let lastActivity = Date.now();
let sessionTimeoutId = null;
let authListeners = [];

// Default admin credentials for initial setup
const DEFAULT_ADMIN = {
  username: 'CBarnett',
  password: 'Admin123', // In a real app, this would be hashed and not stored in code
  role: 'admin',
  displayName: 'Admin'
};

/**
 * Notify authentication listeners about state changes
 * @param {Object} [prevUser] - Previous user object (optional)
 */
function notifyAuthListeners(prevUser = null) {
  const authState = {
    authenticated: isAuthenticated(),
    user: getCurrentUser()
  };

  authListeners.forEach(listener => {
    try {
      listener(authState, prevUser);
    } catch (error) {
      console.error('[CRM Extension] Error in auth listener:', error);
    }
  });
}

/**
 * Add an authentication listener
 * @param {Function} listener - Callback function for auth state changes
 */
function addAuthListener(listener) {
  if (typeof listener === 'function' && !authListeners.includes(listener)) {
    authListeners.push(listener);
  }
}

/**
 * Remove an authentication listener
 * @param {Function} listener - Callback function to remove
 */
function removeAuthListener(listener) {
  const index = authListeners.indexOf(listener);
  if (index !== -1) {
    authListeners.splice(index, 1);
  }
}

/**
 * Initialize the authentication service
 * @returns {boolean} True if initialization was successful
 */
function initAuth() {
  try {
    // Load saved auth data
    loadSavedAuth();
    
    // Set up session timeout monitoring
    setupSessionTimeout();
    
    // Set up activity tracking for timeout management
    setupActivityTracking();
    
    // Check if admin account exists for first launch
    checkAdminAccount();
    
    // Log initialization
    logChatEvent('auth', 'Authentication service initialized');
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error initializing auth service:', error);
    return false;
  }
}

/**
 * Get the current session status
 * @returns {Object} Session status information
 */
function getSessionStatus() {
  return {
    authenticated: isAuthenticated(),
    user: getCurrentUser(),
    lastActivity: lastActivity,
    sessionTimeout: SESSION_TIMEOUT
  };
}

/**
 * Load saved authentication data from local storage
 */
function loadSavedAuth() {
  try {
    // Load auth token
    const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (savedToken) {
      authToken = savedToken;
    }
    
    // Load user info
    const savedUserInfo = localStorage.getItem(USER_INFO_KEY);
    if (savedUserInfo) {
      currentUser = JSON.parse(savedUserInfo);
    }
    
    if (authToken && currentUser) {
      // Set initial activity timestamp
      lastActivity = Date.now();
      
      // Notify listeners
      notifyAuthListeners();
      
      console.log('[CRM Extension] Loaded saved authentication data');
      logChatEvent('auth', 'Restored authentication session', { 
        username: currentUser.username 
      });
    }
  } catch (error) {
    console.error('[CRM Extension] Error loading saved auth data:', error);
    // Clear potentially corrupted data
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
  }
}

/**
 * Check if admin account exists and create if needed
 */
function checkAdminAccount() {
  // This would typically communicate with the server
  // Here we're just checking a flag in localStorage for demo purposes
  const adminExists = getSetting('admin_account_created', false);
  
  if (!adminExists) {
    console.log('[CRM Extension] Setting up initial admin account');
    // In a real implementation, this would create the admin account on the server
    
    // Mark admin as created
    saveSetting('admin_account_created', true);
    logChatEvent('auth', 'Initial admin account setup completed');
  }
}

/**
 * Set up activity tracking for session timeout management
 */
function setupActivityTracking() {
  // Track user activity
  const activityEvents = ['mousedown', 'keydown', 'touchstart', 'click'];
  
  activityEvents.forEach(eventType => {
    document.addEventListener(eventType, () => {
      updateLastActivity();
    });
  });
}

/**
 * Update the last activity timestamp
 */
function updateLastActivity() {
  lastActivity = Date.now();
  
  // Reset timeout timer
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
  }
  
  if (isAuthenticated()) {
    setupSessionTimeout();
  }
}

/**
 * Set up session timeout
 */
function setupSessionTimeout() {
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
  }
  
  // Only set timeout if authenticated
  if (isAuthenticated()) {
    sessionTimeoutId = setTimeout(() => {
      const timeSinceActivity = Date.now() - lastActivity;
      
      if (timeSinceActivity >= SESSION_TIMEOUT) {
        // Log timeout
        logChatEvent('auth', 'Session timed out due to inactivity', {
          username: currentUser?.username,
          inactiveTime: Math.round(timeSinceActivity / 1000) + ' seconds'
        });
        
        // Logout user
        logout('Session timed out due to inactivity');
      } else {
        // Recalculate timeout for remaining time
        const remainingTime = SESSION_TIMEOUT - timeSinceActivity;
        sessionTimeoutId = setTimeout(setupSessionTimeout, remainingTime);
      }
    }, SESSION_TIMEOUT);
  }
}

/**
 * Login with username and password
 * @param {string} username - The username
 * @param {string} password - The password
 * @returns {Promise<Object>} Authentication result
 */
async function login(username, password) {
  try {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }
    
    // Log login attempt (without password)
    logChatEvent('auth', 'Login attempt', { username });
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // In a real implementation, the following would be a request to the server
    // For demo purposes, we'll check against the hard-coded admin credentials
    // or check with the server for other users
    
    let authResponse = null;
    
    // Check if using default admin credentials
    if (username === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password) {
      // Simulate successful admin login
      authResponse = {
        success: true,
        token: 'admin_' + Date.now().toString(36) + Math.random().toString(36).substr(2),
        user: {
          id: 'admin_' + Math.random().toString(36).substr(2),
          username: DEFAULT_ADMIN.username,
          role: DEFAULT_ADMIN.role,
          displayName: DEFAULT_ADMIN.displayName,
          isAdmin: true
        }
      };
    } else {
      // Try to authenticate with server
      try {
        const response = await fetch(`${httpServerUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Login failed');
        }
        
        authResponse = await response.json();
      } catch (serverError) {
        console.error('[CRM Extension] Server auth error:', serverError);
        
        // For demo/dev purposes only - in production we would fail here
        // This simulates local authentication when server is not available
        if (getSetting('allow_local_auth', false)) {
          const localUsers = getSetting('local_users', []);
          const user = localUsers.find(u => u.username === username);
          
          if (user && user.password === password) { // In real app, passwords would be hashed
            authResponse = {
              success: true,
              token: 'local_' + Date.now().toString(36) + Math.random().toString(36).substr(2),
              user: {
                id: user.id || 'user_' + Math.random().toString(36).substr(2),
                username: user.username,
                role: user.role || 'user',
                displayName: user.displayName || user.username,
                isLocal: true
              }
            };
          } else {
            throw new Error('Invalid username or password');
          }
        } else {
          throw new Error('Server authentication failed');
        }
      }
    }
    
    if (!authResponse || !authResponse.success) {
      throw new Error('Authentication failed');
    }
    
    // Store authentication data
    authToken = authResponse.token;
    currentUser = authResponse.user;
    
    // Save to local storage
    localStorage.setItem(AUTH_TOKEN_KEY, authToken);
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(currentUser));
    
    // Reset activity timestamp
    updateLastActivity();
    
    // Set up session timeout
    setupSessionTimeout();
    
    // Log successful login
    logChatEvent('auth', 'Login successful', { 
      username: currentUser.username,
      role: currentUser.role
    });
    
    // Notify listeners
    notifyAuthListeners();
    
    return {
      success: true,
      user: currentUser
    };
  } catch (error) {
    // Log error
    logChatEvent('auth', 'Login failed', { 
      username,
      error: error.message 
    });
    
    console.error('[CRM Extension] Login error:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Logout the current user
 * @param {string} reason - Reason for logout
 * @returns {boolean} Success status
 */
function logout(reason = 'User logout') {
  try {
    if (!isAuthenticated()) {
      return false;
    }
    
    // Log logout
    logChatEvent('auth', 'Logout', { 
      username: currentUser?.username,
      reason
    });
    
    // Clear auth data
    authToken = null;
    const prevUser = currentUser;
    currentUser = null;
    
    // Clear from storage
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    
    // Clear timeout
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId);
      sessionTimeoutId = null;
    }
    
    // Notify listeners
    notifyAuthListeners(prevUser);
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Logout error:', error);
    return false;
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean} Authentication status
 */
function isAuthenticated() {
  return !!authToken && !!currentUser;
}

/**
 * Get the current user
 * @returns {Object|null} Current user or null if not authenticated
 */
function getCurrentUser() {
  return currentUser;
}

/**
 * Get the current auth token
 * @returns {string|null} Current auth token or null if not authenticated
 */
function getAuthToken() {
  return authToken;
}

// Export all functions
export {
  login,
  logout,
  isAuthenticated,
  getCurrentUser,
  getAuthToken,
  initAuth,
  updateLastActivity,
  hasPermission,
  getSessionStatus,
  addAuthListener,
  removeAuthListener
};