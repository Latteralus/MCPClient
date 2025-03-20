// services/api/channels.js
// Channel service for HIPAA-compliant chat

import api from './index.js';
import auth from './auth.js';
import { logChatEvent } from '../../utils/logger.js';

// In-memory cache for channels
let availableChannels = [];
let activeChannel = null;
let channelListeners = [];

/**
 * Get all available channels
 * @returns {Array} Array of channels
 */
export function getAvailableChannels() {
  return [...availableChannels];
}

/**
 * Set available channels (called from WebSocket service or API)
 * @param {Array} channels - Array of channels
 */
export function setAvailableChannels(channels) {
  availableChannels = channels || [];
  notifyChannelListeners(availableChannels);
}

/**
 * Get channel by ID
 * @param {string} channelId - Channel ID
 * @returns {Object|null} Channel object or null if not found
 */
export function getChannelById(channelId) {
  return availableChannels.find(channel => channel.id === channelId) || null;
}

/**
 * Add channel listener
 * @param {Function} listener - Callback for channel updates
 * @returns {Function} Unsubscribe function
 */
export function addChannelListener(listener) {
  if (typeof listener === 'function' && !channelListeners.includes(listener)) {
    channelListeners.push(listener);
    
    // Immediately notify with current channels
    listener(availableChannels);
  }
  
  // Return unsubscribe function
  return () => {
    channelListeners = channelListeners.filter(l => l !== listener);
  };
}

/**
 * Notify all channel listeners
 * @param {Array} channels - Updated channels
 */
function notifyChannelListeners(channels) {
  channelListeners.forEach(listener => {
    try {
      listener(channels);
    } catch (error) {
      console.error('[Channel Service] Error in channel listener:', error);
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
    if (!auth.isAuthenticated() || !hasPermission('channel.create')) {
      return {
        success: false,
        error: 'Insufficient permissions'
      };
    }
    
    // Call API
    const response = await api.post('/channels', channelData);
    
    if (response.success) {
      logChatEvent('channel', 'Channel created', {
        channelName: channelData.name
      });
      
      // Add to available channels
      const newChannel = response.data.channel;
      availableChannels = [...availableChannels, newChannel];
      
      // Notify listeners
      notifyChannelListeners(availableChannels);
      
      return {
        success: true,
        channel: newChannel
      };
    } else {
      logChatEvent('channel', 'Channel creation failed', {
        channelName: channelData.name,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'Channel creation failed'
      };
    }
  } catch (error) {
    console.error('[Channel Service] Create channel error:', error);
    
    logChatEvent('channel', 'Channel creation error', {
      channelName: channelData.name,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while creating channel'
    };
  }
}

/**
 * Update an existing channel
 * @param {string} channelId - Channel ID
 * @param {Object} updates - Channel updates
 * @returns {Promise<Object>} Update result
 */
export async function updateChannel(channelId, updates) {
  try {
    if (!auth.isAuthenticated() || !hasPermission('channel.update')) {
      return {
        success: false,
        error: 'Insufficient permissions'
      };
    }
    
    // Call API
    const response = await api.put(`/channels/${channelId}`, updates);
    
    if (response.success) {
      logChatEvent('channel', 'Channel updated', {
        channelId,
        updates: Object.keys(updates).join(', ')
      });
      
      // Update channel in available channels
      const updatedChannel = response.data.channel;
      availableChannels = availableChannels.map(channel => 
        channel.id === channelId ? updatedChannel : channel
      );
      
      // Notify listeners
      notifyChannelListeners(availableChannels);
      
      return {
        success: true,
        channel: updatedChannel
      };
    } else {
      logChatEvent('channel', 'Channel update failed', {
        channelId,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'Channel update failed'
      };
    }
  } catch (error) {
    console.error('[Channel Service] Update channel error:', error);
    
    logChatEvent('channel', 'Channel update error', {
      channelId,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while updating channel'
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
    if (!auth.isAuthenticated() || !hasPermission('channel.delete')) {
      return {
        success: false,
        error: 'Insufficient permissions'
      };
    }
    
    // Call API
    const response = await api.delete(`/channels/${channelId}`);
    
    if (response.success) {
      logChatEvent('channel', 'Channel deleted', {
        channelId
      });
      
      // Remove from available channels
      availableChannels = availableChannels.filter(channel => channel.id !== channelId);
      
      // If active channel was deleted, set to null
      if (activeChannel && activeChannel.id === channelId) {
        activeChannel = null;
      }
      
      // Notify listeners
      notifyChannelListeners(availableChannels);
      
      return { success: true };
    } else {
      logChatEvent('channel', 'Channel deletion failed', {
        channelId,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'Channel deletion failed'
      };
    }
  } catch (error) {
    console.error('[Channel Service] Delete channel error:', error);
    
    logChatEvent('channel', 'Channel deletion error', {
      channelId,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while deleting channel'
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
    if (!auth.isAuthenticated()) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }
    
    // Call API
    const response = await api.post(`/channels/${channelId}/join`);
    
    if (response.success) {
      logChatEvent('channel', 'Channel joined', {
        channelId
      });
      
      // Add user to channel members or update channel in available channels
      const updatedChannel = response.data.channel;
      if (updatedChannel) {
        availableChannels = availableChannels.map(channel => 
          channel.id === channelId ? updatedChannel : channel
        );
        
        // If not already in available channels, add it
        if (!availableChannels.some(c => c.id === channelId)) {
          availableChannels = [...availableChannels, updatedChannel];
        }
        
        // Notify listeners
        notifyChannelListeners(availableChannels);
      }
      
      return {
        success: true,
        channel: updatedChannel
      };
    } else {
      logChatEvent('channel', 'Channel join failed', {
        channelId,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'Failed to join channel'
      };
    }
  } catch (error) {
    console.error('[Channel Service] Join channel error:', error);
    
    logChatEvent('channel', 'Channel join error', {
      channelId,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while joining channel'
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
    if (!auth.isAuthenticated()) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }
    
    // Call API
    const response = await api.post(`/channels/${channelId}/leave`);
    
    if (response.success) {
      logChatEvent('channel', 'Channel left', {
        channelId
      });
      
      // Update channel in available channels
      const updatedChannel = response.data.channel;
      if (updatedChannel) {
        availableChannels = availableChannels.map(channel => 
          channel.id === channelId ? updatedChannel : channel
        );
      } else {
        // Remove from available channels if completely left
        availableChannels = availableChannels.filter(channel => channel.id !== channelId);
      }
      
      // If active channel was left, set to null
      if (activeChannel && activeChannel.id === channelId) {
        activeChannel = null;
      }
      
      // Notify listeners
      notifyChannelListeners(availableChannels);
      
      return { success: true };
    } else {
      logChatEvent('channel', 'Channel leave failed', {
        channelId,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'Failed to leave channel'
      };
    }
  } catch (error) {
    console.error('[Channel Service] Leave channel error:', error);
    
    logChatEvent('channel', 'Channel leave error', {
      channelId,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while leaving channel'
    };
  }
}

/**
 * Invite a user to a channel
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Invitation result
 */
export async function inviteToChannel(channelId, userId) {
  try {
    if (!auth.isAuthenticated() || !hasPermission('channel.invite')) {
      return {
        success: false,
        error: 'Insufficient permissions'
      };
    }
    
    // Call API
    const response = await api.post(`/channels/${channelId}/invite`, {
      userId
    });
    
    if (response.success) {
      logChatEvent('channel', 'User invited to channel', {
        channelId,
        userId
      });
      
      return { success: true };
    } else {
      logChatEvent('channel', 'Channel invitation failed', {
        channelId,
        userId,
        reason: response.message || 'Unknown error'
      });
      
      return {
        success: false,
        error: response.message || 'Failed to invite user to channel'
      };
    }
  } catch (error) {
    console.error('[Channel Service] Invite to channel error:', error);
    
    logChatEvent('channel', 'Channel invitation error', {
      channelId,
      userId,
      error: error.message
    });
    
    return {
      success: false,
      error: 'An unexpected error occurred while inviting user to channel'
    };
  }
}

/**
 * Set active channel
 * @param {string} channelId - Channel ID
 * @returns {Object} Current active channel
 */
export function setActiveChannel(channelId) {
  try {
    // Get channel from available channels
    const channel = getChannelById(channelId);
    
    if (channel) {
      activeChannel = channel;
      
      logChatEvent('channel', 'Active channel set', {
        channelId
      });
    } else {
      console.warn(`[Channel Service] Channel not found: ${channelId}`);
    }
    
    return activeChannel;
  } catch (error) {
    console.error('[Channel Service] Set active channel error:', error);
    return activeChannel;
  }
}

/**
 * Get active channel
 * @returns {string|null} Active channel ID or null
 */
export function getActiveChannel() {
  return activeChannel ? activeChannel.id : null;
}

/**
 * Get active channel object
 * @returns {Object|null} Active channel object or null
 */
export function getActiveChannelObject() {
  return activeChannel;
}

/**
 * Search channels
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of matching channels
 */
export async function searchChannels(query, options = {}) {
  try {
    if (!auth.isAuthenticated()) {
      return [];
    }
    
    // Call API
    const response = await api.get('/channels/search', {
      params: {
        query,
        ...options
      }
    });
    
    if (response.success) {
      return response.data.channels || [];
    } else {
      console.error('[Channel Service] Search channels error:', response.message);
      return [];
    }
  } catch (error) {
    console.error('[Channel Service] Search channels error:', error);
    return [];
  }
}

/**
 * Process incoming channel update from WebSocket
 * @param {Object} update - Channel update
 */
export function processChannelUpdate(update) {
  if (!update) return;
  
  switch (update.action) {
    case 'create':
      if (update.channel) {
        availableChannels = [...availableChannels, update.channel];
        notifyChannelListeners(availableChannels);
      }
      break;
      
    case 'update':
      if (update.channel) {
        availableChannels = availableChannels.map(channel => 
          channel.id === update.channel.id ? update.channel : channel
        );
        
        // Update active channel if needed
        if (activeChannel && activeChannel.id === update.channel.id) {
          activeChannel = update.channel;
        }
        
        notifyChannelListeners(availableChannels);
      }
      break;
      
    case 'delete':
      if (update.channelId) {
        availableChannels = availableChannels.filter(channel => 
          channel.id !== update.channelId
        );
        
        // Clear active channel if deleted
        if (activeChannel && activeChannel.id === update.channelId) {
          activeChannel = null;
        }
        
        notifyChannelListeners(availableChannels);
      }
      break;
      
    case 'member_join':
      if (update.channelId && update.userId) {
        // Update members in channel
        const channel = getChannelById(update.channelId);
        if (channel && channel.members) {
          channel.members.push(update.userId);
          notifyChannelListeners(availableChannels);
        }
      }
      break;
      
    case 'member_leave':
      if (update.channelId && update.userId) {
        // Update members in channel
        const channel = getChannelById(update.channelId);
        if (channel && channel.members) {
          channel.members = channel.members.filter(id => id !== update.userId);
          notifyChannelListeners(availableChannels);
        }
      }
      break;
      
    default:
      console.warn('[Channel Service] Unknown channel update action:', update.action);
  }
}

/**
 * Check if current user has a specific channel permission
 * @param {string} permission - Permission to check
 * @param {string} channelId - Channel ID (optional, uses active channel if not provided)
 * @returns {boolean} True if user has permission
 */
export function hasPermission(permission, channelId = null) {
  // For general channel permissions like creation
  if (!channelId) {
    return auth.hasPermission(permission);
  }
  
  // Get the channel
  const channel = getChannelById(channelId || getActiveChannel());
  if (!channel) {
    return false;
  }
  
  // Check if user is owner
  const currentUser = auth.getCurrentUser();
  if (!currentUser) {
    return false;
  }
  
  if (channel.ownerId === currentUser.id) {
    return true;
  }
  
  // Check specific channel permissions
  if (channel.permissions && channel.permissions[currentUser.id]) {
    return channel.permissions[currentUser.id].includes(permission);
  }
  
  // Fall back to general permissions
  return auth.hasPermission(permission);
}

/**
 * Initialize the channel service
 * @returns {boolean} Success status
 */
export function initChannelService() {
  try {
    // Load initial channels
    api.get('/channels')
      .then(response => {
        if (response.success) {
          setAvailableChannels(response.data.channels || []);
          
          // Set default active channel if available
          if (availableChannels.length > 0 && !activeChannel) {
            setActiveChannel(availableChannels[0].id);
          }
        } else {
          console.error('[Channel Service] Failed to load channels:', response.message);
        }
      })
      .catch(error => {
        console.error('[Channel Service] Error loading channels:', error);
      });
    
    logChatEvent('system', 'Channel service initialized');
    return true;
  } catch (error) {
    console.error('[Channel Service] Initialization error:', error);
    return false;
  }
}

export default {
  getAvailableChannels,
  setAvailableChannels,
  getChannelById,
  addChannelListener,
  createChannel,
  updateChannel,
  deleteChannel,
  joinChannel,
  leaveChannel,
  inviteToChannel,
  setActiveChannel,
  getActiveChannel,
  getActiveChannelObject,
  searchChannels,
  hasPermission,
  initChannelService,
  processChannelUpdate
};