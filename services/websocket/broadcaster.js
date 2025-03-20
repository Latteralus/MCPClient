// services/websocket/broadcaster.js
// WebSocket event broadcasting for HIPAA-compliant chat

import { logChatEvent } from '../../utils/logger.js';
import { sendMessage, getConnectionStatus } from './connection.js';
import auth from '../api/auth.js';

// Throttle intervals for different event types (in milliseconds)
const THROTTLE_INTERVALS = {
  typing: 2000, // 2 seconds
  presence: 5000, // 5 seconds
  read: 1000, // 1 second
  default: 100 // Default throttle (100ms)
};

// Store last broadcast times to implement throttling
const lastBroadcastTimes = {};

/**
 * Broadcast a message to other clients
 * @param {string} eventType - Type of event to broadcast
 * @param {Object} payload - Event payload
 * @param {boolean} immediate - Whether to bypass throttling
 * @returns {boolean} Success status
 */
export function broadcast(eventType, payload, immediate = false) {
  try {
    // Check connection status
    if (getConnectionStatus() !== 'connected') {
      console.warn('[WebSocket Broadcaster] Cannot broadcast, not connected');
      return false;
    }
    
    // Check authentication
    if (!auth.isAuthenticated()) {
      console.warn('[WebSocket Broadcaster] Cannot broadcast, not authenticated');
      return false;
    }
    
    // Check throttling unless immediate flag is set
    if (!immediate && shouldThrottle(eventType)) {
      return false;
    }
    
    // Add timestamp if not present
    if (!payload.timestamp) {
      payload.timestamp = new Date().toISOString();
    }
    
    // Create message
    const message = {
      type: eventType,
      payload
    };
    
    // Send the message
    const result = sendMessage(message);
    
    if (result) {
      // Update last broadcast time for throttling
      lastBroadcastTimes[eventType] = Date.now();
      
      // Log broadcast (for non-frequent events)
      if (eventType !== 'typing' && eventType !== 'presence' && eventType !== 'heartbeat') {
        logChatEvent('websocket', 'Event broadcasted', {
          eventType,
          payloadSize: JSON.stringify(payload).length
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error('[WebSocket Broadcaster] Broadcast error:', error);
    return false;
  }
}

/**
 * Check if an event should be throttled
 * @param {string} eventType - Type of event
 * @returns {boolean} True if event should be throttled
 */
function shouldThrottle(eventType) {
  const now = Date.now();
  const lastTime = lastBroadcastTimes[eventType] || 0;
  const throttleTime = THROTTLE_INTERVALS[eventType] || THROTTLE_INTERVALS.default;
  
  return (now - lastTime) < throttleTime;
}

/**
 * Broadcast a typing indicator
 * @param {string} channelId - Channel ID (null for direct message)
 * @param {string} recipientId - Recipient ID (null for channel message)
 * @param {boolean} isTyping - Whether the user is typing
 * @returns {boolean} Success status
 */
export function broadcastTypingIndicator(channelId, recipientId, isTyping) {
  const eventType = isTyping ? 'typing_start' : 'typing_stop';
  
  const payload = {
    channelId: channelId || null,
    recipientId: recipientId || null
  };
  
  return broadcast(eventType, payload);
}

/**
 * Broadcast read status for messages
 * @param {Array} messageIds - IDs of messages that were read
 * @param {string} channelId - Channel ID (optional)
 * @returns {boolean} Success status
 */
export function broadcastReadStatus(messageIds, channelId = null) {
  if (!messageIds || !messageIds.length) {
    return false;
  }
  
  const payload = {
    messageIds,
    channelId: channelId || null
  };
  
  return broadcast('message_read', payload);
}

/**
 * Broadcast user status
 * @param {string} status - User status ('online', 'away', 'busy', 'offline')
 * @returns {boolean} Success status
 */
export function broadcastUserStatus(status) {
  if (!status) {
    return false;
  }
  
  const payload = { status };
  
  return broadcast('user_status', payload);
}

/**
 * Broadcast a message edit
 * @param {string} messageId - Message ID
 * @param {string} newText - New message text
 * @returns {boolean} Success status
 */
export function broadcastMessageEdit(messageId, newText) {
  if (!messageId || !newText) {
    return false;
  }
  
  const payload = {
    messageId,
    text: newText,
    edited: true,
    editTimestamp: new Date().toISOString()
  };
  
  return broadcast('message_edit', payload, true); // Skip throttling for edits
}

/**
 * Broadcast a message deletion
 * @param {string} messageId - Message ID
 * @returns {boolean} Success status
 */
export function broadcastMessageDeletion(messageId) {
  if (!messageId) {
    return false;
  }
  
  const payload = {
    messageId,
    deletedTimestamp: new Date().toISOString()
  };
  
  return broadcast('message_delete', payload, true); // Skip throttling for deletions
}

/**
 * Broadcast a presence update (e.g. user joined/left channel)
 * @param {string} action - Action ('join' or 'leave')
 * @param {string} channelId - Channel ID
 * @returns {boolean} Success status
 */
export function broadcastPresence(action, channelId) {
  if (!action || !channelId) {
    return false;
  }
  
  const payload = {
    action,
    channelId
  };
  
  return broadcast('presence', payload);
}

/**
 * Reset throttling timers
 */
export function resetThrottling() {
  Object.keys(lastBroadcastTimes).forEach(key => {
    delete lastBroadcastTimes[key];
  });
  
  console.log('[WebSocket Broadcaster] Throttling timers reset');
}

export default {
  broadcast,
  broadcastTypingIndicator,
  broadcastReadStatus,
  broadcastUserStatus,
  broadcastMessageEdit,
  broadcastMessageDeletion,
  broadcastPresence,
  resetThrottling
};