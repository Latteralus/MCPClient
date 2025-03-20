// chat/utils/storage.js
// Local storage handling for HIPAA-compliant chat

import { logChatEvent } from './logger.js';

// Constants for storage
const STORAGE_KEY_PREFIX = 'crmplus_chat_';
const MESSAGE_STORAGE_KEY = `${STORAGE_KEY_PREFIX}messages`;
const CHANNEL_STORAGE_KEY = `${STORAGE_KEY_PREFIX}channels`;
const USER_STORAGE_KEY = `${STORAGE_KEY_PREFIX}users`;
const SETTINGS_STORAGE_KEY = `${STORAGE_KEY_PREFIX}settings`;

// Maximum number of messages to keep per channel
const MAX_MESSAGES_PER_CHANNEL = 100;

// Message expiration (24 hours in milliseconds)
const MESSAGE_EXPIRATION = 24 * 60 * 60 * 1000;

/**
 * Initialize the storage system
 */
export function initStorage() {
  try {
    // Immediately clean up expired messages
    cleanupExpiredMessages();
    
    // Set up a cleanup interval to run every hour
    setInterval(cleanupExpiredMessages, 60 * 60 * 1000);
    
    // Log initialization
    logChatEvent('storage', 'Storage system initialized');
    
    console.log('[CRM Extension] Storage system initialized');
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error initializing storage:', error);
    return false;
  }
}

/**
 * Save a chat message to local storage
 * @param {Object} message - The message to save
 * @returns {boolean} Success status
 */
export function saveMessage(message) {
  try {
    if (!message || !message.id) return false;
    
    // Get channel for this message (default to 'general')
    const channel = message.channel || 'general';
    
    // Add storage metadata
    const messageWithMeta = {
      ...message,
      stored: Date.now() // Add storage timestamp
    };
    
    // Get current messages by channel
    const messagesMap = getMessagesMap();
    
    // Get messages for this channel or create new array
    const channelMessages = messagesMap[channel] || [];
    
    // Add message to beginning of array (newest first)
    // First check if message already exists (to avoid duplicates)
    const existingIndex = channelMessages.findIndex(m => m.id === message.id);
    
    if (existingIndex >= 0) {
      // Update existing message
      channelMessages[existingIndex] = messageWithMeta;
    } else {
      // Add new message
      channelMessages.unshift(messageWithMeta);
    }
    
    // Trim to maximum messages per channel
    if (channelMessages.length > MAX_MESSAGES_PER_CHANNEL) {
      channelMessages.length = MAX_MESSAGES_PER_CHANNEL;
    }
    
    // Update channel messages
    messagesMap[channel] = channelMessages;
    
    // Save to storage
    localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(messagesMap));
    
    // Log message save (but not content for privacy)
    logChatEvent('storage', `Message saved from ${message.sender}`, {
      messageId: message.id,
      channel
    });
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error saving message:', error);
    logChatEvent('storage', 'Error saving message', { error: error.message });
    return false;
  }
}

/**
 * Get a map of all stored messages by channel
 * @returns {Object} Map of messages by channel
 */
function getMessagesMap() {
  try {
    const storedMessages = localStorage.getItem(MESSAGE_STORAGE_KEY);
    return storedMessages ? JSON.parse(storedMessages) : {};
  } catch (error) {
    console.error('[CRM Extension] Error getting messages map:', error);
    logChatEvent('storage', 'Error getting messages map', { error: error.message });
    return {};
  }
}

/**
 * Get messages for a specific channel
 * @param {string} channelId - The channel ID
 * @param {number} limit - Maximum number of messages to return
 * @returns {Array} Array of messages
 */
export function getChannelMessages(channelId = 'general', limit = 50) {
  try {
    const messagesMap = getMessagesMap();
    const channelMessages = messagesMap[channelId] || [];
    
    // Return limited number of messages (newest first)
    return channelMessages.slice(0, limit);
  } catch (error) {
    console.error('[CRM Extension] Error getting channel messages:', error);
    logChatEvent('storage', 'Error getting channel messages', { error: error.message });
    return [];
  }
}

/**
 * Get recent direct messages between users
 * @param {string} userId - Current user ID
 * @param {string} otherUserId - Other user ID
 * @param {number} limit - Maximum number of messages to return
 * @returns {Array} Array of direct messages
 */
export function getDirectMessages(userId, otherUserId, limit = 50) {
  try {
    if (!userId || !otherUserId) return [];
    
    // Create a sorted pair of user IDs as the channel ID
    const userPair = [userId, otherUserId].sort().join('_');
    const channelId = `dm_${userPair}`;
    
    return getChannelMessages(channelId, limit);
  } catch (error) {
    console.error('[CRM Extension] Error getting direct messages:', error);
    logChatEvent('storage', 'Error getting direct messages', { error: error.message });
    return [];
  }
}

/**
 * Clear messages for a specific channel
 * @param {string} channelId - The channel to clear messages for
 * @returns {boolean} Success status
 */
export function clearChannelMessages(channelId) {
  try {
    if (!channelId) return false;
    
    // Get all messages by channel
    const messagesMap = getMessagesMap();
    
    // Delete the channel's messages
    delete messagesMap[channelId];
    
    // Save the updated map
    localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(messagesMap));
    
    // Log the clear action
    logChatEvent('storage', `Cleared messages for channel: ${channelId}`);
    
    console.log(`[CRM Extension] Cleared messages for channel: ${channelId}`);
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error clearing channel messages:', error);
    logChatEvent('storage', 'Error clearing channel messages', { error: error.message });
    return false;
  }
}

/**
 * Clear all stored messages
 * @returns {boolean} Success status
 */
export function clearAllMessages() {
  try {
    localStorage.removeItem(MESSAGE_STORAGE_KEY);
    
    // Log the clear action
    logChatEvent('storage', 'All messages cleared by user');
    
    console.log('[CRM Extension] Cleared all messages');
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error clearing messages:', error);
    logChatEvent('storage', 'Error clearing all messages', { error: error.message });
    return false;
  }
}

/**
 * Clean up expired messages
 * @returns {number} Number of expired messages removed
 */
export function cleanupExpiredMessages() {
  try {
    const messagesMap = getMessagesMap();
    const now = Date.now();
    let removedCount = 0;
    
    // Process each channel
    Object.keys(messagesMap).forEach(channelId => {
      const channelMessages = messagesMap[channelId];
      
      // Filter out expired messages
      const validMessages = channelMessages.filter(message => {
        const storedTime = message.stored || now;
        const isExpired = (now - storedTime) >= MESSAGE_EXPIRATION;
        
        if (isExpired) {
          removedCount++;
        }
        
        return !isExpired;
      });
      
      // Update the channel's messages
      messagesMap[channelId] = validMessages;
    });
    
    // Save the updated map
    localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(messagesMap));
    
    // Log the cleanup if messages were removed
    if (removedCount > 0) {
      logChatEvent('storage', `Removed ${removedCount} expired messages`);
      console.log(`[CRM Extension] Removed ${removedCount} expired messages`);
    }
    
    return removedCount;
  } catch (error) {
    console.error('[CRM Extension] Error cleaning up messages:', error);
    logChatEvent('storage', 'Error cleaning up expired messages', { error: error.message });
    return 0;
  }
}

/**
 * Save a channel to local storage
 * @param {Object} channel - The channel to save
 * @returns {boolean} Success status
 */
export function saveChannel(channel) {
  try {
    if (!channel || !channel.id) return false;
    
    // Get current channels
    const channels = getChannels();
    
    // Check if channel already exists
    const existingIndex = channels.findIndex(c => c.id === channel.id);
    
    if (existingIndex >= 0) {
      // Update existing channel
      channels[existingIndex] = channel;
    } else {
      // Add new channel
      channels.push(channel);
    }
    
    // Save to storage
    localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(channels));
    
    // Log channel save
    logChatEvent('storage', `Channel saved: ${channel.name}`, { channelId: channel.id });
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error saving channel:', error);
    logChatEvent('storage', 'Error saving channel', { error: error.message });
    return false;
  }
}

/**
 * Get all stored channels
 * @returns {Array} Array of channel objects
 */
export function getChannels() {
  try {
    const storedChannels = localStorage.getItem(CHANNEL_STORAGE_KEY);
    return storedChannels ? JSON.parse(storedChannels) : [];
  } catch (error) {
    console.error('[CRM Extension] Error getting channels:', error);
    logChatEvent('storage', 'Error getting channels', { error: error.message });
    return [];
  }
}

/**
 * Delete a channel from local storage
 * @param {string} channelId - ID of the channel to delete
 * @returns {boolean} Success status
 */
export function deleteChannel(channelId) {
  try {
    if (!channelId) return false;
    
    // Get current channels
    const channels = getChannels();
    
    // Filter out the channel to delete
    const updatedChannels = channels.filter(c => c.id !== channelId);
    
    // Save to storage
    localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(updatedChannels));
    
    // Log channel deletion
    logChatEvent('storage', `Channel deleted: ${channelId}`);
    
    // Also clear messages for this channel
    clearChannelMessages(channelId);
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error deleting channel:', error);
    logChatEvent('storage', 'Error deleting channel', { error: error.message });
    return false;
  }
}

/**
 * Save a user to local storage
 * @param {Object} user - The user to save
 * @returns {boolean} Success status
 */
export function saveUser(user) {
  try {
    if (!user || !user.id) return false;
    
    // Get current users
    const users = getUsers();
    
    // Check if user already exists
    const existingIndex = users.findIndex(u => u.id === user.id);
    
    if (existingIndex >= 0) {
      // Update existing user
      users[existingIndex] = user;
    } else {
      // Add new user
      users.push(user);
    }
    
    // Save to storage
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
    
    // Log user save (without sensitive data)
    logChatEvent('storage', `User saved: ${user.username}`, { userId: user.id });
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error saving user:', error);
    logChatEvent('storage', 'Error saving user', { error: error.message });
    return false;
  }
}

/**
 * Get all stored users
 * @returns {Array} Array of user objects
 */
export function getUsers() {
  try {
    const storedUsers = localStorage.getItem(USER_STORAGE_KEY);
    return storedUsers ? JSON.parse(storedUsers) : [];
  } catch (error) {
    console.error('[CRM Extension] Error getting users:', error);
    logChatEvent('storage', 'Error getting users', { error: error.message });
    return [];
  }
}

/**
 * Save a setting
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 * @returns {boolean} Success status
 */
export function saveSetting(key, value) {
  try {
    if (!key) return false;
    
    // Get current settings
    const settings = getSettings();
    
    // Update setting
    settings[key] = value;
    
    // Save to storage
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    
    // Log setting save (don't log values for privacy)
    logChatEvent('storage', `Setting saved: ${key}`);
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error saving setting:', error);
    logChatEvent('storage', 'Error saving setting', { error: error.message });
    return false;
  }
}

/**
 * Get a setting value
 * @param {string} key - Setting key
 * @param {any} defaultValue - Default value if setting not found
 * @returns {any} Setting value
 */
export function getSetting(key, defaultValue = null) {
  try {
    const settings = getSettings();
    return key in settings ? settings[key] : defaultValue;
  } catch (error) {
    console.error('[CRM Extension] Error getting setting:', error);
    logChatEvent('storage', 'Error getting setting', { error: error.message });
    return defaultValue;
  }
}

/**
 * Get all settings
 * @returns {Object} All settings
 */
function getSettings() {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return storedSettings ? JSON.parse(storedSettings) : {};
  } catch (error) {
    console.error('[CRM Extension] Error getting settings:', error);
    logChatEvent('storage', 'Error getting settings', { error: error.message });
    return {};
  }
}

/**
 * Clear all settings
 * @returns {boolean} Success status
 */
export function clearSettings() {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    
    // Log settings clear
    logChatEvent('storage', 'All settings cleared');
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error clearing settings:', error);
    logChatEvent('storage', 'Error clearing settings', { error: error.message });
    return false;
  }
}

/**
 * Get storage usage information
 * @returns {Object} Storage usage info
 */
export function getStorageUsage() {
  try {
    const messagesSize = localStorage.getItem(MESSAGE_STORAGE_KEY)?.length || 0;
    const channelsSize = localStorage.getItem(CHANNEL_STORAGE_KEY)?.length || 0;
    const usersSize = localStorage.getItem(USER_STORAGE_KEY)?.length || 0;
    const settingsSize = localStorage.getItem(SETTINGS_STORAGE_KEY)?.length || 0;
    
    const totalSize = messagesSize + channelsSize + usersSize + settingsSize;
    
    // Calculate sizes in KB (approximately)
    const toKB = size => Math.round((size * 2) / 1024 * 10) / 10; // *2 for UTF-16, /1024 for KB
    
    return {
      totalKB: toKB(totalSize),
      messagesKB: toKB(messagesSize),
      channelsKB: toKB(channelsSize),
      usersKB: toKB(usersSize),
      settingsKB: toKB(settingsSize),
      messageCount: Object.values(getMessagesMap()).reduce((count, messages) => count + messages.length, 0),
      channelCount: getChannels().length,
      userCount: getUsers().length
    };
  } catch (error) {
    console.error('[CRM Extension] Error calculating storage usage:', error);
    return {
      totalKB: 0,
      messagesKB: 0,
      channelsKB: 0,
      usersKB: 0,
      settingsKB: 0,
      messageCount: 0,
      channelCount: 0,
      userCount: 0
    };
  }
}

/**
 * Export chat data to a file
 * @param {string} dataType - Type of data to export (messages, channels, all)
 * @returns {boolean} Success status
 */
export function exportData(dataType = 'all') {
  try {
    let exportData = {};
    let filename = '';
    
    if (dataType === 'messages' || dataType === 'all') {
      exportData.messages = getMessagesMap();
      filename = 'chat_export';
    }
    
    if (dataType === 'channels' || dataType === 'all') {
      exportData.channels = getChannels();
      filename = dataType === 'channels' ? 'channels_export' : filename;
    }
    
    if (dataType === 'all') {
      exportData.users = getUsers();
      exportData.settings = getSettings();
    }
    
    // Add metadata
    exportData.metadata = {
      exportDate: new Date().toISOString(),
      exportType: dataType,
      version: '1.0'
    };
    
    // Create a JSON string
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Create a blob
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${filename}_${new Date().toISOString().slice(0, 10)}.json`;
    
    // Add to document, click, and remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Log the export
    logChatEvent('storage', `Data exported: ${dataType}`);
    
    console.log(`[CRM Extension] Exported ${dataType} data to file`);
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error exporting data:', error);
    logChatEvent('storage', 'Error exporting data', { error: error.message });
    return false;
  }
}

/**
 * Import chat data from JSON
 * @param {string} jsonString - JSON string with chat data
 * @returns {Object} Import result
 */
export function importData(jsonString) {
  try {
    if (!jsonString) {
      return { success: false, error: 'No data provided' };
    }
    
    // Parse the JSON
    const importedData = JSON.parse(jsonString);
    
    // Validate structure
    if (!importedData || typeof importedData !== 'object') {
      return { success: false, error: 'Invalid data format' };
    }
    
    let importCounts = {
      messages: 0,
      channels: 0,
      users: 0,
      settings: 0
    };
    
    // Import messages if present
    if (importedData.messages && typeof importedData.messages === 'object') {
      const currentMessages = getMessagesMap();
      
      // Merge messages by channel, avoiding duplicates
      Object.keys(importedData.messages).forEach(channelId => {
        const importedChannelMessages = importedData.messages[channelId] || [];
        const currentChannelMessages = currentMessages[channelId] || [];
        
        // Create a Set of existing message IDs
        const existingIds = new Set(currentChannelMessages.map(m => m.id));
        
        // Add only new messages
        const newMessages = importedChannelMessages.filter(m => !existingIds.has(m.id));
        
        // Merge and sort messages (newest first)
        currentMessages[channelId] = [...currentChannelMessages, ...newMessages]
          .sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeB - timeA;
          })
          .slice(0, MAX_MESSAGES_PER_CHANNEL);
        
        importCounts.messages += newMessages.length;
      });
      
      // Save merged messages
      localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(currentMessages));
    }
    
    // Import channels if present
    if (importedData.channels && Array.isArray(importedData.channels)) {
      const currentChannels = getChannels();
      
      // Create a Set of existing channel IDs
      const existingIds = new Set(currentChannels.map(c => c.id));
      
      // Add only new channels
      const newChannels = importedData.channels.filter(c => !existingIds.has(c.id));
      
      // Merge channels
      const mergedChannels = [...currentChannels, ...newChannels];
      
      // Save merged channels
      localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(mergedChannels));
      
      importCounts.channels = newChannels.length;
    }
    
    // Import users if present
    if (importedData.users && Array.isArray(importedData.users)) {
      const currentUsers = getUsers();
      
      // Create a Set of existing user IDs
      const existingIds = new Set(currentUsers.map(u => u.id));
      
      // Add only new users
      const newUsers = importedData.users.filter(u => !existingIds.has(u.id));
      
      // Merge users
      const mergedUsers = [...currentUsers, ...newUsers];
      
      // Save merged users
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mergedUsers));
      
      importCounts.users = newUsers.length;
    }
    
    // Import settings if present (only if not already set)
    if (importedData.settings && typeof importedData.settings === 'object') {
      const currentSettings = getSettings();
      
      // Only import settings that don't already exist
      Object.keys(importedData.settings).forEach(key => {
        if (!(key in currentSettings)) {
          currentSettings[key] = importedData.settings[key];
          importCounts.settings++;
        }
      });
      
      // Save merged settings
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(currentSettings));
    }
    
    // Log the import
    logChatEvent('storage', 'Data imported', importCounts);
    
    console.log('[CRM Extension] Imported data:', importCounts);
    
    return {
      success: true,
      importCounts
    };
  } catch (error) {
    console.error('[CRM Extension] Error importing data:', error);
    logChatEvent('storage', 'Error importing data', { error: error.message });
    
    return {
      success: false,
      error: error.message
    };
  }
}