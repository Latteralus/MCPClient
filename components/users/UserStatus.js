// chat/components/users/UserStatus.js
// User status component for HIPAA-compliant chat

import authContext from '../../contexts/AuthContext.js';
import webSocketContext from '../../contexts/WebSocketContext.js';
import { logChatEvent } from '../../utils/logger.js';
import { handleError, ErrorCategory, ErrorCode } from '../../utils/error-handler.js';

class UserStatus {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      showStatusText: true,
      ...options
    };
    
    this.statusElement = null;
    this.statusMenuOpen = false;
    this.connectionSubscription = null;
    this.connectionStatus = 'disconnected';
    
    // Status options
    this.statusOptions = [
      { value: 'online', label: 'Online', icon: '🟢' },
      { value: 'away', label: 'Away', icon: '🟡' },
      { value: 'busy', label: 'Busy', icon: '🔴' },
      { value: 'offline', label: 'Appear Offline', icon: '⚫' }
    ];
    
    // Current status
    this.currentStatus = 'online';
    
    // Bind methods
    this.render = this.render.bind(this);
    this.toggleStatusMenu = this.toggleStatusMenu.bind(this);
    this.handleStatusSelect = this.handleStatusSelect.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
    this.handleConnectionChange = this.handleConnectionChange.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the status component
   */
  initialize() {
    // Create container element
    this.statusElement = document.createElement('div');
    this.statusElement.className = 'user-status-container';
    this.applyStyles(this.statusElement, {
      position: 'relative',
      display: 'inline-block'
    });
    
    // Add to container
    if (this.container) {
      this.container.appendChild(this.statusElement);
    }
    
    // Get current user
    const currentUser = authContext.getCurrentUser();
    if (currentUser && currentUser.status) {
      this.currentStatus = currentUser.status;
    }
    
    // Subscribe to connection changes
    this.connectionSubscription = webSocketContext.subscribeToConnection(this.handleConnectionChange);
    
    // Render initial state
    this.render();
    
    // Add click outside handler to document
    document.addEventListener('click', this.handleClickOutside);
    
    // Log initialization
    logChatEvent('ui', 'User status component initialized');
  }
  
  /**
   * Handle connection state changes
   * @param {Object} connectionState - WebSocket connection state
   */
  handleConnectionChange(connectionState) {
    this.connectionStatus = connectionState.status;
    
    // Update render if needed
    this.render();
  }
  
  /**
   * Render the status component
   */
  render() {
    if (!this.statusElement) return;
    
    // Clear existing content
    this.statusElement.innerHTML = '';
    
    // Get current user
    const currentUser = authContext.getCurrentUser();
    
    // If not authenticated, show nothing
    if (!authContext.isAuthenticated() || !currentUser) {
      this.statusElement.style.display = 'none';
      return;
    } else {
      this.statusElement.style.display = 'inline-block';
    }
    
    // Create status indicator button
    const statusButton = document.createElement('button');
    statusButton.className = 'status-button';
    this.applyStyles(statusButton, {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: 'transparent',
      border: 'none',
      padding: '4px 8px',
      cursor: 'pointer',
      borderRadius: '4px'
    });
    
    // Status icon
    const selectedStatus = this.statusOptions.find(status => status.value === this.currentStatus) || this.statusOptions[0];
    
    const statusIcon = document.createElement('span');
    statusIcon.className = 'status-icon';
    statusIcon.textContent = selectedStatus.icon;
    this.applyStyles(statusIcon, {
      marginRight: this.options.showStatusText ? '8px' : '0'
    });
    
    statusButton.appendChild(statusIcon);
    
    // Status text (optional)
    if (this.options.showStatusText) {
      const statusText = document.createElement('span');
      statusText.className = 'status-text';
      statusText.textContent = selectedStatus.label;
      this.applyStyles(statusText, {
        fontSize: '14px'
      });
      
      // Caret icon
      const caretIcon = document.createElement('span');
      caretIcon.className = 'caret-icon';
      caretIcon.innerHTML = '&#9662;'; // Down triangle
      this.applyStyles(caretIcon, {
        marginLeft: '4px',
        fontSize: '10px'
      });
      
      statusButton.appendChild(statusText);
      statusButton.appendChild(caretIcon);
    }
    
    // Add click event listener to toggle menu
    statusButton.addEventListener('click', this.toggleStatusMenu);
    
    // Disable button if not connected
    if (this.connectionStatus !== 'connected') {
      statusButton.disabled = true;
      this.applyStyles(statusButton, {
        opacity: '0.6',
        cursor: 'not-allowed'
      });
      
      // Add a tooltip explaining why it's disabled
      statusButton.title = 'Status cannot be changed while offline';
    }
    
    this.statusElement.appendChild(statusButton);
    
    // Create status menu (dropdown)
    if (this.statusMenuOpen && this.connectionStatus === 'connected') {
      const statusMenu = document.createElement('div');
      statusMenu.className = 'status-menu';
      this.applyStyles(statusMenu, {
        position: 'absolute',
        top: '100%',
        right: '0',
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: '1000',
        marginTop: '4px',
        minWidth: '150px'
      });
      
      // Create menu items
      this.statusOptions.forEach(status => {
        const menuItem = document.createElement('div');
        menuItem.className = `status-menu-item ${status.value === this.currentStatus ? 'active' : ''}`;
        this.applyStyles(menuItem, {
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          cursor: 'pointer',
          backgroundColor: status.value === this.currentStatus ? '#f0f0f0' : 'transparent',
          borderLeft: status.value === this.currentStatus ? '3px solid #2196F3' : '3px solid transparent'
        });
        
        // Hover effect
        menuItem.addEventListener('mouseover', () => {
          if (status.value !== this.currentStatus) {
            menuItem.style.backgroundColor = '#f5f5f5';
          }
        });
        
        menuItem.addEventListener('mouseout', () => {
          if (status.value !== this.currentStatus) {
            menuItem.style.backgroundColor = 'transparent';
          }
        });
        
        // Status icon
        const itemIcon = document.createElement('span');
        itemIcon.className = 'status-icon';
        itemIcon.textContent = status.icon;
        this.applyStyles(itemIcon, {
          marginRight: '8px'
        });
        
        // Status label
        const itemLabel = document.createElement('span');
        itemLabel.className = 'status-label';
        itemLabel.textContent = status.label;
        
        menuItem.appendChild(itemIcon);
        menuItem.appendChild(itemLabel);
        
        // Add click event listener
        menuItem.addEventListener('click', () => this.handleStatusSelect(status.value));
        
        statusMenu.appendChild(menuItem);
      });
      
      this.statusElement.appendChild(statusMenu);
    }
  }
  
  /**
   * Toggle the status menu dropdown
   * @param {Event} e - Click event
   */
  toggleStatusMenu(e) {
    e.stopPropagation();
    
    // Only toggle if we're connected
    if (this.connectionStatus === 'connected') {
      this.statusMenuOpen = !this.statusMenuOpen;
      this.render();
    }
  }
  
  /**
   * Handle status selection
   * @param {string} status - Selected status
   */
  async handleStatusSelect(status) {
    try {
      // Update current status
      this.currentStatus = status;
      
      // Close the menu
      this.statusMenuOpen = false;
      
      // Update UI
      this.render();
      
      // Send status update to server
      const success = await webSocketContext.updateUserStatus(status);
      
      if (!success) {
        throw new Error('Failed to update status');
      }
      
      // Log status change
      logChatEvent('ui', 'User status changed', { status });
    } catch (error) {
      handleError(error, {
        code: ErrorCode.API_REQUEST_FAILED,
        category: ErrorCategory.NETWORK,
        source: 'UserStatus',
        message: 'Failed to update status'
      });
      
      // Revert to previous status on error
      const currentUser = authContext.getCurrentUser();
      this.currentStatus = currentUser?.status || 'online';
      this.render();
    }
  }
  
  /**
   * Handle clicks outside the component
   * @param {Event} e - Click event
   */
  handleClickOutside(e) {
    if (this.statusElement && !this.statusElement.contains(e.target) && this.statusMenuOpen) {
      this.statusMenuOpen = false;
      this.render();
    }
  }
  
  /**
   * Update status from external source
   * @param {string} status - New status
   */
  updateStatus(status) {
    if (this.statusOptions.some(option => option.value === status)) {
      this.currentStatus = status;
      this.render();
    }
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
    // Remove event listeners
    document.removeEventListener('click', this.handleClickOutside);
    
    // Remove subscription
    if (this.connectionSubscription) {
      this.connectionSubscription();
      this.connectionSubscription = null;
    }
    
    // Remove from DOM
    if (this.statusElement && this.statusElement.parentNode) {
      this.statusElement.parentNode.removeChild(this.statusElement);
    }
    
    // Log destruction
    logChatEvent('ui', 'User status component destroyed');
  }
}

export default UserStatus;