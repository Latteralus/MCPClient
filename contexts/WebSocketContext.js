// contexts/WebSocketContext.js
// WebSocket context provider for HIPAA-compliant chat

import { logChatEvent } from '../utils/logger.js';
import { 
  connect, 
  disconnect, 
  getConnectionStatus, 
  addConnectionStatusListener,
  addMessageListener,
  addUserListListener,
  addChannelListListener,
  sendMessage,
  requestChannelList,
  requestUserList,
  joinChannel,
  leaveChannel
} from '../services/websocket/connection.js';

import {
  broadcast,
  broadcastTypingIndicator,
  broadcastReadStatus,
  broadcastUserStatus,
  broadcastMessageEdit,
  broadcastMessageDeletion,
  broadcastPresence
} from '../services/websocket/broadcaster.js';

/**
 * WebSocket Context
 * Provides WebSocket connection state and methods throughout the application
 */
class WebSocketContext {
  constructor() {
    this.listeners = [];
    this.connectionState = {
      status: getConnectionStatus(),
      lastConnected: null,
      reconnectAttempts: 0,
      isConnecting: false
    };
    
    // Message listeners
    this.messageListeners = [];
    this.userListeners = [];
    this.channelListeners = [];
    
    // Remove listener functions (for cleanup)
    this.removeStatusListener = null;
    this.removeMessageListener = null;
    this.removeUserListener = null;
    this.removeChannelListener = null;
    
    // Set up connection status listener
    this.setupConnectionListener();
    
    // Set up message listeners
    this.setupMessageListener();
    this.setupUserListener();
    this.setupChannelListener();
  }
  
  /**
   * Notify all listeners of state changes
   */
  notifyListeners() {
    const state = this.getConnectionState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[WebSocketContext] Error in WebSocket context listener:', error);
      }
    });
  }
  
  /**
   * Set up listener for connection state changes
   */
  setupConnectionListener() {
    // Remove existing listener if any
    if (this.removeStatusListener) {
      this.removeStatusListener();
    }
    
    // Add new listener
    this.removeStatusListener = addConnectionStatusListener(status => {
      const oldStatus = this.connectionState.status;
      
      // Update connection state
      this.connectionState.status = status;
      
      // Track last connected time
      if (status === 'connected') {
        this.connectionState.lastConnected = new Date();
        this.connectionState.reconnectAttempts = 0;
        this.connectionState.isConnecting = false;
      } else if (status === 'connecting') {
        this.connectionState.isConnecting = true;
      } else if (status === 'disconnected') {
        this.connectionState.isConnecting = false;
        if (oldStatus === 'connecting') {
          this.connectionState.reconnectAttempts++;
        }
      }
      
      // Notify listeners
      this.notifyListeners();
      
      // Log state changes
      logChatEvent('websocket', 'Connection status changed', {
        status,
        previousStatus: oldStatus
      });
    });
  }
  
  /**
   * Set up listener for WebSocket messages
   */
  setupMessageListener() {
    // Remove existing listener if any
    if (this.removeMessageListener) {
      this.removeMessageListener();
    }
    
    // Add new listener
    this.removeMessageListener = addMessageListener(messages => {
      // Notify message listeners
      this.messageListeners.forEach(listener => {
        try {
          listener(messages);
        } catch (error) {
          console.error('[WebSocketContext] Error in message listener:', error);
        }
      });
    });
  }
  
  /**
   * Set up listener for user list updates
   */
  setupUserListener() {
    // Remove existing listener if any
    if (this.removeUserListener) {
      this.removeUserListener();
    }
    
    // Add new listener
    this.removeUserListener = addUserListListener(users => {
      // Notify user list listeners
      this.userListeners.forEach(listener => {
        try {
          listener(users);
        } catch (error) {
          console.error('[WebSocketContext] Error in user list listener:', error);
        }
      });
    });
  }
  
  /**
   * Set up listener for channel list updates
   */
  setupChannelListener() {
    // Remove existing listener if any
    if (this.removeChannelListener) {
      this.removeChannelListener();
    }
    
    // Add new listener
    this.removeChannelListener = addChannelListListener(channels => {
      // Notify channel list listeners
      this.channelListeners.forEach(listener => {
        try {
          listener(channels);
        } catch (error) {
          console.error('[WebSocketContext] Error in channel list listener:', error);
        }
      });
    });
  }
  
  /**
   * Connect to the WebSocket server
   * @returns {Promise<boolean>} Success status
   */
  async connectToServer() {
    try {
      // If already connected or connecting, do nothing
      if (this.connectionState.status === 'connected' || this.connectionState.isConnecting) {
        return true;
      }
      
      // Update state
      this.connectionState.isConnecting = true;
      this.notifyListeners();
      
      // Connect
      const result = await connect();
      
      return result;
    } catch (error) {
      console.error('[WebSocketContext] Connect error:', error);
      
      // Update state
      this.connectionState.isConnecting = false;
      this.notifyListeners();
      
      logChatEvent('websocket', 'Connect error', { error: error.message });
      
      return false;
    }
  }
  
  /**
   * Disconnect from the WebSocket server
   * @param {string} reason - Reason for disconnection
   * @returns {boolean} Success status
   */
  disconnectFromServer(reason = 'user_initiated') {
    try {
      // If already disconnected, do nothing
      if (this.connectionState.status === 'disconnected' && !this.connectionState.isConnecting) {
        return true;
      }
      
      // Disconnect
      const result = disconnect(reason);
      
      return result;
    } catch (error) {
      console.error('[WebSocketContext] Disconnect error:', error);
      logChatEvent('websocket', 'Disconnect error', { error: error.message });
      return false;
    }
  }
  
  /**
   * Send a WebSocket message
   * @param {string} type - Message type
   * @param {Object} payload - Message payload
   * @returns {boolean} Success status
   */
  sendWebSocketMessage(type, payload) {
    try {
      // Check connection
      if (this.connectionState.status !== 'connected') {
        console.warn('[WebSocketContext] Cannot send message, not connected');
        return false;
      }
      
      // Send message
      return sendMessage({
        type,
        payload
      });
    } catch (error) {
      console.error('[WebSocketContext] Send message error:', error);
      logChatEvent('websocket', 'Send message error', { error: error.message });
      return false;
    }
  }
  
  /**
   * Broadcast a WebSocket message using the broadcaster service
   * @param {string} eventType - Event type
   * @param {Object} payload - Event payload
   * @param {boolean} immediate - Whether to bypass throttling
   * @returns {boolean} Success status
   */
  broadcastEvent(eventType, payload, immediate = false) {
    try {
      // Check connection
      if (this.connectionState.status !== 'connected') {
        console.warn('[WebSocketContext] Cannot broadcast event, not connected');
        return false;
      }
      
      // Broadcast event
      return broadcast(eventType, payload, immediate);
    } catch (error) {
      console.error('[WebSocketContext] Broadcast error:', error);
      logChatEvent('websocket', 'Broadcast error', { error: error.message });
      return false;
    }
  }
  
  /**
   * Send a typing indicator
   * @param {string} channelId - Channel ID (null for direct message)
   * @param {string} recipientId - Recipient ID (null for channel message)
   * @param {boolean} isTyping - Whether the user is typing
   * @returns {boolean} Success status
   */
  sendTypingIndicator(channelId, recipientId, isTyping) {
    try {
      return broadcastTypingIndicator(channelId, recipientId, isTyping);
    } catch (error) {
      console.error('[WebSocketContext] Typing indicator error:', error);
      return false;
    }
  }
  
  /**
   * Send read status for messages
   * @param {Array} messageIds - IDs of messages that were read
   * @param {string} channelId - Channel ID (optional)
   * @returns {boolean} Success status
   */
  sendReadStatus(messageIds, channelId = null) {
    try {
      return broadcastReadStatus(messageIds, channelId);
    } catch (error) {
      console.error('[WebSocketContext] Read status error:', error);
      return false;
    }
  }
  
  /**
   * Update user status
   * @param {string} status - User status ('online', 'away', 'busy', 'offline')
   * @returns {boolean} Success status
   */
  updateUserStatus(status) {
    try {
      return broadcastUserStatus(status);
    } catch (error) {
      console.error('[WebSocketContext] User status error:', error);
      return false;
    }
  }
  
  /**
   * Request a specific channel list
   * @returns {boolean} Success status
   */
  fetchChannelList() {
    try {
      // Check connection
      if (this.connectionState.status !== 'connected') {
        console.warn('[WebSocketContext] Cannot fetch channels, not connected');
        return false;
      }
      
      return requestChannelList();
    } catch (error) {
      console.error('[WebSocketContext] Fetch channels error:', error);
      return false;
    }
  }
  
  /**
   * Request user list
   * @param {boolean} includeOffline - Whether to include offline users
   * @returns {boolean} Success status
   */
  fetchUserList(includeOffline = false) {
    try {
      // Check connection
      if (this.connectionState.status !== 'connected') {
        console.warn('[WebSocketContext] Cannot fetch users, not connected');
        return false;
      }
      
      return requestUserList(includeOffline);
    } catch (error) {
      console.error('[WebSocketContext] Fetch users error:', error);
      return false;
    }
  }
  
  /**
   * Join a channel
   * @param {string} channelId - Channel ID
   * @returns {boolean} Success status
   */
  joinChannelWebSocket(channelId) {
    try {
      // Check connection
      if (this.connectionState.status !== 'connected') {
        console.warn('[WebSocketContext] Cannot join channel, not connected');
        return false;
      }
      
      return joinChannel(channelId);
    } catch (error) {
      console.error('[WebSocketContext] Join channel error:', error);
      return false;
    }
  }
  
  /**
   * Leave a channel
   * @param {string} channelId - Channel ID
   * @returns {boolean} Success status
   */
  leaveChannelWebSocket(channelId) {
    try {
      // Check connection
      if (this.connectionState.status !== 'connected') {
        console.warn('[WebSocketContext] Cannot leave channel, not connected');
        return false;
      }
      
      return leaveChannel(channelId);
    } catch (error) {
      console.error('[WebSocketContext] Leave channel error:', error);
      return false;
    }
  }
  
  /**
   * Get current connection state
   * @returns {Object} Current connection state
   */
  getConnectionState() {
    return { ...this.connectionState };
  }
  
  /**
   * Subscribe to connection state changes
   * @param {Function} listener - Callback for state changes
   * @returns {Function} Unsubscribe function
   */
  subscribeToConnection(listener) {
    if (typeof listener !== 'function') {
      console.error('[WebSocketContext] Connection listener must be a function');
      return () => {};
    }
    
    this.listeners.push(listener);
    
    // Immediately notify with current state
    listener(this.getConnectionState());
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Subscribe to message updates
   * @param {Function} listener - Callback for message updates
   * @returns {Function} Unsubscribe function
   */
  subscribeToMessages(listener) {
    if (typeof listener !== 'function') {
      console.error('[WebSocketContext] Message listener must be a function');
      return () => {};
    }
    
    this.messageListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Subscribe to user list updates
   * @param {Function} listener - Callback for user list updates
   * @returns {Function} Unsubscribe function
   */
  subscribeToUsers(listener) {
    if (typeof listener !== 'function') {
      console.error('[WebSocketContext] User listener must be a function');
      return () => {};
    }
    
    this.userListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.userListeners = this.userListeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Subscribe to channel list updates
   * @param {Function} listener - Callback for channel list updates
   * @returns {Function} Unsubscribe function
   */
  subscribeToChannels(listener) {
    if (typeof listener !== 'function') {
      console.error('[WebSocketContext] Channel listener must be a function');
      return () => {};
    }
    
    this.channelListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.channelListeners = this.channelListeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    // Disconnect from server
    this.disconnectFromServer('context_destroyed');
    
    // Remove all listeners
    if (this.removeStatusListener) {
      this.removeStatusListener();
    }
    
    if (this.removeMessageListener) {
      this.removeMessageListener();
    }
    
    if (this.removeUserListener) {
      this.removeUserListener();
    }
    
    if (this.removeChannelListener) {
      this.removeChannelListener();
    }
    
    // Clear listener arrays
    this.listeners = [];
    this.messageListeners = [];
    this.userListeners = [];
    this.channelListeners = [];
    
    logChatEvent('websocket', 'WebSocket context destroyed');
  }
}

// Create singleton instance
const webSocketContext = new WebSocketContext();
export default webSocketContext;