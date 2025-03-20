// chat/components/app/NotificationSystem.js
// Notification system for HIPAA-compliant chat

import { logChatEvent } from '../../utils/logger.js';
import { getConfig } from '../../config.js';
import { addMessageListener } from '../../services/messageService.js';
import { getCurrentUser } from '../../services/auth';

/**
 * Notification System Component
 * Handles notifications for new messages and system events
 */
class NotificationSystem {
  /**
   * Create a new NotificationSystem
   * @param {Object} options - Notification system options
   * @param {boolean} options.sound - Enable notification sounds
   * @param {string} options.soundUrl - URL for notification sound
   * @param {boolean} options.desktop - Enable desktop notifications
   * @param {Function} options.onNotificationClick - Callback for notification clicks
   */
  constructor(options = {}) {
    this.options = {
      sound: getConfig('ui.notifications.sound', true),
      soundUrl: getConfig('ui.notifications.soundUrl', null),
      desktop: getConfig('ui.notifications.enabled', true),
      onNotificationClick: null,
      ...options
    };
    
    this.notificationCount = 0;
    this.notificationQueue = [];
    this.processingQueue = false;
    this.enabled = true;
    this.focused = document.hasFocus();
    this.unsubscribeMessageListener = null;
    this.notificationPermission = 'default';
    this.audio = null;
    
    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.showNotification = this.showNotification.bind(this);
    this.playNotificationSound = this.playNotificationSound.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.processBatchedNotifications = this.processBatchedNotifications.bind(this);
    this.requestNotificationPermission = this.requestNotificationPermission.bind(this);
    
    // Initialize component
    this.initialize();
  }
  
  /**
   * Initialize the notification system
   */
  initialize() {
    try {
      // Check if browser supports notifications
      if ('Notification' in window) {
        this.notificationPermission = Notification.permission;
        
        // Request permission if not granted
        if (this.notificationPermission !== 'granted' && this.options.desktop) {
          // We'll request when user interacts with the page
          document.addEventListener('click', this.requestNotificationPermission, { once: true });
        }
      }
      
      // Setup notification sound if enabled
      if (this.options.sound) {
        this.audio = new Audio(this.options.soundUrl || this.getDefaultSoundUrl());
        
        // Preload audio
        this.audio.load();
      }
      
      // Set up visibility change listener
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      
      // Set up focus/blur listeners
      window.addEventListener('focus', () => {
        this.focused = true;
        
        // Reset notification count when window gets focus
        this.resetNotificationCount();
      });
      
      window.addEventListener('blur', () => {
        this.focused = false;
      });
      
      // Set up message listener
      this.unsubscribeMessageListener = addMessageListener(this.handleMessage);
      
      // Log initialization
      logChatEvent('ui', 'Notification system initialized');
      
      console.log('[CRM Extension] Notification system initialized');
    } catch (error) {
      console.error('[CRM Extension] Error initializing notification system:', error);
    }
  }
  
  /**
   * Get default notification sound URL
   * @returns {string} URL for default notification sound
   */
  getDefaultSoundUrl() {
    // Use a data URI for a simple notification sound
    // This is a very short, subtle "ping" sound as a data URI
    return 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTguMTYuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
  }
  
  /**
   * Request notification permission
   */
  requestNotificationPermission() {
    if ('Notification' in window && this.notificationPermission !== 'granted') {
      Notification.requestPermission().then(permission => {
        this.notificationPermission = permission;
        
        // Log permission result
        logChatEvent('ui', `Notification permission ${permission}`);
      });
    }
  }
  
  /**
   * Handle visibility change events
   */
  handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      this.focused = true;
      
      // Reset notification count when document becomes visible
      this.resetNotificationCount();
    } else {
      this.focused = false;
    }
  }
  
  /**
   * Handle incoming messages
   * @param {Array} messages - Array of new messages
   */
  handleMessage(messages) {
    if (!this.enabled || !messages || messages.length === 0) return;
    
    // Get current user
    const currentUser = getCurrentUser();
    
    if (!currentUser) return;
    
    // Filter messages not from the current user
    const otherUserMessages = messages.filter(message => 
      message.sender !== currentUser.username && 
      message.sender !== currentUser.id
    );
    
    if (otherUserMessages.length === 0) return;
    
    // Add messages to queue
    this.notificationQueue.push(...otherUserMessages);
    
    // Increment notification count
    this.notificationCount += otherUserMessages.length;
    
    // Dispatch event for other components to update UI
    this.dispatchNotificationCountEvent();
    
    // Process queued notifications
    if (!this.processingQueue) {
      this.processBatchedNotifications();
    }
  }
  
  /**
   * Process batched notifications
   */
  processBatchedNotifications() {
    if (this.notificationQueue.length === 0) {
      this.processingQueue = false;
      return;
    }
    
    this.processingQueue = true;
    
    // Get next message
    const message = this.notificationQueue.shift();
    
    // Show notification
    if (!this.focused) {
      this.showNotification(message);
    }
    
    // Play notification sound if enabled (only once per batch)
    if (this.options.sound && this.notificationQueue.length === 0) {
      this.playNotificationSound();
    }
    
    // Continue processing queue with small delay to avoid notification flood
    setTimeout(this.processBatchedNotifications, 300);
  }
  
  /**
   * Show a desktop notification
   * @param {Object} message - Message to show notification for
   */
  showNotification(message) {
    try {
      // Skip if desktop notifications are disabled or not supported
      if (!this.options.desktop || !('Notification' in window)) return;
      
      // Skip if permission not granted
      if (this.notificationPermission !== 'granted') return;
      
      // Create notification title
      const title = `New message from ${message.senderDisplayName || message.sender}`;
      
      // HIPAA compliance: Don't show full message contents in notification
      // Instead, create a generic notification that doesn't include PHI
      const options = {
        body: 'You have received a new message',
        icon: this.getIconUrl(message.sender),
        tag: `chat-msg-${message.id}`,
        requireInteraction: false,
        silent: true // We handle sound separately
      };
      
      // Create and show notification
      const notification = new Notification(title, options);
      
      // Add click handler
      notification.onclick = () => {
        // Focus window
        window.focus();
        
        // Call click callback if provided
        if (this.options.onNotificationClick && typeof this.options.onNotificationClick === 'function') {
          this.options.onNotificationClick(message);
        }
        
        // Close notification
        notification.close();
      };
      
      // Log notification
      logChatEvent('ui', 'Showed desktop notification', { sender: message.sender });
    } catch (error) {
      console.error('[CRM Extension] Error showing notification:', error);
    }
  }
  
  /**
   * Play notification sound
   */
  playNotificationSound() {
    try {
      if (!this.options.sound || !this.audio) return;
      
      // Reset audio to start
      this.audio.currentTime = 0;
      
      // Play notification sound
      this.audio.play().catch(error => {
        // Browser may block autoplay without user interaction
        console.warn('[CRM Extension] Could not play notification sound:', error);
      });
    } catch (error) {
      console.error('[CRM Extension] Error playing notification sound:', error);
    }
  }
  
  /**
   * Get icon URL for notification
   * @param {string} sender - Message sender
   * @returns {string} Icon URL
   */
  getIconUrl(sender) {
    // In a real implementation, this would return a user avatar
    // For now, return a generic icon
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4Ij48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSIyNCIgZmlsbD0iIzQyOTVmMyIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0yNCAyMGMzLjMgMCA2LTIuNyA2LTZzLTIuNy02LTYtNi02IDIuNy02IDYgMi43IDYgNiA2em0wIDRjLTQgMC0xMiAyLTEyIDZWMzRoMjR2LTRjMC00LTgtNi0xMi02eiIvPjwvc3ZnPg==';
  }
  
  /**
   * Get current notification count
   * @returns {number} Notification count
   */
  getNotificationCount() {
    return this.notificationCount;
  }
  
  /**
   * Reset notification count
   */
  resetNotificationCount() {
    if (this.notificationCount === 0) return;
    
    this.notificationCount = 0;
    
    // Dispatch event for other components to update UI
    this.dispatchNotificationCountEvent();
    
    // Log reset
    logChatEvent('ui', 'Reset notification count');
  }
  
  /**
   * Dispatch notification count event
   */
  dispatchNotificationCountEvent() {
    // Create custom event for notification count update
    const event = new CustomEvent('chat_notification_count', {
      detail: {
        count: this.notificationCount
      }
    });
    
    // Dispatch event
    window.dispatchEvent(event);
  }
  
  /**
   * Enable or disable notifications
   * @param {boolean} enabled - Whether notifications are enabled
   */
  setEnabled(enabled) {
    this.enabled = !!enabled;
    
    // Log state change
    logChatEvent('ui', `Notifications ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Set notification sound
   * @param {boolean} enabled - Whether sound is enabled
   * @param {string} soundUrl - URL for notification sound
   */
  setSound(enabled, soundUrl = null) {
    this.options.sound = !!enabled;
    
    if (enabled && soundUrl) {
      this.options.soundUrl = soundUrl;
      
      // Update audio element
      if (this.audio) {
        this.audio.src = soundUrl;
        this.audio.load();
      } else {
        this.audio = new Audio(soundUrl);
        this.audio.load();
      }
    }
    
    // Log sound setting change
    logChatEvent('ui', `Notification sound ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Show a system notification (for non-message events)
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   */
  showSystemNotification(title, message) {
    try {
      // Skip if desktop notifications are disabled or not supported
      if (!this.options.desktop || !('Notification' in window)) return;
      
      // Skip if permission not granted
      if (this.notificationPermission !== 'granted') return;
      
      // Create notification options
      const options = {
        body: message,
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4Ij48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSIyNCIgZmlsbD0iIzI4YTc0NSIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0yMCAzNGwtOS05IDMtMyA2IDYgMTQtMTQgMyAzeiIvPjwvc3ZnPg==',
        tag: `chat-system-${Date.now()}`,
        requireInteraction: false,
        silent: true // We handle sound separately
      };
      
      // Create and show notification
      const notification = new Notification(title, options);
      
      // Add click handler
      notification.onclick = () => {
        // Focus window
        window.focus();
        
        // Close notification
        notification.close();
      };
      
      // Play sound if enabled
      if (this.options.sound) {
        this.playNotificationSound();
      }
      
      // Log notification
      logChatEvent('ui', 'Showed system notification', { title });
    } catch (error) {
      console.error('[CRM Extension] Error showing system notification:', error);
    }
  }
  
  /**
   * Destroy the notification system
   */
  destroy() {
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', () => { this.focused = true; });
    window.removeEventListener('blur', () => { this.focused = false; });
    
    // Unsubscribe from message listener
    if (this.unsubscribeMessageListener) {
      this.unsubscribeMessageListener();
    }
    
    // Clear audio
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    
    // Log destruction
    logChatEvent('ui', 'Notification system destroyed');
  }
}

export default NotificationSystem;