// services/api/messages.js
// Message service for HIPAA-compliant chat

import api from './index.js';
import auth from './auth.js';
import { encryptMessage, decryptMessage } from '../encryption/encryption.js';
import { logChatEvent } from '../../utils/logger.js';
import { getConfig } from '../../config/index.js';

// In-memory cache for messages
const messageCache = {
  channels: {}, // channelId -> array of messages
  directMessages: {} // userId_userId -> array of messages (sorted by user IDs)
};

// Message listeners
let messageListeners = [];

/**
 * Send a chat message
 * @param {string} text - Message text
 * @param {string} channelId - Channel ID (null for direct message)
 * @param {string} recipientId - Recipient user ID (null for channel message)
 * @returns {Promise<Object>} Send result
 */
export async function sendChatMessage(text, channelId = null, recipientId = null) {
  try {
    if (!auth.isAuthenticated()) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }
    
    // Validate parameters
    if (!text || (!channelId && !recipientId)) {
      return {
        success: false,
        error: 'Invalid message parameters'
      };
    }
    
    // Create message object
    const currentUser = auth.getCurrentUser();
    const messageId = generateMessageId();
    
    const message = {
      id: messageId,
      text,
      sender: currentUser.id,
      timestamp: new Date().toISOString(),
      type: 'chat',
      encrypted: getConfig('hipaa.enableEncryption', true),
      read: false
    };
    
    // Add channel or recipient
    if (channelId) {
      message.channel = channelId;
    } else {
      message.recipient = recipientId;
    }
    
    // Encrypt the message if enabled
    let messageToSend = message;
    if (message.encrypted) {
      messageToSend = await encryptMessage(message);
      if (!messageToSend) {
        return {
          success: false,
          error: 'Message encryption failed'
        };
      }
    }
    
    // Call API to send message
    const response = await api.post('/messages', messageToSend);
    
    if (response.success) {
      // Log message sent
      logChatEvent('message', 'Message sent', {
        messageId,
        channelId: channelId || null,
        recipientId: recipientId || null,
        encrypted: message.encrypted
      });
      
      // Add to local cache
      addMessageToCache(message, channelId, recipientId);
      
      return {
        success: true,
        message
      };
    } else {
      logChatEvent('message', 'Message send failed', {
        channelId: channelId || null,
        recipientId: recipientId || null,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'Failed to send message'
      };
    }
  } catch (error) {
    console.error('[Message Service] Send message error:', error);
    
    logChatEvent('message', 'Message send error', {
      channelId: channelId || null,
      recipientId: recipientId || null,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while sending message'
    };
  }
}

/**
 * Generate a unique message ID
 * @returns {string} Unique message ID
 */
function generateMessageId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Get messages for a channel
 * @param {string} channelId - Channel ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of messages
 */
export async function getChannelMessages(channelId, options = {}) {
  try {
    if (!auth.isAuthenticated() || !channelId) {
      return [];
    }
    
    // Check cache first if not forcing refresh
    if (!options.forceRefresh && messageCache.channels[channelId]) {
      return messageCache.channels[channelId];
    }
    
    // Call API
    const response = await api.get(`/channels/${channelId}/messages`, {
      params: {
        limit: options.limit || 50,
        before: options.before || null,
        after: options.after || null
      }
    });
    
    if (response.success) {
      const messages = response.data.messages || [];
      
      // Decrypt messages if needed
      const decryptedMessages = await decryptMessages(messages);
      
      // Update cache
      messageCache.channels[channelId] = decryptedMessages;
      
      return decryptedMessages;
    } else {
      console.error('[Message Service] Get channel messages error:', response.message);
      return messageCache.channels[channelId] || [];
    }
  } catch (error) {
    console.error('[Message Service] Get channel messages error:', error);
    return messageCache.channels[channelId] || [];
  }
}

/**
 * Get direct messages between two users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of messages
 */
export async function getDirectMessages(userId1, userId2, options = {}) {
  try {
    if (!auth.isAuthenticated() || !userId1 || !userId2) {
      return [];
    }
    
    // Sort user IDs to create consistent conversation key
    const conversationKey = [userId1, userId2].sort().join('_');
    
    // Check cache first if not forcing refresh
    if (!options.forceRefresh && messageCache.directMessages[conversationKey]) {
      return messageCache.directMessages[conversationKey];
    }
    
    // Call API
    const response = await api.get('/messages/direct', {
      params: {
        otherUserId: userId1 === auth.getCurrentUser().id ? userId2 : userId1,
        limit: options.limit || 50,
        before: options.before || null,
        after: options.after || null
      }
    });
    
    if (response.success) {
      const messages = response.data.messages || [];
      
      // Decrypt messages if needed
      const decryptedMessages = await decryptMessages(messages);
      
      // Update cache
      messageCache.directMessages[conversationKey] = decryptedMessages;
      
      return decryptedMessages;
    } else {
      console.error('[Message Service] Get direct messages error:', response.message);
      return messageCache.directMessages[conversationKey] || [];
    }
  } catch (error) {
    console.error('[Message Service] Get direct messages error:', error);
    return messageCache.directMessages[conversationKey] || [];
  }
}

/**
 * Add a message to the local cache
 * @param {Object} message - Message to add
 * @param {string} channelId - Channel ID (optional)
 * @param {string} recipientId - Recipient ID (optional)
 */
function addMessageToCache(message, channelId = null, recipientId = null) {
  try {
    if (channelId) {
      // Channel message
      if (!messageCache.channels[channelId]) {
        messageCache.channels[channelId] = [];
      }
      
      // Add to cache
      messageCache.channels[channelId].push(message);
      
      // Sort by timestamp
      messageCache.channels[channelId].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      // Trim to max messages
      const maxMessages = getConfig('storage.maxMessagesPerChannel', 100);
      if (messageCache.channels[channelId].length > maxMessages) {
        messageCache.channels[channelId] = messageCache.channels[channelId].slice(-maxMessages);
      }
    } else if (recipientId) {
      // Direct message
      const currentUser = auth.getCurrentUser();
      const conversationKey = [currentUser.id, recipientId].sort().join('_');
      
      if (!messageCache.directMessages[conversationKey]) {
        messageCache.directMessages[conversationKey] = [];
      }
      
      // Add to cache
      messageCache.directMessages[conversationKey].push(message);
      
      // Sort by timestamp
      messageCache.directMessages[conversationKey].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      // Trim to max messages
      const maxMessages = getConfig('storage.maxMessagesPerChannel', 100);
      if (messageCache.directMessages[conversationKey].length > maxMessages) {
        messageCache.directMessages[conversationKey] = 
          messageCache.directMessages[conversationKey].slice(-maxMessages);
      }
    }
  } catch (error) {
    console.error('[Message Service] Add message to cache error:', error);
  }
}

/**
 * Decrypt an array of messages
 * @param {Array} messages - Encrypted messages
 * @returns {Promise<Array>} Decrypted messages
 */
async function decryptMessages(messages) {
  try {
    if (!messages || !Array.isArray(messages)) {
      return [];
    }
    
    const decryptedMessages = [];
    
    for (const message of messages) {
      if (message.encrypted) {
        try {
          const decrypted = await decryptMessage(message);
          decryptedMessages.push(decrypted);
        } catch (error) {
          console.error('[Message Service] Message decryption error:', error);
          // Add original message with error indicator
          decryptedMessages.push({
            ...message,
            text: '[Encrypted message - unable to decrypt]',
            decryptionFailed: true
          });
        }
      } else {
        decryptedMessages.push(message);
      }
    }
    
    return decryptedMessages;
  } catch (error) {
    console.error('[Message Service] Decrypt messages error:', error);
    return messages; // Return original messages on error
  }
}

/**
 * Edit a message
 * @param {string} messageId - Message ID
 * @param {string} newText - New message text
 * @returns {Promise<Object>} Edit result
 */
export async function editMessage(messageId, newText) {
  try {
    if (!auth.isAuthenticated()) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }
    
    // Validate parameters
    if (!messageId || !newText) {
      return {
        success: false,
        error: 'Invalid edit parameters'
      };
    }
    
    // Call API
    const response = await api.put(`/messages/${messageId}`, {
      text: newText
    });
    
    if (response.success) {
      logChatEvent('message', 'Message edited', {
        messageId
      });
      
      // Update message in cache
      updateMessageInCache(messageId, { text: newText });
      
      return {
        success: true,
        message: response.data.message
      };
    } else {
      logChatEvent('message', 'Message edit failed', {
        messageId,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'Failed to edit message'
      };
    }
  } catch (error) {
    console.error('[Message Service] Edit message error:', error);
    
    logChatEvent('message', 'Message edit error', {
      messageId,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while editing message'
    };
  }
}

/**
 * Delete a message
 * @param {string} messageId - Message ID
 * @returns {Promise<Object>} Delete result
 */
export async function deleteMessage(messageId) {
  try {
    if (!auth.isAuthenticated()) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }
    
    // Call API
    const response = await api.delete(`/messages/${messageId}`);
    
    if (response.success) {
      logChatEvent('message', 'Message deleted', {
        messageId
      });
      
      // Remove message from cache
      removeMessageFromCache(messageId);
      
      return { success: true };
    } else {
      logChatEvent('message', 'Message deletion failed', {
        messageId,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'Failed to delete message'
      };
    }
  } catch (error) {
    console.error('[Message Service] Delete message error:', error);
    
    logChatEvent('message', 'Message deletion error', {
      messageId,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while deleting message'
    };
  }
}

/**
 * Mark messages as read
 * @param {Array} messageIds - Message IDs to mark as read
 * @returns {Promise<Object>} Result
 */
export async function markMessagesAsRead(messageIds) {
  try {
    if (!auth.isAuthenticated() || !messageIds || !messageIds.length) {
      return {
        success: false,
        error: 'Invalid parameters'
      };
    }
    
    // Call API
    const response = await api.post('/messages/read', {
      messageIds
    });
    
    if (response.success) {
      // Update messages in cache
      messageIds.forEach(id => {
        updateMessageInCache(id, { read: true });
      });
      
      return { success: true };
    } else {
      console.error('[Message Service] Mark messages as read failed:', response.message);
      return {
        success: false,
        error: response.message || 'Failed to mark messages as read'
      };
    }
  } catch (error) {
    console.error('[Message Service] Mark messages as read error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
}

/**
 * Update a message in the cache
 * @param {string} messageId - Message ID
 * @param {Object} updates - Message updates
 */
function updateMessageInCache(messageId, updates) {
  try {
    // Update in channel cache
    Object.keys(messageCache.channels).forEach(channelId => {
      const index = messageCache.channels[channelId].findIndex(m => m.id === messageId);
      if (index !== -1) {
        messageCache.channels[channelId][index] = {
          ...messageCache.channels[channelId][index],
          ...updates
        };
      }
    });
    
    // Update in direct messages cache
    Object.keys(messageCache.directMessages).forEach(conversationKey => {
      const index = messageCache.directMessages[conversationKey].findIndex(m => m.id === messageId);
      if (index !== -1) {
        messageCache.directMessages[conversationKey][index] = {
          ...messageCache.directMessages[conversationKey][index],
          ...updates
        };
      }
    });
    
    // Notify message listeners
    notifyMessageListeners([
      {
        type: 'update',
        messageId,
        updates
      }
    ]);
  } catch (error) {
    console.error('[Message Service] Update message in cache error:', error);
  }
}

/**
 * Remove a message from the cache
 * @param {string} messageId - Message ID
 */
function removeMessageFromCache(messageId) {
  try {
    // Remove from channel cache
    Object.keys(messageCache.channels).forEach(channelId => {
      messageCache.channels[channelId] = messageCache.channels[channelId].filter(m => m.id !== messageId);
    });
    
    // Remove from direct messages cache
    Object.keys(messageCache.directMessages).forEach(conversationKey => {
      messageCache.directMessages[conversationKey] = messageCache.directMessages[conversationKey].filter(m => m.id !== messageId);
    });
    
    // Notify message listeners
    notifyMessageListeners([
      {
        type: 'delete',
        messageId
      }
    ]);
  } catch (error) {
    console.error('[Message Service] Remove message from cache error:', error);
  }
}

/**
 * Add a message listener
 * @param {Function} listener - Callback for message updates
 * @returns {Function} Unsubscribe function
 */
export function addMessageListener(listener) {
  if (typeof listener === 'function' && !messageListeners.includes(listener)) {
    messageListeners.push(listener);
  }
  
  // Return unsubscribe function
  return () => {
    messageListeners = messageListeners.filter(l => l !== listener);
  };
}

/**
 * Notify all message listeners
 * @param {Array} updates - Message updates
 */
function notifyMessageListeners(updates) {
  if (!updates || !updates.length) return;
  
  messageListeners.forEach(listener => {
    try {
      listener(updates);
    } catch (error) {
      console.error('[Message Service] Error in message listener:', error);
    }
  });
}

/**
 * Process incoming messages from WebSocket
 * @param {Array} messages - New messages
 */
export function processIncomingMessages(messages) {
  if (!messages || !messages.length) return;
  
  const processedMessages = [];
  
  // Process each message
  messages.forEach(async message => {
    try {
      // Decrypt if needed
      let processedMessage = message;
      if (message.encrypted) {
        try {
          processedMessage = await decryptMessage(message);
        } catch (error) {
          console.error('[Message Service] Failed to decrypt incoming message:', error);
          processedMessage = {
            ...message,
            text: '[Encrypted message - unable to decrypt]',
            decryptionFailed: true
          };
        }
      }
      
      // Add to cache
      if (processedMessage.channel) {
        addMessageToCache(processedMessage, processedMessage.channel);
      } else if (processedMessage.recipient) {
        const currentUser = auth.getCurrentUser();
        if (currentUser) {
          const otherUserId = processedMessage.sender === currentUser.id ? 
            processedMessage.recipient : processedMessage.sender;
          addMessageToCache(processedMessage, null, otherUserId);
        }
      }
      
      processedMessages.push(processedMessage);
    } catch (error) {
      console.error('[Message Service] Error processing incoming message:', error);
    }
  });
  
  // Notify listeners
  if (processedMessages.length > 0) {
    notifyMessageListeners(processedMessages.map(msg => ({
      type: 'new',
      message: msg
    })));
  }
  
  return processedMessages;
}

/**
 * Clear message cache for a channel
 * @param {string} channelId - Channel ID
 */
export function clearChannelCache(channelId) {
  if (channelId && messageCache.channels[channelId]) {
    delete messageCache.channels[channelId];
  }
}

/**
 * Clear direct message cache for a user
 * @param {string} userId - User ID
 */
export function clearDirectMessageCache(userId) {
  if (!userId) return;
  
  const currentUser = auth.getCurrentUser();
  if (!currentUser) return;
  
  const conversationKey = [currentUser.id, userId].sort().join('_');
  if (messageCache.directMessages[conversationKey]) {
    delete messageCache.directMessages[conversationKey];
  }
}

/**
 * Clear all message caches
 */
export function clearAllMessageCaches() {
  messageCache.channels = {};
  messageCache.directMessages = {};
}

/**
 * Initialize message service
 * @returns {boolean} Success status
 */
export function initMessageService() {
  try {
    // Initialize with empty caches
    clearAllMessageCaches();
    
    logChatEvent('system', 'Message service initialized');
    return true;
  } catch (error) {
    console.error('[Message Service] Initialization error:', error);
    return false;
  }
}

export default {
  sendChatMessage,
  getChannelMessages,
  getDirectMessages,
  editMessage,
  deleteMessage,
  markMessagesAsRead,
  addMessageListener,
  clearChannelCache,
  clearDirectMessageCache,
  clearAllMessageCaches,
  initMessageService,
  processIncomingMessages
};