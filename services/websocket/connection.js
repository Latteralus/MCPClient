// services/websocket/connection.js
// WebSocket connection management for HIPAA-compliant chat

import { logChatEvent } from '../../utils/logger.js';
import { getConfig } from '../../config/index.js';
import auth from '../api/auth.js';
import messageService from '../api/messages.js';
import userService from '../api/users.js';
import channelService from '../api/channels.js';
import handlers from './handlers.js';

// WebSocket connection state
let socket = null;
let connectionStatus = 'disconnected'; // disconnected, connecting, connected
let reconnectAttempts = 0;
let reconnectTimer = null;
let heartbeatTimer = null;
let lastHeartbeatResponse = null;

// Listeners
const statusListeners = [];
const messageListeners = [];
const userListeners = [];
const channelListeners = [];

/**
 * Initialize the WebSocket connection
 * @returns {boolean} Success status
 */
export function initWebSocketService() {
  try {
    // Register default handlers
    handlers.registerDefaultHandlers();
    
    logChatEvent('system', 'WebSocket service initialized');
    return true;
  } catch (error) {
    console.error('[WebSocket Service] Initialization error:', error);
    logChatEvent('system', 'WebSocket service initialization error', { error: error.message });
    return false;
  }
}

/**
 * Connect to the WebSocket server
 * @returns {Promise<boolean>} Success status
 */
export async function connect() {
  try {
    // Don't attempt to connect if already connected or connecting
    if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
      return true;
    }

    // Must be authenticated to connect
    if (!auth.isAuthenticated()) {
      console.error('[WebSocket Service] Not authenticated, cannot connect');
      return false;
    }

    // Update status
    updateConnectionStatus('connecting');
    
    // Get WebSocket URL from config
    const serverUrl = getConfig('server.url', 'ws://localhost:3000');
    
    // Get auth token
    const token = auth.getAuthToken();
    if (!token) {
      console.error('[WebSocket Service] No authentication token available');
      updateConnectionStatus('disconnected');
      return false;
    }
    
    // Log connection attempt
    logChatEvent('websocket', 'Connection attempt', {
      serverUrl,
      reconnectAttempt: reconnectAttempts > 0
    });
    
    // Create WebSocket connection with token
    const url = `${serverUrl}?token=${encodeURIComponent(token)}`;
    socket = new WebSocket(url);
    
    // Set up connection timeout
    const connectionTimeout = setTimeout(() => {
      if (connectionStatus === 'connecting') {
        console.error('[WebSocket Service] Connection timeout');
        socket.close();
        updateConnectionStatus('disconnected');
        
        // Try to reconnect
        scheduleReconnect();
      }
    }, getConfig('server.connectionTimeout', 10000));
    
    // Set up event handlers
    socket.onopen = () => {
      clearTimeout(connectionTimeout);
      console.log('[WebSocket Service] Connected to server');
      
      // Update status
      updateConnectionStatus('connected');
      
      // Reset reconnect attempts
      reconnectAttempts = 0;
      
      // Start heartbeat
      startHeartbeat();
      
      // Log successful connection
      logChatEvent('websocket', 'Connected');
      
      // Request initial data
      requestInitialData();
    };
    
    socket.onclose = (event) => {
      clearTimeout(connectionTimeout);
      console.log('[WebSocket Service] Connection closed:', event.code, event.reason);
      
      // Update status
      updateConnectionStatus('disconnected');
      
      // Stop heartbeat
      stopHeartbeat();
      
      // Log disconnection
      logChatEvent('websocket', 'Disconnected', {
        code: event.code,
        reason: event.reason || 'No reason provided'
      });
      
      // Try to reconnect
      scheduleReconnect();
    };
    
    socket.onerror = (error) => {
      console.error('[WebSocket Service] Connection error:', error);
      
      // Log error
      logChatEvent('websocket', 'Connection error');
      
      // The onclose handler will be called after this
    };
    
    socket.onmessage = handleMessage;
    
    return true;
  } catch (error) {
    console.error('[WebSocket Service] Connection error:', error);
    updateConnectionStatus('disconnected');
    
    // Log error
    logChatEvent('websocket', 'Connection setup error', {
      error: error.message
    });
    
    // Try to reconnect
    scheduleReconnect();
    
    return false;
  }
}

/**
 * Disconnect from the WebSocket server
 * @param {string} reason - Reason for disconnection
 * @returns {boolean} Success status
 */
export function disconnect(reason = 'user_initiated') {
  try {
    // Stop reconnection attempts
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    // Stop heartbeat
    stopHeartbeat();
    
    // Close connection if open
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      socket.close(1000, reason);
      
      // Log disconnection
      logChatEvent('websocket', 'Disconnect requested', { reason });
    }
    
    // Update status
    updateConnectionStatus('disconnected');
    
    return true;
  } catch (error) {
    console.error('[WebSocket Service] Disconnect error:', error);
    
    // Log error
    logChatEvent('websocket', 'Disconnect error', { error: error.message });
    
    return false;
  }
}

/**
 * Handle incoming WebSocket messages
 * @param {MessageEvent} event - WebSocket message event
 */
function handleMessage(event) {
  try {
    // Parse message data
    const data = JSON.parse(event.data);
    
    // Log message (but not heartbeats)
    if (data.type !== 'heartbeat') {
      logChatEvent('websocket', 'Message received', { 
        type: data.type,
        payloadSize: event.data.length
      });
    }
    
    // Process message
    switch (data.type) {
      case 'heartbeat':
        // Handle heartbeat response
        lastHeartbeatResponse = new Date();
        break;
        
      case 'message':
        // Process new message(s)
        if (data.payload && Array.isArray(data.payload)) {
          messageService.processIncomingMessages(data.payload);
          notifyMessageListeners(data.payload);
        }
        break;
        
      case 'user_status':
        // Process user status update
        if (data.payload) {
          if (Array.isArray(data.payload)) {
            // Multiple user statuses (initial load)
            userService.setOnlineUsers(data.payload);
            notifyUserListeners(data.payload);
          } else {
            // Single user status update
            userService.processUserStatusUpdate(data.payload);
            notifyUserListeners([data.payload]);
          }
        }
        break;
        
      case 'channel_update':
        // Process channel update
        if (data.payload) {
          if (Array.isArray(data.payload)) {
            // Multiple channels (initial load)
            channelService.setAvailableChannels(data.payload);
            notifyChannelListeners(data.payload);
          } else {
            // Single channel update
            channelService.processChannelUpdate(data.payload);
            notifyChannelListeners([data.payload]);
          }
        }
        break;
        
      case 'error':
        // Handle error message
        console.error('[WebSocket Service] Server error:', data.payload);
        logChatEvent('websocket', 'Server error', {
          error: data.payload?.message || 'Unknown error'
        });
        break;
        
      default:
        // Use registered message handlers
        if (handlers.hasHandler(data.type)) {
          handlers.handleMessage(data.type, data.payload);
        } else {
          console.warn('[WebSocket Service] Unhandled message type:', data.type);
        }
    }
  } catch (error) {
    console.error('[WebSocket Service] Error handling message:', error);
    logChatEvent('websocket', 'Message handling error', { error: error.message });
  }
}

/**
 * Schedule a reconnection attempt
 */
function scheduleReconnect() {
  // Don't schedule if already scheduled
  if (reconnectTimer) {
    return;
  }
  
  // Don't try to reconnect if reconnection is disabled
  if (!getConfig('server.reconnect.maxAttempts', 5)) {
    console.log('[WebSocket Service] Reconnection disabled');
    return;
  }
  
  // Check if max attempts reached
  const maxAttempts = getConfig('server.reconnect.maxAttempts', 5);
  if (reconnectAttempts >= maxAttempts) {
    console.log('[WebSocket Service] Max reconnection attempts reached');
    logChatEvent('websocket', 'Max reconnection attempts reached');
    return;
  }
  
  // Calculate delay with exponential backoff
  const baseDelay = getConfig('server.reconnect.delay', 5000);
  let delay = baseDelay;
  
  if (getConfig('server.reconnect.useExponentialBackoff', true)) {
    delay = baseDelay * Math.pow(1.5, reconnectAttempts);
  }
  
  // Cap at 30 seconds
  delay = Math.min(delay, 30000);
  
  // Increment attempts
  reconnectAttempts++;
  
  console.log(`[WebSocket Service] Scheduling reconnection attempt ${reconnectAttempts} in ${delay}ms`);
  
  // Schedule reconnection
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

/**
 * Start the heartbeat mechanism
 */
function startHeartbeat() {
  // Clear any existing timer
  stopHeartbeat();
  
  // Get heartbeat interval from config
  const interval = getConfig('server.heartbeatInterval', 30000);
  
  // Initialize last response time
  lastHeartbeatResponse = new Date();
  
  // Start heartbeat timer
  heartbeatTimer = setInterval(() => {
    // Check if connection is open
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      stopHeartbeat();
      return;
    }
    
    // Check if we received a response to the previous heartbeat
    if (lastHeartbeatResponse) {
      const now = new Date();
      const timeSinceLastResponse = now - lastHeartbeatResponse;
      
      // If no response for 2.5x the interval, consider connection dead
      if (timeSinceLastResponse > interval * 2.5) {
        console.error('[WebSocket Service] Heartbeat timeout, closing connection');
        socket.close(4000, 'Heartbeat timeout');
        stopHeartbeat();
        return;
      }
    }
    
    // Send heartbeat
    sendMessage({
      type: 'heartbeat',
      payload: {
        timestamp: new Date().toISOString()
      }
    });
  }, interval);
}

/**
 * Stop the heartbeat mechanism
 */
function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/**
 * Update connection status and notify listeners
 * @param {string} status - New connection status
 */
function updateConnectionStatus(status) {
  connectionStatus = status;
  
  // Notify status listeners
  notifyStatusListeners(status);
}

/**
 * Get current connection status
 * @returns {string} Connection status
 */
export function getConnectionStatus() {
  return connectionStatus;
}

/**
 * Send a message to the WebSocket server
 * @param {Object} message - Message to send
 * @returns {boolean} Success status
 */
export function sendMessage(message) {
  try {
    // Check if connected
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('[WebSocket Service] Cannot send message, not connected');
      return false;
    }
    
    // Add timestamp if not present
    if (!message.timestamp) {
      message.timestamp = new Date().toISOString();
    }
    
    // Convert to JSON
    const messageJson = JSON.stringify(message);
    
    // Send message
    socket.send(messageJson);
    
    // Log message (but not heartbeats)
    if (message.type !== 'heartbeat') {
      logChatEvent('websocket', 'Message sent', { 
        type: message.type,
        payloadSize: messageJson.length
      });
    }
    
    return true;
  } catch (error) {
    console.error('[WebSocket Service] Send message error:', error);
    
    // Log error
    logChatEvent('websocket', 'Send message error', { error: error.message });
    
    return false;
  }
}

/**
 * Request initial data after connection
 */
function requestInitialData() {
  // Request user list
  sendMessage({
    type: 'request_users',
    payload: {
      includeOffline: false
    }
  });
  
  // Request channel list
  sendMessage({
    type: 'request_channels',
    payload: {}
  });
}

/**
 * Request channel list from server
 */
export function requestChannelList() {
  sendMessage({
    type: 'request_channels',
    payload: {}
  });
}

/**
 * Request user list from server
 * @param {boolean} includeOffline - Whether to include offline users
 */
export function requestUserList(includeOffline = false) {
  sendMessage({
    type: 'request_users',
    payload: {
      includeOffline
    }
  });
}

/**
 * Join a channel
 * @param {string} channelId - Channel ID to join
 */
export function joinChannel(channelId) {
  sendMessage({
    type: 'join_channel',
    payload: {
      channelId
    }
  });
}

/**
 * Leave a channel
 * @param {string} channelId - Channel ID to leave
 */
export function leaveChannel(channelId) {
  sendMessage({
    type: 'leave_channel',
    payload: {
      channelId
    }
  });
}

/**
 * Add connection status listener
 * @param {Function} listener - Status listener callback
 * @returns {Function} Function to remove listener
 */
export function addConnectionStatusListener(listener) {
  if (typeof listener === 'function' && !statusListeners.includes(listener)) {
    statusListeners.push(listener);
    
    // Immediately notify with current status
    listener(connectionStatus);
  }
  
  // Return unsubscribe function
  return () => {
    const index = statusListeners.indexOf(listener);
    if (index !== -1) {
      statusListeners.splice(index, 1);
    }
  };
}

/**
 * Notify status listeners of connection status change
 * @param {string} status - Connection status
 */
function notifyStatusListeners(status) {
  statusListeners.forEach(listener => {
    try {
      listener(status);
    } catch (error) {
      console.error('[WebSocket Service] Error in status listener:', error);
    }
  });
}

/**
 * Add message listener
 * @param {Function} listener - Message listener callback
 * @returns {Function} Function to remove listener
 */
export function addMessageListener(listener) {
  if (typeof listener === 'function' && !messageListeners.includes(listener)) {
    messageListeners.push(listener);
  }
  
  // Return unsubscribe function
  return () => {
    const index = messageListeners.indexOf(listener);
    if (index !== -1) {
      messageListeners.splice(index, 1);
    }
  };
}

/**
 * Notify message listeners of new messages
 * @param {Array} messages - New messages
 */
function notifyMessageListeners(messages) {
  if (!messages || !messages.length) return;
  
  messageListeners.forEach(listener => {
    try {
      listener(messages);
    } catch (error) {
      console.error('[WebSocket Service] Error in message listener:', error);
    }
  });
}

/**
 * Add user list listener
 * @param {Function} listener - User list listener callback
 * @returns {Function} Function to remove listener
 */
export function addUserListListener(listener) {
  if (typeof listener === 'function' && !userListeners.includes(listener)) {
    userListeners.push(listener);
  }
  
  // Return unsubscribe function
  return () => {
    const index = userListeners.indexOf(listener);
    if (index !== -1) {
      userListeners.splice(index, 1);
    }
  };
}

/**
 * Notify user listeners of user updates
 * @param {Array} users - Updated users
 */
function notifyUserListeners(users) {
  if (!users || !users.length) return;
  
  userListeners.forEach(listener => {
    try {
      listener(users);
    } catch (error) {
      console.error('[WebSocket Service] Error in user listener:', error);
    }
  });
}

/**
 * Add channel list listener
 * @param {Function} listener - Channel list listener callback
 * @returns {Function} Function to remove listener
 */
export function addChannelListListener(listener) {
  if (typeof listener === 'function' && !channelListeners.includes(listener)) {
    channelListeners.push(listener);
  }
  
  // Return unsubscribe function
  return () => {
    const index = channelListeners.indexOf(listener);
    if (index !== -1) {
      channelListeners.splice(index, 1);
    }
  };
}

/**
 * Notify channel listeners of channel updates
 * @param {Array} channels - Updated channels
 */
function notifyChannelListeners(channels) {
  if (!channels || !channels.length) return;
  
  channelListeners.forEach(listener => {
    try {
      listener(channels);
    } catch (error) {
      console.error('[WebSocket Service] Error in channel listener:', error);
    }
  });
}

/**
 * Update the server URL
 * @param {string} url - New server URL
 * @returns {boolean} Success status
 */
export function updateServerUrl(url) {
  try {
    // Validate URL
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    // Update config
    setConfig('server.url', url);
    
    // Reconnect if connected
    if (connectionStatus === 'connected') {
      disconnect('server_url_changed');
      connect();
    }
    
    return true;
  } catch (error) {
    console.error('[WebSocket Service] Update server URL error:', error);
    return false;
  }
}

// Export service interface
export default {
  initWebSocketService,
  connect,
  disconnect,
  getConnectionStatus,
  sendMessage,
  addConnectionStatusListener,
  addMessageListener,
  addUserListListener,
  addChannelListListener,
  requestChannelList,
  requestUserList,
  joinChannel,
  leaveChannel,
  updateServerUrl
};