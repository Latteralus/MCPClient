// chat/config.js
// Configuration for HIPAA-compliant chat

import { getSetting } from './utils/storage.js';

/**
 * Chat module configuration
 */
const config = {
  // Server settings
  server: {
    // Default WebSocket server URL
    url: getSetting('server_url', 'ws://localhost:3000'),
    
    // Connection timeout in milliseconds (10 seconds)
    connectionTimeout: 10000,
    
    // Reconnection settings
    reconnect: {
      // Maximum number of reconnection attempts
      maxAttempts: 5,
      
      // Base delay between reconnection attempts (in milliseconds)
      delay: 5000,
      
      // Use exponential backoff for reconnection delay
      useExponentialBackoff: true
    },
    
    // Heartbeat interval (in milliseconds)
    heartbeatInterval: 30000
  },
  
  // Security settings
  security: {
    // Session timeout (in milliseconds) - 15 minutes
    sessionTimeout: 15 * 60 * 1000,
    
    // Check if Web Crypto API is available
    hasCryptoAPI: typeof window !== 'undefined' && window.crypto && window.crypto.subtle,
    
    // Minimum password length
    minPasswordLength: 8,
    
    // Enable two-factor authentication
    enableTwoFactorAuth: false
  },
  
  // Storage settings
  storage: {
    // Maximum number of messages to keep per channel
    maxMessagesPerChannel: 100,
    
    // Message expiration time (in milliseconds) - 24 hours
    messageExpiration: 24 * 60 * 60 * 1000,
    
    // Storage key prefix for all chat-related storage
    keyPrefix: 'crmplus_chat_'
  },
  
  // UI settings
  ui: {
    // Default theme
    theme: getSetting('theme', 'light'),
    
    // Notification settings
    notifications: {
      // Enable desktop notifications
      enabled: getSetting('notifications_enabled', true),
      
      // Enable notification sounds
      sound: getSetting('notification_sound', true),
      
      // Default notification sound
      soundUrl: getSetting('notification_sound_url', null)
    },
    
    // Message settings
    messages: {
      // Maximum message length
      maxLength: 2000,
      
      // Enable message editing
      allowEditing: true,
      
      // Time window for editing messages (in milliseconds) - 5 minutes
      editWindow: 5 * 60 * 1000,
      
      // Enable message deletion
      allowDeletion: true
    },
    
    // Channel settings
    channels: {
      // Default channel
      defaultChannel: 'general'
    }
  },
  
  // Feature flags
  features: {
    // Enable direct messaging
    directMessaging: true,
    
    // Enable file sharing
    fileSharing: false,
    
    // Enable message threading
    messageThreading: false,
    
    // Enable message reactions
    messageReactions: true,
    
    // Enable channel creation by non-admin users
    userChannelCreation: getSetting('user_channel_creation', false),
    
    // Enable user status (online, away, busy, etc.)
    userStatus: true
  },
  
  // HIPAA compliance settings
  hipaa: {
    // Enable automatic session timeouts
    enableSessionTimeout: true,
    
    // Enable audit logging
    enableAuditLogging: true,
    
    // Enable message expiration
    enableMessageExpiration: true,
    
    // Show PHI indicators on messages
    showPhiIndicators: true,
    
    // Enable encryption
    enableEncryption: true
  },
  
  // Default roles and permissions
  roles: {
    admin: {
      name: 'Administrator',
      permissions: [
        'user.create', 'user.read', 'user.update', 'user.delete',
        'channel.create', 'channel.read', 'channel.update', 'channel.delete',
        'channel.invite', 'message.delete', 'audit.read'
      ]
    },
    moderator: {
      name: 'Moderator',
      permissions: [
        'user.read', 
        'channel.create', 'channel.read', 'channel.update',
        'channel.invite', 'message.delete'
      ]
    },
    user: {
      name: 'User',
      permissions: [
        'user.read', 
        'channel.read', 
        'message.create', 'message.read', 'message.update.own', 'message.delete.own'
      ]
    }
  },
  
  // Version information
  version: {
    // Chat module version
    number: '1.0.0',
    
    // Build date
    buildDate: new Date('2025-03-18').toISOString()
  }
};

/**
 * Get a configuration value
 * @param {string} path - Dot-notation path to config value
 * @param {any} defaultValue - Default value if path not found
 * @returns {any} Configuration value
 */
export function getConfig(path, defaultValue = null) {
  try {
    // Split path into segments
    const segments = path.split('.');
    
    // Start with the full config object
    let current = config;
    
    // Traverse the path
    for (const segment of segments) {
      if (current && typeof current === 'object' && segment in current) {
        current = current[segment];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  } catch (error) {
    console.error('[CRM Extension] Error getting config value:', error);
    return defaultValue;
  }
}

/**
 * Override a configuration value (for testing or runtime changes)
 * @param {string} path - Dot-notation path to config value
 * @param {any} value - New value
 * @returns {boolean} Success status
 */
export function setConfig(path, value) {
  try {
    // Split path into segments
    const segments = path.split('.');
    
    // Start with the full config object
    let current = config;
    
    // Traverse the path until the second-to-last segment
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      
      if (current && typeof current === 'object' && segment in current) {
        current = current[segment];
      } else {
        return false; // Path not valid
      }
    }
    
    // Set the value at the last segment
    const lastSegment = segments[segments.length - 1];
    current[lastSegment] = value;
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error setting config value:', error);
    return false;
  }
}

// Export the full config and helper functions
export default config;