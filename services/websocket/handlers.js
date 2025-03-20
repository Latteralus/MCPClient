// services/websocket/handlers.js
// WebSocket message handlers for HIPAA-compliant chat

import { logChatEvent } from '../../utils/logger.js';
import userService from '../api/users.js';
import channelService from '../api/channels.js';
import messageService from '../api/messages.js';

// Store registered message handlers
const messageHandlers = {};

/**
 * Register a handler for a specific message type
 * @param {string} messageType - Type of message to handle
 * @param {Function} handler - Handler function for the message
 * @returns {boolean} Success status
 */
export function registerHandler(messageType, handler) {
  try {
    if (!messageType || typeof handler !== 'function') {
      console.error('[WebSocket Handlers] Invalid handler registration parameters');
      return false;
    }
    
    messageHandlers[messageType] = handler;
    console.log(`[WebSocket Handlers] Registered handler for "${messageType}" messages`);
    return true;
  } catch (error) {
    console.error('[WebSocket Handlers] Error registering handler:', error);
    return false;
  }
}

/**
 * Check if a handler exists for a message type
 * @param {string} messageType - Type of message
 * @returns {boolean} True if handler exists
 */
export function hasHandler(messageType) {
  return messageType && messageType in messageHandlers;
}

/**
 * Handle a message of a specific type
 * @param {string} messageType - Type of message
 * @param {Object} payload - Message payload
 * @returns {boolean} Success status
 */
export function handleMessage(messageType, payload) {
  try {
    if (!hasHandler(messageType)) {
      console.warn(`[WebSocket Handlers] No handler registered for "${messageType}" messages`);
      return false;
    }
    
    messageHandlers[messageType](payload);
    return true;
  } catch (error) {
    console.error(`[WebSocket Handlers] Error handling "${messageType}" message:`, error);
    
    logChatEvent('websocket', 'Message handling error', {
      messageType,
      error: error.message
    });
    
    return false;
  }
}

/**
 * Initialize default handlers for common message types
 */
export function registerDefaultHandlers() {
  // User events
  registerHandler('user_connected', handleUserConnected);
  registerHandler('user_disconnected', handleUserDisconnected);
  registerHandler('user_status_change', handleUserStatusChange);
  registerHandler('user_updated', handleUserUpdated);
  
  // Channel events
  registerHandler('channel_created', handleChannelCreated);
  registerHandler('channel_updated', handleChannelUpdated);
  registerHandler('channel_deleted', handleChannelDeleted);
  registerHandler('channel_member_join', handleChannelMemberJoin);
  registerHandler('channel_member_leave', handleChannelMemberLeave);
  
  // Message events
  registerHandler('new_message', handleNewMessage);
  registerHandler('message_updated', handleMessageUpdated);
  registerHandler('message_deleted', handleMessageDeleted);
  registerHandler('message_read', handleMessageRead);
  
  // Typing events
  registerHandler('typing_start', handleTypingStart);
  registerHandler('typing_stop', handleTypingStop);
  
  // System events
  registerHandler('server_notification', handleServerNotification);
  registerHandler('error', handleErrorMessage);
  
  console.log('[WebSocket Handlers] Default handlers registered');
}

/**
 * Reset all registered handlers
 */
export function resetHandlers() {
  Object.keys(messageHandlers).forEach(key => {
    delete messageHandlers[key];
  });
  
  console.log('[WebSocket Handlers] All handlers reset');
}

// Default handler implementations

/**
 * Handle user connected event
 * @param {Object} payload - Event payload
 */
function handleUserConnected(payload) {
  try {
    if (!payload || !payload.user) return;
    
    userService.processUserStatusUpdate({
      userId: payload.user.id,
      status: 'online',
      username: payload.user.username
    });
    
    logChatEvent('user', 'User connected', {
      userId: payload.user.id,
      username: payload.user.username
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling user connected:', error);
  }
}

/**
 * Handle user disconnected event
 * @param {Object} payload - Event payload
 */
function handleUserDisconnected(payload) {
  try {
    if (!payload || !payload.userId) return;
    
    userService.processUserStatusUpdate({
      userId: payload.userId,
      status: 'offline'
    });
    
    logChatEvent('user', 'User disconnected', {
      userId: payload.userId
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling user disconnected:', error);
  }
}

/**
 * Handle user status change event
 * @param {Object} payload - Event payload
 */
function handleUserStatusChange(payload) {
  try {
    if (!payload || !payload.userId || !payload.status) return;
    
    userService.processUserStatusUpdate({
      userId: payload.userId,
      status: payload.status
    });
    
    logChatEvent('user', 'User status changed', {
      userId: payload.userId,
      status: payload.status
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling user status change:', error);
  }
}

/**
 * Handle user updated event
 * @param {Object} payload - Event payload
 */
function handleUserUpdated(payload) {
  try {
    if (!payload || !payload.user) return;
    
    // Update user in online users if present
    const onlineUsers = userService.getOnlineUsers();
    const userIndex = onlineUsers.findIndex(u => u.id === payload.user.id);
    
    if (userIndex !== -1) {
      // Preserve status
      const status = onlineUsers[userIndex].status;
      
      userService.processUserStatusUpdate({
        userId: payload.user.id,
        status,
        username: payload.user.username
      });
    }
    
    logChatEvent('user', 'User updated', {
      userId: payload.user.id
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling user updated:', error);
  }
}

/**
 * Handle channel created event
 * @param {Object} payload - Event payload
 */
function handleChannelCreated(payload) {
  try {
    if (!payload || !payload.channel) return;
    
    channelService.processChannelUpdate({
      action: 'create',
      channel: payload.channel
    });
    
    logChatEvent('channel', 'Channel created', {
      channelId: payload.channel.id,
      name: payload.channel.name
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling channel created:', error);
  }
}

/**
 * Handle channel updated event
 * @param {Object} payload - Event payload
 */
function handleChannelUpdated(payload) {
  try {
    if (!payload || !payload.channel) return;
    
    channelService.processChannelUpdate({
      action: 'update',
      channel: payload.channel
    });
    
    logChatEvent('channel', 'Channel updated', {
      channelId: payload.channel.id,
      name: payload.channel.name
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling channel updated:', error);
  }
}

/**
 * Handle channel deleted event
 * @param {Object} payload - Event payload
 */
function handleChannelDeleted(payload) {
  try {
    if (!payload || !payload.channelId) return;
    
    channelService.processChannelUpdate({
      action: 'delete',
      channelId: payload.channelId
    });
    
    // Clear message cache for this channel
    messageService.clearChannelCache(payload.channelId);
    
    logChatEvent('channel', 'Channel deleted', {
      channelId: payload.channelId
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling channel deleted:', error);
  }
}

/**
 * Handle channel member join event
 * @param {Object} payload - Event payload
 */
function handleChannelMemberJoin(payload) {
  try {
    if (!payload || !payload.channelId || !payload.userId) return;
    
    channelService.processChannelUpdate({
      action: 'member_join',
      channelId: payload.channelId,
      userId: payload.userId
    });
    
    logChatEvent('channel', 'Member joined channel', {
      channelId: payload.channelId,
      userId: payload.userId
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling channel member join:', error);
  }
}

/**
 * Handle channel member leave event
 * @param {Object} payload - Event payload
 */
function handleChannelMemberLeave(payload) {
  try {
    if (!payload || !payload.channelId || !payload.userId) return;
    
    channelService.processChannelUpdate({
      action: 'member_leave',
      channelId: payload.channelId,
      userId: payload.userId
    });
    
    logChatEvent('channel', 'Member left channel', {
      channelId: payload.channelId,
      userId: payload.userId
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling channel member leave:', error);
  }
}

/**
 * Handle new message event
 * @param {Object} payload - Event payload
 */
function handleNewMessage(payload) {
  try {
    if (!payload || !payload.message) return;
    
    // Process the new message
    messageService.processIncomingMessages([payload.message]);
    
    logChatEvent('message', 'New message received', {
      messageId: payload.message.id,
      channelId: payload.message.channel || null
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling new message:', error);
  }
}

/**
 * Handle message updated event
 * @param {Object} payload - Event payload
 */
function handleMessageUpdated(payload) {
  try {
    if (!payload || !payload.messageId || !payload.updates) return;
    
    // Update the message
    messageService.processIncomingMessages([{
      id: payload.messageId,
      ...payload.updates,
      updated: true
    }]);
    
    logChatEvent('message', 'Message updated', {
      messageId: payload.messageId
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling message updated:', error);
  }
}

/**
 * Handle message deleted event
 * @param {Object} payload - Event payload
 */
function handleMessageDeleted(payload) {
  try {
    if (!payload || !payload.messageId) return;
    
    // Remove from message cache
    messageService.clearMessageFromCache(payload.messageId);
    
    logChatEvent('message', 'Message deleted', {
      messageId: payload.messageId
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling message deleted:', error);
  }
}

/**
 * Handle message read event
 * @param {Object} payload - Event payload
 */
function handleMessageRead(payload) {
  try {
    if (!payload || !payload.messageIds || !Array.isArray(payload.messageIds)) return;
    
    // Update messages as read
    payload.messageIds.forEach(messageId => {
      messageService.updateMessageInCache(messageId, { read: true });
    });
    
    logChatEvent('message', 'Messages marked as read', {
      count: payload.messageIds.length
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling message read:', error);
  }
}

/**
 * Handle typing start event
 * @param {Object} payload - Event payload
 */
function handleTypingStart(payload) {
  try {
    // This would normally update a UI component to show typing indicator
    // For now, just log it
    logChatEvent('message', 'User started typing', {
      userId: payload.userId,
      channelId: payload.channelId
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling typing start:', error);
  }
}

/**
 * Handle typing stop event
 * @param {Object} payload - Event payload
 */
function handleTypingStop(payload) {
  try {
    // This would normally update a UI component to hide typing indicator
    // For now, just log it
    logChatEvent('message', 'User stopped typing', {
      userId: payload.userId,
      channelId: payload.channelId
    });
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling typing stop:', error);
  }
}

/**
 * Handle server notification event
 * @param {Object} payload - Event payload
 */
function handleServerNotification(payload) {
  try {
    logChatEvent('system', 'Server notification', {
      message: payload.message || 'No message provided',
      type: payload.type || 'info'
    });
    
    // Could trigger UI notification here
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling server notification:', error);
  }
}

/**
 * Handle error message from server
 * @param {Object} payload - Event payload
 */
function handleErrorMessage(payload) {
  try {
    console.error('[WebSocket Handlers] Server error:', payload.message || 'Unknown error');
    
    logChatEvent('error', 'Server error', {
      message: payload.message || 'Unknown error',
      code: payload.code || 'UNKNOWN'
    });
    
    // Could trigger UI error notification here
  } catch (error) {
    console.error('[WebSocket Handlers] Error handling error message:', error);
  }
}

export default {
  registerHandler,
  hasHandler,
  handleMessage,
  registerDefaultHandlers,
  resetHandlers
};