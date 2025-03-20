// chat/index.js
// Main entry point for HIPAA-compliant chat module

import { logChatEvent } from './utils/logger.js';
import { initStorage } from './utils/storage.js';
import { generateSessionKeys } from './utils/encryption.js';
import { initAuth } from './services/auth';
import { initMessageService, connectToServer, disconnectFromServer } from './services/messageService.js';
import { initUserService } from './services/userService.js';
import { initChannelService } from './services/channelService.js';
import { getChannelMessages } from './utils/storage.js';
import { getActiveChannel } from './services/messageService.js';
import authContext from './components/auth/AuthContext.js'; // Fixed path: './components/auth/AuthContext.js'
import config from './config.js';
import { initChatUI, destroyChatUI } from './initChatUI.js';

// Flag to track initialization status
let isInitialized = false;

// Store event handlers for messages
let newMessageHandlers = [];

/**
 * Initialize the HIPAA-compliant chat system
 * @returns {Promise<boolean>} Success status
 */
export async function initChat() {
  if (isInitialized) {
    console.log('[CRM Extension] Chat system already initialized');
    return true;
  }
  
  try {
    console.log('[CRM Extension] Initializing HIPAA-compliant chat system');
    
    // Initialize components in order
    const storageInit = initStorage();
    if (!storageInit) {
      throw new Error('Failed to initialize storage');
    }
    
    // Generate encryption keys
    await generateSessionKeys();
    
    // Initialize auth service
    const authInit = initAuth();
    if (!authInit) {
      throw new Error('Failed to initialize auth service');
    }
    
    // Initialize user service
    const userInit = initUserService();
    if (!userInit) {
      throw new Error('Failed to initialize user service');
    }
    
    // Initialize channel service
    const channelInit = initChannelService();
    if (!channelInit) {
      throw new Error('Failed to initialize channel service');
    }
    
    // Initialize message service
    const messageInit = initMessageService();
    if (!messageInit) {
      throw new Error('Failed to initialize message service');
    }
    
    // Initialize chat UI
    initChatUI();
    
    // Log initialization success
    logChatEvent('system', 'HIPAA-compliant chat system initialized');
    
    // Set initialization flag
    isInitialized = true;
    
    console.log('[CRM Extension] HIPAA-compliant chat system initialized successfully');
    
    // Set up auto-connection if authenticated
    if (authContext.getAuthState().authenticated) {
      connectToServer();
    }
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Failed to initialize chat system:', error);
    logChatEvent('error', 'Failed to initialize chat system', { error: error.message });
    return false;
  }
}

/**
 * Initialize chat monitoring to watch for new messages
 */
export function initChatMonitoring() {
  // Get recent messages from storage
  const recentMessages = getChannelMessages(getActiveChannel());
  
  // Set up reconnection logic
  setInterval(() => {
    const status = getConnectionStatus();
    if (status === 'disconnected') {
      console.log('[CRM Extension] Attempting to reconnect chat');
      connectToServer();
    }
  }, 30000); // Try to reconnect every 30 seconds if disconnected
  
  // Log chat monitoring start
  logChatEvent('system', 'Chat monitoring initialized');
}

/**
 * Get the initialization status of the chat system
 * @returns {boolean} True if initialized
 */
export function isChatInitialized() {
  return isInitialized;
}

/**
 * Get the version of the chat system
 * @returns {string} Version number
 */
export function getChatVersion() {
  return config.version.number;
}

/**
 * Check if a feature is enabled
 * @param {string} featureName - Name of the feature to check
 * @returns {boolean} True if feature is enabled
 */
export function isFeatureEnabled(featureName) {
  const features = config.features;
  return featureName in features ? features[featureName] : false;
}

/**
 * Clean up and shutdown the chat system
 * @returns {Promise<boolean>} Success status
 */
export async function shutdownChat() {
  if (!isInitialized) {
    return true;
  }
  
  try {
    // Destroy the chat UI
    destroyChatUI();
    
    // Disconnect from server
    await disconnectFromServer();
    
    // Log shutdown
    logChatEvent('system', 'Chat system shutdown');
    
    // Reset initialization flag
    isInitialized = false;
    
    console.log('[CRM Extension] Chat system shutdown successfully');
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error shutting down chat system:', error);
    return false;
  }
}

/**
 * Register a handler for new messages
 * @param {Function} handler - Function to call with new messages
 */
export function onNewMessages(handler) {
  if (typeof handler === 'function' && !newMessageHandlers.includes(handler)) {
    newMessageHandlers.push(handler);
  }
}

/**
 * Remove a message handler
 * @param {Function} handler - The handler to remove
 */
export function offNewMessages(handler) {
  const index = newMessageHandlers.indexOf(handler);
  if (index !== -1) {
    newMessageHandlers.splice(index, 1);
  }
}

/**
 * Create a chat button for the header
 * @param {HTMLElement} container - Container to add button to
 * @returns {HTMLElement} The created button
 */
export function createChatButton(container) {
  const button = document.createElement('button');
  button.className = 'chat-button';
  button.innerHTML = '<span class="icon">💬</span><span class="badge" style="display:none">0</span>';
  button.title = 'HIPAA-Compliant Chat';
  
  // Apply styles
  Object.assign(button.style, {
    position: 'relative',
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '20px'
  });
  
  // Apply badge styles
  const badge = button.querySelector('.badge');
  Object.assign(badge.style, {
    position: 'absolute',
    top: '0',
    right: '0',
    backgroundColor: '#f44336',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '50%',
    display: 'none'
  });
  
  // Add click handler
  button.addEventListener('click', () => {
    // This ensures the global toggleChatUI function is called
    if (typeof window.toggleChatUI === 'function') {
      window.toggleChatUI();
    } else {
      console.error('[CRM Extension] toggleChatUI function not available');
    }
  });
  
  // Listen for notification count updates
  window.addEventListener('chat_notification_count', (event) => {
    const count = event.detail.count;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  });
  
  // Add to container if provided
  if (container) {
    container.appendChild(button);
  }
  
  return button;
}

// Export all public services and components for use by other modules
// Auth components
export { default as authContext } from './components/auth/AuthContext.js';
export { default as LoginForm } from './components/auth/LoginForm.js';

// Admin components
export { default as AdminPanel } from './components/admin/AdminPanel.js';
export { default as UserManager } from './components/admin/UserManager.js';
export { default as ChannelManager } from './components/admin/ChannelManager.js';

// Admin user management components
export { default as UserTable } from './components/admin/users/UserTable.js';  // Changed from UserTable to default
export { default as UserToolbar } from './components/admin/users/UserToolbar.js';
export { default as CreateUserModal } from './components/admin/users/CreateUserModal.js';
export { default as EditUserModal } from './components/admin/users/EditUserModal.js';
export { default as DeleteUserModal } from './components/admin/users/DeleteUserModal.js';
export { default as ResetPasswordModal } from './components/admin/users/ResetPasswordModal.js';
export { default as ImportUsersModal } from './components/admin/users/ImportUsersModal.js';

// Admin channel management components
export { default as ChannelTable } from './components/admin/channels/ChannelTable.js';
export { default as ChannelToolbar } from './components/admin/channels/ChannelToolbar.js';
export { default as CreateChannelModal } from './components/admin/channels/CreateChannelModal.js';
export { default as EditChannelModal } from './components/admin/channels/EditChannelModal.js';
export { default as DeleteChannelModal } from './components/admin/channels/DeleteChannelModal.js';

// Message components
export { default as MessageList } from './components/messages/MessageList.js';  // Changed from MessageList to default
export { default as MessageInput } from './components/messages/MessageInput.js';

// User components
export { default as UserList } from './components/users/UserList.js';
export { default as UserStatus } from './components/users/UserStatus.js';

// Common components
export { default as ModalBase } from './components/common/ModalBase.js';

// App components
export { default as NotificationSystem } from './components/app/NotificationSystem.js';
export { default as Header } from './components/app/Header.js';
export { default as AppContainer } from './components/app/AppContainer.js';
export { initChatUI, destroyChatUI };

// Auth service exports
export {
  isAuthenticated,
  getCurrentUser,
  login,
  logout,
  registerUser,
  updateUserProfile,
  getSessionStatus,
  hasPermission,
  addAuthListener,
  removeAuthListener,
  getAllUsers,
  deleteUser,
  updateUserRole,
  resetUserPassword,
  importUsers,
  forceLogoutUser
} from './services/auth';

// Message service exports
export {
  connectToServer,
  disconnectFromServer,
  sendChatMessage,
  getConnectionStatus,
  addConnectionStatusListener,
  addMessageListener,
  addUserListListener,
  addChannelListListener,
  getActiveChannel,
  requestChannelList,
  switchChannel,
  updateServerUrl
} from './services/messageService.js';

// User service exports
export {
  getOnlineUsers,
  getUserById,
  getUserByUsername,
  getAllUsers as getAllUsersFull,
  addUserStatusListener,
  setUserStatus,
  searchUsers,
  createUser as createUserAccount,
  updateUser as updateUserAccount,
  deleteUser as removeUser
} from './services/userService.js';

// Channel service exports
export {
  getAvailableChannels,
  getChannelById,
  addChannelListener,
  createChannel,
  updateChannel,
  deleteChannel,
  joinChannel,
  leaveChannel,
  inviteToChannel,
  setActiveChannel,
  getActiveChannel as getCurrentChannel,
  getActiveChannelObject,
  searchChannels,
  hasPermission as hasChannelPermission
} from './services/channelService.js';

// Storage exports
export {
  getChannelMessages,
  getDirectMessages,
  clearChannelMessages,
  clearAllMessages,
  exportData,
  importData,
  getStorageUsage,
  saveChannel,
  getChannels,
  deleteChannel as removeChannel,
  saveUser,
  getUsers,
  saveSetting,
  getSetting,
  clearSettings
} from './utils/storage.js';

// Logger exports
export {
  logChatEvent,
  getAuditLog,
  searchAuditLog,
  exportAuditLog,
  getAuditLogStats,
  cleanupAuditLog,
  clearAuditLog
} from './utils/logger.js';

// Encryption exports
export {
  encryptMessage,
  decryptMessage,
  generateSessionKeys,
  checkCryptoSupport,
  isEncryptionActive,
  getEncryptionInfo,
  resetEncryptionKeys
} from './utils/encryption.js';

// Validation exports
export {
  containsPotentialPHI,
  validateUsername,
  validatePassword,
  validateChannelName,
  validateChannelDescription,
  validateMessage,
  escapeHtml,
  validateEmail,
  validateUrl,
  validateWebSocketUrl,
  validateDate,
  validatePhoneNumber,
  formatPhoneNumber,
  generateId
} from './utils/validation.js';

// Config exports
export { getConfig, setConfig, default as config } from './config.js';