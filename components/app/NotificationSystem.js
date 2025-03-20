// components/app/NotificationSystem.js
// Notification system for HIPAA-compliant chat

import { logChatEvent } from '../../utils/logger.js';
import { addMessageListener } from '../../services/api/messages.js';
import { addConnectionStatusListener } from '../../services/websocket/connection.js';
import authContext from '../../contexts/AuthContext.js';

/**
 * Notification System
 * Manages system notifications and alerts
 */
class NotificationSystem {
  constructor() {
    this.notifications = [];
    this.container = null;
    this.unreadCount = 0;
    this.messageListener = null;
    this.connectionListener = null;
    this.authListener = null;
    
    // Bind methods
    this.showNotification = this.showNotification.bind(this);
    this.handleNewMessages = this.handleNewMessages.bind(this);
    this.handleConnectionStatus = this.handleConnectionStatus.bind(this);
    this.updateUnreadCount = this.updateUnreadCount.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the notification system
   */
  initialize() {
    try {
      console.log('[NotificationSystem] Initializing...');
      
      // Create container for notifications
      this.container = document.createElement('div');
      this.container.className = 'notification-container';
      this.applyStyles(this.container, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '300px',
        maxWidth: '100%',
        zIndex: '10001',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
      });
      
      // Add to document
      document.body.appendChild(this.container);
      
      // Listen for new messages
      this.messageListener = addMessageListener(this.handleNewMessages);
      
      // Listen for connection status changes
      this.connectionListener = addConnectionStatusListener(this.handleConnectionStatus);
      
      // Listen for auth state changes
      this.authListener = authContext.subscribe(authState => {
        if (!authState.authenticated) {
          // Clear notifications on logout
          this.notifications = [];
          this.unreadCount = 0;
          this.updateUnreadCount();
          this.container.innerHTML = '';
        }
      });
      
      // Check if browser supports notifications
      if ('Notification' in window) {
        // Request permission if not already granted
        if (Notification.permission !== 'granted') {
          this.showNotification({
            title: 'Enable Notifications',
            message: 'Would you like to enable desktop notifications?',
            type: 'info',
            actions: [
              {
                label: 'Enable',
                onClick: () => {
                  Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                      this.showNotification({
                        title: 'Notifications Enabled',
                        message: 'You will now receive desktop notifications',
                        type: 'success',
                        duration: 3000
                      });
                    }
                  });
                }
              }
            ],
            duration: 10000
          });
        }
      }
      
      logChatEvent('system', 'Notification system initialized');
    } catch (error) {
      console.error('[NotificationSystem] Initialization error:', error);
      logChatEvent('error', 'Notification system initialization error', { error: error.message });
    }
  }
  
  /**
   * Show a notification
   * @param {Object} options - Notification options
   * @param {string} options.title - Notification title
   * @param {string} options.message - Notification message
   * @param {string} options.type - Notification type (info, success, warning, error)
   * @param {number} options.duration - Duration in milliseconds (0 for no auto-close)
   * @param {Array} options.actions - Array of action buttons
   * @returns {Object} Notification object
   */
  showNotification(options) {
    try {
      const defaults = {
        title: 'Notification',
        message: '',
        type: 'info',
        duration: 5000, // 5 seconds
        actions: []
      };
      
      const settings = { ...defaults, ...options };
      
      // Create notification element
      const notification = document.createElement('div');
      notification.className = `notification notification-${settings.type}`;
      
      // Apply base styles
      this.applyStyles(notification, {
        backgroundColor: '#fff',
        marginBottom: '10px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        borderRadius: '4px',
        overflow: 'hidden',
        width: '300px',
        animation: 'slide-in 0.3s ease',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        opacity: '0',
        transform: 'translateX(100%)',
        transition: 'opacity 0.3s ease, transform 0.3s ease'
      });
      
      // Type-specific styles - left border color
      const borderColors = {
        info: '#2196F3',    // Blue
        success: '#4CAF50', // Green
        warning: '#FFC107', // Yellow
        error: '#F44336'    // Red
      };
      
      notification.style.borderLeft = `4px solid ${borderColors[settings.type] || borderColors.info}`;
      
      // Header
      const header = document.createElement('div');
      this.applyStyles(header, {
        padding: '10px 15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: settings.message ? '1px solid #eee' : 'none'
      });
      
      // Title
      const title = document.createElement('div');
      title.textContent = settings.title;
      this.applyStyles(title, {
        fontWeight: 'bold',
        color: '#333'
      });
      
      // Close button
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      this.applyStyles(closeButton, {
        background: 'none',
        border: 'none',
        color: '#999',
        fontSize: '20px',
        cursor: 'pointer',
        padding: '0',
        marginLeft: '10px'
      });
      
      closeButton.addEventListener('click', () => {
        this.removeNotification(notification);
      });
      
      header.appendChild(title);
      header.appendChild(closeButton);
      notification.appendChild(header);
      
      // Message (if provided)
      if (settings.message) {
        const messageElement = document.createElement('div');
        messageElement.textContent = settings.message;
        this.applyStyles(messageElement, {
          padding: '10px 15px',
          color: '#666'
        });
        notification.appendChild(messageElement);
      }
      
      // Actions (if provided)
      if (settings.actions && settings.actions.length > 0) {
        const actionsContainer = document.createElement('div');
        this.applyStyles(actionsContainer, {
          padding: '10px 15px',
          display: 'flex',
          justifyContent: 'flex-end',
          borderTop: '1px solid #eee'
        });
        
        settings.actions.forEach(action => {
          const button = document.createElement('button');
          button.textContent = action.label;
          this.applyStyles(button, {
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '3px',
            padding: '5px 10px',
            marginLeft: '5px',
            cursor: 'pointer',
            fontSize: '12px'
          });
          
          button.addEventListener('click', () => {
            if (typeof action.onClick === 'function') {
              action.onClick();
            }
            this.removeNotification(notification);
          });
          
          actionsContainer.appendChild(button);
        });
        
        notification.appendChild(actionsContainer);
      }
      
      // Add to container
      this.container.appendChild(notification);
      
      // Store notification in array
      const notificationObj = {
        id: Date.now().toString(),
        element: notification,
        type: settings.type,
        title: settings.title,
        message: settings.message,
        timestamp: new Date()
      };
      
      this.notifications.push(notificationObj);
      
      // Log notification
      logChatEvent('notification', 'Notification shown', {
        type: settings.type,
        title: settings.title
      });
      
      // Show notification with animation
      setTimeout(() => {
        this.applyStyles(notification, {
          opacity: '1',
          transform: 'translateX(0)'
        });
      }, 10);
      
      // Set up auto-close if duration is specified
      if (settings.duration > 0) {
        setTimeout(() => {
          this.removeNotification(notification);
        }, settings.duration);
      }
      
      // Show browser notification if enabled and not focused
      this.showBrowserNotification(settings);
      
      return notificationObj;
    } catch (error) {
      console.error('[NotificationSystem] Show notification error:', error);
      return null;
    }
  }
  
  /**
   * Remove a notification
   * @param {HTMLElement} notificationElement - Notification element to remove
   */
  removeNotification(notificationElement) {
    try {
      // Find notification in array
      const index = this.notifications.findIndex(n => n.element === notificationElement);
      
      if (index !== -1) {
        // Remove from array
        const notification = this.notifications.splice(index, 1)[0];
        
        // Animate out
        this.applyStyles(notificationElement, {
          opacity: '0',
          transform: 'translateX(100%)'
        });
        
        // Remove from DOM after animation
        setTimeout(() => {
          if (notificationElement.parentNode) {
            notificationElement.parentNode.removeChild(notificationElement);
          }
        }, 300);
      }
    } catch (error) {
      console.error('[NotificationSystem] Remove notification error:', error);
    }
  }
  
  /**
   * Show browser notification
   * @param {Object} options - Notification options
   */
  showBrowserNotification(options) {
    try {
      // Only show if permission granted, the window is not focused, and title/message are provided
      if (
        'Notification' in window && 
        Notification.permission === 'granted' && 
        !document.hasFocus() && 
        options.title
      ) {
        const notification = new Notification(options.title, {
          body: options.message || '',
          icon: '/icons/logo-64.png' // You can replace this with your app icon
        });
        
        // Close after a few seconds
        setTimeout(() => {
          notification.close();
        }, options.duration || 5000);
        
        // Handle click
        notification.onclick = function() {
          window.focus();
          this.close();
        };
      }
    } catch (error) {
      console.error('[NotificationSystem] Browser notification error:', error);
    }
  }
  
  /**
   * Handle new messages
   * @param {Array} updates - Message updates
   */
  handleNewMessages(updates) {
    try {
      if (!updates || !updates.length) return;
      
      // Filter for new messages (not from current user)
      const currentUser = authContext.getCurrentUser();
      if (!currentUser) return;
      
      const newMessages = updates.filter(update => {
        if (update.type !== 'new') return false;
        const message = update.message;
        return message && message.sender !== currentUser.id;
      });
      
      if (newMessages.length > 0) {
        // Increment unread count
        this.unreadCount += newMessages.length;
        this.updateUnreadCount();
        
        // Show notification for the first message
        const firstMessage = newMessages[0].message;
        let senderName = firstMessage.sender;
        let notificationTitle = 'New Message';
        let notificationMessage = firstMessage.text;
        
        // Simplify message if it's too long
        if (notificationMessage && notificationMessage.length > 50) {
          notificationMessage = notificationMessage.substring(0, 47) + '...';
        }
        
        // Add count if more than one message
        if (newMessages.length > 1) {
          notificationMessage += ` (+ ${newMessages.length - 1} more)`;
        }
        
        this.showNotification({
          title: notificationTitle,
          message: notificationMessage,
          type: 'info',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('[NotificationSystem] Handle new messages error:', error);
    }
  }
  
  /**
   * Handle connection status changes
   * @param {string} status - Connection status
   */
  handleConnectionStatus(status) {
    try {
      // Only show notifications for significant status changes
      if (status === 'connected') {
        this.showNotification({
          title: 'Connected',
          message: 'Connected to server',
          type: 'success',
          duration: 3000
        });
      } else if (status === 'disconnected') {
        this.showNotification({
          title: 'Disconnected',
          message: 'Connection to server lost. Reconnecting...',
          type: 'warning',
          duration: 0 // No auto-close
        });
      }
    } catch (error) {
      console.error('[NotificationSystem] Handle connection status error:', error);
    }
  }
  
  /**
   * Update the unread message count
   */
  updateUnreadCount() {
    try {
      // Dispatch event for components to update UI
      const event = new CustomEvent('chat_notification_count', {
        detail: { count: this.unreadCount }
      });
      
      window.dispatchEvent(event);
      
      // Change favicon if unread messages (would need to implement)
      // this.updateFavicon();
    } catch (error) {
      console.error('[NotificationSystem] Update unread count error:', error);
    }
  }
  
  /**
   * Reset the unread count
   */
  resetUnreadCount() {
    this.unreadCount = 0;
    this.updateUnreadCount();
  }
  
  /**
   * Show an error notification
   * @param {string} message - Error message
   * @param {string} title - Error title
   */
  showError(message, title = 'Error') {
    this.showNotification({
      title,
      message,
      type: 'error',
      duration: 10000 // 10 seconds
    });
  }
  
  /**
   * Show a success notification
   * @param {string} message - Success message
   * @param {string} title - Success title
   */
  showSuccess(message, title = 'Success') {
    this.showNotification({
      title,
      message,
      type: 'success',
      duration: 5000 // 5 seconds
    });
  }
  
  /**
   * Show an info notification
   * @param {string} message - Info message
   * @param {string} title - Info title
   */
  showInfo(message, title = 'Information') {
    this.showNotification({
      title,
      message,
      type: 'info',
      duration: 5000 // 5 seconds
    });
  }
  
  /**
   * Show a warning notification
   * @param {string} message - Warning message
   * @param {string} title - Warning title
   */
  showWarning(message, title = 'Warning') {
    this.showNotification({
      title,
      message,
      type: 'warning',
      duration: 7000 // 7 seconds
    });
  }
  
  /**
   * Apply CSS styles to an element
   * @param {HTMLElement} element - Element to style
   * @param {Object} styles - Styles to apply
   */
  applyStyles(element, styles) {
    Object.assign(element.style, styles);
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    try {
      // Remove event listeners
      if (this.messageListener) {
        this.messageListener();
        this.messageListener = null;
      }
      
      if (this.connectionListener) {
        this.connectionListener();
        this.connectionListener = null;
      }
      
      if (this.authListener) {
        this.authListener();
        this.authListener = null;
      }
      
      // Remove notifications container
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      
      this.notifications = [];
      this.container = null;
      
      logChatEvent('system', 'Notification system destroyed');
    } catch (error) {
      console.error('[NotificationSystem] Destroy error:', error);
    }
  }
}

// CSS animation for notifications
const styleElement = document.createElement('style');
styleElement.textContent = `
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(styleElement);

export default NotificationSystem;