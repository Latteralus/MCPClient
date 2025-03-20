// chat/services/channelService.js
// Channel management service for HIPAA-compliant chat

import { logChatEvent } from '../utils/logger.js';
import { getChannels, saveChannel, deleteChannel as deleteStoredChannel } from '../utils/storage.js';
import { getCurrentUser, getAuthToken, isAuthenticated, hasPermission } from './auth';

// Available channels
let availableChannels = [];

// Channel listeners
let channelListeners = [];

// Currently active channel
let activeChannel = localStorage.getItem('crmplus_chat_active_channel') || 'general';

/**
 * Initialize the channel service
 * @returns {boolean} Success status
 */
export function initChannelService() {
  try {
    // Initialize with default channels if none exist
    initializeDefaultChannels();
    
    // Log initialization
    logChatEvent('system', 'Channel service initialized');
    
    console.log('[CRM Extension] Channel service initialized');
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error initializing channel service:', error);
    return false;
  }
}

/**
 * Initialize default channels if none exist
 */
function initializeDefaultChannels() {
  const storedChannels = getChannels();
  
  if (storedChannels.length === 0) {
    // Create default general channel
    const generalChannel = {
      id: 'general',
      name: 'General',
      description: 'General discussion channel',
      type: 'public',
      createdAt: new Date().toISOString(),
      createdBy: 'system'
    };
    
    // Create default announcements channel
    const announcementsChannel = {
      id: 'announcements',
      name: 'Announcements',
      description: 'Important announcements',
      type: 'public',
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      readonly: true // Only admins can post
    };
    
    // Save default channels
    saveChannel(generalChannel);
    saveChannel(announcementsChannel);
    
    // Set available channels
    availableChannels = [generalChannel, announcementsChannel];
  } else {
    // Use stored channels
    availableChannels = storedChannels;
  }
}

/**
 * Update available channels list
 * @param {Array} channels - Array of channel objects
 */
export function updateAvailableChannels(channels) {
  try {
    if (!Array.isArray(channels)) return;
    
    // Update available channels list
    availableChannels = channels;
    
    // Update cached channel data
    channels.forEach(channel => {
      saveChannel(channel);
    });
    
    // Notify listeners
    notifyChannelListeners();
  } catch (error) {
    console.error('[CRM Extension] Error updating available channels:', error);
  }
}

/**
 * Get all available channels
 * @returns {Array} Array of channel objects
 */
export function getAvailableChannels() {
  return [...availableChannels];
}

/**
 * Get a specific channel by ID
 * @param {string} channelId - Channel ID
 * @returns {Object|null} Channel object or null if not found
 */
export function getChannelById(channelId) {
  try {
    if (!channelId) return null;
    
    // First check available channels
    const availableChannel = availableChannels.find(c => c.id === channelId);
    if (availableChannel) return availableChannel;
    
    // Then check stored channels
    const storedChannels = getChannels();
    return storedChannels.find(c => c.id === channelId) || null;
  } catch (error) {
    console.error('[CRM Extension] Error getting channel by ID:', error);
    return null;
  }
}

/**
 * Add a channel listener
 * @param {Function} listener - Function to call with channel updates
 * @returns {Function} Function to remove the listener
 */
export function addChannelListener(listener) {
  if (typeof listener !== 'function') return () => {};
  
  channelListeners.push(listener);
  
  // Immediately call with current channels
  listener(getAvailableChannels());
  
  return () => {
    channelListeners = channelListeners.filter(l => l !== listener);
  };
}

/**
 * Notify all channel listeners
 */
function notifyChannelListeners() {
  const channels = getAvailableChannels();
  
  channelListeners.forEach(listener => {
    try {
      listener(channels);
    } catch (error) {
      console.error('[CRM Extension] Error in channel listener:', error);
    }
  });
}

/**
 * Create a new channel
 * @param {Object} channelData - Channel data
 * @returns {Promise<Object>} Creation result
 */
export async function createChannel(channelData) {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Authentication required' };
    }
    
    if (!hasPermission('channel.create')) {
      return { success: false, error: 'Permission denied' };
    }
    
    // Validate channel data
    if (!channelData.name) {
      return { success: false, error: 'Channel name is required' };
    }
    
    const currentUser = getCurrentUser();
    
    // Prepare channel object
    const newChannel = {
      ...channelData,
      id: channelData.id || generateChannelId(channelData.name),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
      type: channelData.type || 'public',
      members: channelData.members || []
    };
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    const response = await fetch(`${httpServerUrl}/api/channels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(newChannel)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create channel');
    }
    
    const createdChannel = await response.json();
    
    // Save to local storage
    saveChannel(createdChannel);
    
    // Update available channels
    availableChannels = [...availableChannels, createdChannel];
    
    // Notify listeners
    notifyChannelListeners();
    
    // Log channel creation
    logChatEvent('channel', 'Channel created', { 
      channelId: createdChannel.id,
      channelName: createdChannel.name
    });
    
    return {
      success: true,
      channel: createdChannel
    };
  } catch (error) {
    console.error('[CRM Extension] Error creating channel:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update a channel
 * @param {string} channelId - Channel ID
 * @param {Object} updates - Channel data updates
 * @returns {Promise<Object>} Update result
 */
export async function updateChannel(channelId, updates) {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Authentication required' };
    }
    
    if (!hasPermission('channel.update')) {
      return { success: false, error: 'Permission denied' };
    }
    
    // Get existing channel
    const existingChannel = getChannelById(channelId);
    if (!existingChannel) {
      return { success: false, error: 'Channel not found' };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    const response = await fetch(`${httpServerUrl}/api/channels/${channelId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update channel');
    }
    
    const updatedChannel = await response.json();
    
    // Save to local storage
    saveChannel(updatedChannel);
    
    // Update available channels
    const channelIndex = availableChannels.findIndex(c => c.id === channelId);
    if (channelIndex >= 0) {
      availableChannels[channelIndex] = updatedChannel;
      
      // Notify listeners
      notifyChannelListeners();
    }
    
    // Log channel update
    logChatEvent('channel', 'Channel updated', { 
      channelId,
      channelName: updatedChannel.name
    });
    
    return {
      success: true,
      channel: updatedChannel
    };
  } catch (error) {
    console.error('[CRM Extension] Error updating channel:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a channel
 * @param {string} channelId - Channel ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteChannel(channelId) {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Authentication required' };
    }
    
    if (!hasPermission('channel.delete')) {
      return { success: false, error: 'Permission denied' };
    }
    
    // Don't allow deleting default channels
    if (channelId === 'general' || channelId === 'announcements') {
      return { success: false, error: 'Cannot delete default channels' };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    const response = await fetch(`${httpServerUrl}/api/channels/${channelId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete channel');
    }
    
    // Remove from local storage
    deleteStoredChannel(channelId);
    
    // Update available channels
    availableChannels = availableChannels.filter(c => c.id !== channelId);
    
    // Notify listeners
    notifyChannelListeners();
    
    // If active channel was deleted, switch to general
    if (activeChannel === channelId) {
      setActiveChannel('general');
    }
    
    // Log channel deletion
    logChatEvent('channel', 'Channel deleted', { channelId });
    
    return { success: true };
  } catch (error) {
    console.error('[CRM Extension] Error deleting channel:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Join a channel
 * @param {string} channelId - Channel ID
 * @returns {Promise<Object>} Join result
 */
export async function joinChannel(channelId) {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Authentication required' };
    }
    
    const channel = getChannelById(channelId);
    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }
    
    // Private channels require invitation
    if (channel.type === 'private') {
      const currentUser = getCurrentUser();
      
      // Check if user is a member
      if (!channel.members.includes(currentUser.id)) {
        return { success: false, error: 'This is a private channel. You need an invitation to join.' };
      }
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    const response = await fetch(`${httpServerUrl}/api/channels/${channelId}/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to join channel');
    }
    
    // Set as active channel
    setActiveChannel(channelId);
    
    // Log channel join
    logChatEvent('channel', 'Joined channel', { 
      channelId,
      channelName: channel.name
    });
    
    return { success: true, channel };
  } catch (error) {
    console.error('[CRM Extension] Error joining channel:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Leave a channel
 * @param {string} channelId - Channel ID
 * @returns {Promise<Object>} Leave result
 */
export async function leaveChannel(channelId) {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Authentication required' };
    }
    
    // Don't allow leaving default channels
    if (channelId === 'general' || channelId === 'announcements') {
      return { success: false, error: 'Cannot leave default channels' };
    }
    
    const channel = getChannelById(channelId);
    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    const response = await fetch(`${httpServerUrl}/api/channels/${channelId}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to leave channel');
    }
    
    // If active channel was left, switch to general
    if (activeChannel === channelId) {
      setActiveChannel('general');
    }
    
    // Log channel leave
    logChatEvent('channel', 'Left channel', { 
      channelId,
      channelName: channel.name
    });
    
    return { success: true };
  } catch (error) {
    console.error('[CRM Extension] Error leaving channel:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Invite a user to a channel
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID to invite
 * @returns {Promise<Object>} Invitation result
 */
export async function inviteToChannel(channelId, userId) {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Authentication required' };
    }
    
    if (!hasPermission('channel.invite')) {
      return { success: false, error: 'Permission denied' };
    }
    
    const channel = getChannelById(channelId);
    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Send request to server
    const response = await fetch(`${httpServerUrl}/api/channels/${channelId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ userId })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to invite user');
    }
    
    const updatedChannel = await response.json();
    
    // Save to local storage
    saveChannel(updatedChannel);
    
    // Update available channels
    const channelIndex = availableChannels.findIndex(c => c.id === channelId);
    if (channelIndex >= 0) {
      availableChannels[channelIndex] = updatedChannel;
      
      // Notify listeners
      notifyChannelListeners();
    }
    
    // Log invitation
    logChatEvent('channel', 'User invited to channel', { 
      channelId,
      channelName: channel.name,
      userId
    });
    
    return {
      success: true,
      channel: updatedChannel
    };
  } catch (error) {
    console.error('[CRM Extension] Error inviting to channel:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Set the active channel
 * @param {string} channelId - Channel ID
 */
export function setActiveChannel(channelId) {
  try {
    if (!channelId) return;
    
    // Get channel
    const channel = getChannelById(channelId);
    if (!channel) {
      console.error(`[CRM Extension] Channel not found: ${channelId}`);
      return;
    }
    
    // Update active channel
    activeChannel = channelId;
    
    // Save to storage
    localStorage.setItem('crmplus_chat_active_channel', channelId);
    
    // Log channel switch
    logChatEvent('channel', 'Switched active channel', { 
      channelId,
      channelName: channel.name
    });
  } catch (error) {
    console.error('[CRM Extension] Error setting active channel:', error);
  }
}

/**
 * Get the active channel
 * @returns {string} Active channel ID
 */
export function getActiveChannel() {
  return activeChannel;
}

/**
 * Get the active channel object
 * @returns {Object|null} Active channel object
 */
export function getActiveChannelObject() {
  return getChannelById(activeChannel);
}

/**
 * Generate a channel ID from name
 * @param {string} name - Channel name
 * @returns {string} Generated channel ID
 */
function generateChannelId(name) {
  // Replace spaces with underscores, remove special characters, and make lowercase
  const baseId = name.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  
  // Add timestamp to ensure uniqueness
  return `${baseId}_${Date.now().toString(36)}`;
}

/**
 * Search for channels by name or description
 * @param {string} query - Search query
 * @returns {Array} Matching channels
 */
export function searchChannels(query) {
  try {
    if (!query || typeof query !== 'string') return getAvailableChannels();
    
    const normalizedQuery = query.toLowerCase();
    const allChannels = getAvailableChannels();
    
    return allChannels.filter(channel => 
      channel.name.toLowerCase().includes(normalizedQuery) ||
      (channel.description && channel.description.toLowerCase().includes(normalizedQuery))
    );
  } catch (error) {
    console.error('[CRM Extension] Error searching channels:', error);
    return [];
  }
}

export {
    hasPermission,
  };