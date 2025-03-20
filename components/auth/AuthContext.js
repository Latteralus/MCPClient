// chat/components/auth/AuthContext.js
// Context provider for authentication state

import { 
  isAuthenticated, 
  getCurrentUser, 
  login, 
  logout, 
  registerUser,  // Updated import
  updateUserProfile,
  getSessionStatus,
  hasPermission,
  addAuthListener,
  removeAuthListener
} from '../../services/auth';

class AuthContext {
  constructor() {
    this.listeners = [];
    this.authState = {
      authenticated: isAuthenticated(),
      user: getCurrentUser(),
      sessionStatus: getSessionStatus()
    };

    // Set up authentication change listener
    this.setupAuthListener();

    // Set up session status refresh
    this.setupSessionRefresh();
  }

  /**
   * Notify all listeners of state changes
   */
  notifyListeners() {
    const state = this.getAuthState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[CRM Extension] Error in auth context listener:', error);
      }
    });
  }

  /**
   * Set up listener for auth state changes
   */
  setupAuthListener() {
    addAuthListener(authState => {
      this.authState = {
        ...this.authState,
        authenticated: authState.authenticated,
        user: authState.user
      };

      this.notifyListeners();
    });
  }

  /**
   * Set up refresh for session status
   */
  setupSessionRefresh() {
    // Update session status every minute
    setInterval(() => {
      this.authState.sessionStatus = getSessionStatus();

      // Only notify if authenticated to avoid unnecessary updates
      if (this.authState.authenticated) {
        this.notifyListeners();
      }
    }, 60000); // 1 minute
  }

  /**
   * Log in a user
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} Login result
   */
  async login(username, password) {
    const result = await login(username, password);

    if (result.success) {
      this.authState = {
        authenticated: true,
        user: result.user,
        sessionStatus: getSessionStatus()
      };

      this.notifyListeners();
    }

    return result;
  }

  /**
   * Log out the current user
   * @param {string} reason - Reason for logout
   * @returns {boolean} Success status
   */
  logout(reason) {
    const result = logout(reason);

    if (result) {
      this.authState = {
        authenticated: false,
        user: null,
        sessionStatus: getSessionStatus()
      };

      this.notifyListeners();
    }

    return result;
  }

  /**
   * Register a new user
   * @param {Object} userInfo - User registration data
   * @returns {Promise<Object>} Registration result
   */
  async register(userInfo) {
    return await registerUser(userInfo);
  }

  /**
   * Update user profile
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Update result
   */
  async updateProfile(updates) {
    const result = await updateUserProfile(updates);

    if (result.success) {
      this.authState = {
        ...this.authState,
        user: result.user
      };

      this.notifyListeners();
    }

    return result;
  }

  /**
   * Check if current user has a permission
   * @param {string} permission - Permission to check
   * @returns {boolean} True if user has permission
   */
  hasPermission(permission) {
    return hasPermission(permission);
  }

  /**
   * Get current authentication state
   * @returns {Object} Current auth state
   */
  getAuthState() {
    // Refresh session status
    this.authState.sessionStatus = getSessionStatus();

    return { ...this.authState };
  }

  /**
   * Subscribe to auth state changes
   * @param {Function} listener - Callback for state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    if (typeof listener !== 'function') {
      console.error('[CRM Extension] Auth context listener must be a function');
      return () => {};
    }

    this.listeners.push(listener);

    // Immediately notify with current state
    listener(this.getAuthState());

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

const authContext = new AuthContext();
export default authContext;
