// chat/components/admin/AdminPanel.js
// Main admin panel component for HIPAA-compliant chat

import { logChatEvent } from '../../utils/logger.js';
import { handleError, ErrorCategory, ErrorCode } from '../../utils/error-handler.js';
import { getConfig } from '../../config/index.js';
import authContext from '../../contexts/AuthContext.js';
import webSocketContext from '../../contexts/WebSocketContext.js';
import UserManager from './UserManager.js';
import ChannelManager from './ChannelManager.js';
import AuditLogViewer from './AuditLogViewer.js';
import SettingsManager from './SettingsManager.js';

/**
 * AdminPanel Component
 * Main administration panel for the HIPAA-compliant chat application
 */
class AdminPanel {
  /**
   * Create a new AdminPanel
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      defaultTab: 'users',
      ...options
    };
    
    // DOM elements
    this.panelElement = null;
    this.sidebarElement = null;
    this.contentElement = null;
    
    // State
    this.activeTab = this.options.defaultTab;
    this.isVisible = false;
    
    // Component instances
    this.userManager = null;
    this.channelManager = null;
    this.auditLogViewer = null;
    this.settingsManager = null;
    
    // Subscription for connection status
    this.connectionSubscription = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.switchTab = this.switchTab.bind(this);
    this.handleConnectionChange = this.handleConnectionChange.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the admin panel
   */
  initialize() {
    try {
      // Check if user has admin permissions
      if (!this.checkAdminPermissions()) {
        console.error('[AdminPanel] User does not have admin permissions');
        return;
      }
      
      // Create panel element
      this.panelElement = document.createElement('div');
      this.panelElement.className = 'admin-panel';
      this.panelElement.setAttribute('role', 'region');
      this.panelElement.setAttribute('aria-label', 'Administration Panel');
      
      // Apply styles
      this.applyStyles(this.panelElement, {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        backgroundColor: '#f5f5f5',
        overflow: 'hidden',
        position: 'relative'
      });
      
      // Initially hide panel
      this.panelElement.style.display = 'none';
      
      // Create layout
      this.createLayout();
      
      // Add to container
      if (this.container) {
        this.container.appendChild(this.panelElement);
      }
      
      // Subscribe to connection changes
      this.connectionSubscription = webSocketContext.subscribeToConnection(this.handleConnectionChange);
      
      // Log initialization
      logChatEvent('admin', 'Admin panel initialized');
    } catch (error) {
      handleError(error, {
        code: ErrorCode.COMPONENT_FAILED,
        category: ErrorCategory.UI,
        source: 'AdminPanel',
        message: 'Failed to initialize admin panel'
      });
    }
  }
  
  /**
   * Check if current user has admin permissions
   * @returns {boolean} True if user has admin permissions
   */
  checkAdminPermissions() {
    if (!authContext.isAuthenticated()) {
      return false;
    }
    
    return authContext.hasPermission('admin.access');
  }
  
  /**
   * Create admin panel layout
   */
  createLayout() {
    // Create sidebar
    this.sidebarElement = document.createElement('div');
    this.sidebarElement.className = 'admin-sidebar';
    
    this.applyStyles(this.sidebarElement, {
      width: '220px',
      backgroundColor: '#343a40',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #2c3136',
      overflowY: 'auto'
    });
    
    // Create content area
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'admin-content';
    
    this.applyStyles(this.contentElement, {
      flex: '1',
      padding: '20px',
      overflow: 'auto',
      backgroundColor: '#fff'
    });
    
    // Add sidebar navigation items
    this.createSidebarNav();
    
    // Add elements to panel
    this.panelElement.appendChild(this.sidebarElement);
    this.panelElement.appendChild(this.contentElement);
  }
  
  /**
   * Create sidebar navigation
   */
  createSidebarNav() {
    // Create header with logo/title
    const header = document.createElement('div');
    header.className = 'admin-sidebar-header';
    
    this.applyStyles(header, {
      padding: '20px 16px',
      borderBottom: '1px solid #2c3136',
      marginBottom: '10px'
    });
    
    // Title
    const title = document.createElement('h2');
    title.textContent = 'Admin Panel';
    
    this.applyStyles(title, {
      margin: '0',
      padding: '0',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#fff'
    });
    
    // Subtitle
    const subtitle = document.createElement('div');
    subtitle.textContent = 'HIPAA-Compliant Chat';
    
    this.applyStyles(subtitle, {
      fontSize: '12px',
      color: '#adb5bd',
      marginTop: '5px'
    });
    
    header.appendChild(title);
    header.appendChild(subtitle);
    this.sidebarElement.appendChild(header);
    
    // Create navigation list
    const navList = document.createElement('ul');
    navList.className = 'admin-nav';
    navList.setAttribute('role', 'menu');
    
    this.applyStyles(navList, {
      listStyle: 'none',
      padding: '0',
      margin: '0'
    });
    
    // Define navigation items
    const navItems = [
      { id: 'users', label: 'User Management', icon: '👥', permission: 'user.read' },
      { id: 'channels', label: 'Channel Management', icon: '📢', permission: 'channel.read' },
      { id: 'audit', label: 'Audit Logs', icon: '📋', permission: 'audit.read' },
      { id: 'settings', label: 'System Settings', icon: '⚙️', permission: 'admin.settings' }
    ];
    
    // Create each nav item
    navItems.forEach(item => {
      // Skip if user doesn't have permission
      if (!authContext.hasPermission(item.permission)) {
        return;
      }
      
      const listItem = document.createElement('li');
      listItem.className = `admin-nav-item ${this.activeTab === item.id ? 'active' : ''}`;
      listItem.setAttribute('role', 'menuitem');
      
      this.applyStyles(listItem, {
        margin: '0',
        padding: '0'
      });
      
      const navLink = document.createElement('a');
      navLink.className = `admin-nav-link ${this.activeTab === item.id ? 'active' : ''}`;
      navLink.href = '#';
      navLink.setAttribute('data-tab', item.id);
      navLink.setAttribute('role', 'button');
      
      this.applyStyles(navLink, {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        color: this.activeTab === item.id ? '#fff' : '#adb5bd',
        textDecoration: 'none',
        fontSize: '14px',
        backgroundColor: this.activeTab === item.id ? '#2c3136' : 'transparent',
        borderLeft: this.activeTab === item.id ? '4px solid #2196F3' : '4px solid transparent',
        transition: 'all 0.2s ease'
      });
      
      // Icon
      const icon = document.createElement('span');
      icon.className = 'admin-nav-icon';
      icon.textContent = item.icon;
      
      this.applyStyles(icon, {
        marginRight: '12px',
        fontSize: '16px'
      });
      
      // Label
      const label = document.createElement('span');
      label.textContent = item.label;
      
      // Append icon and label to link
      navLink.appendChild(icon);
      navLink.appendChild(label);
      
      // Add hover effect
      navLink.addEventListener('mouseover', () => {
        if (this.activeTab !== item.id) {
          navLink.style.backgroundColor = '#2c3136';
          navLink.style.color = '#e9ecef';
        }
      });
      
      navLink.addEventListener('mouseout', () => {
        if (this.activeTab !== item.id) {
          navLink.style.backgroundColor = 'transparent';
          navLink.style.color = '#adb5bd';
        }
      });
      
      // Add click handler
      navLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab(item.id);
      });
      
      listItem.appendChild(navLink);
      navList.appendChild(listItem);
    });
    
    this.sidebarElement.appendChild(navList);
    
    // Add connection status indicator
    this.createConnectionIndicator();
    
    // Add user info at bottom
    this.createUserInfo();
    
    // Add exit admin button
    this.createExitButton();
  }
  
  /**
   * Create connection status indicator
   */
  createConnectionIndicator() {
    const connectionStatus = document.createElement('div');
    connectionStatus.className = 'connection-status';
    connectionStatus.id = 'admin-connection-status';
    
    this.applyStyles(connectionStatus, {
      padding: '10px 16px',
      marginTop: '10px',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      color: '#adb5bd'
    });
    
    // Create indicator dot
    const statusDot = document.createElement('span');
    statusDot.className = 'status-dot';
    
    this.applyStyles(statusDot, {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: '#dc3545', // Default to red/disconnected
      marginRight: '8px',
      display: 'inline-block'
    });
    
    // Create status text
    const statusText = document.createElement('span');
    statusText.textContent = 'Disconnected';
    
    connectionStatus.appendChild(statusDot);
    connectionStatus.appendChild(statusText);
    
    this.sidebarElement.appendChild(connectionStatus);
    
    // Update initial state
    const currentStatus = webSocketContext.getConnectionState().status;
    this.updateConnectionIndicator(currentStatus);
  }
  
  /**
   * Update connection status indicator
   * @param {string} status - Connection status
   */
  updateConnectionIndicator(status) {
    const indicator = document.getElementById('admin-connection-status');
    if (!indicator) return;
    
    const statusDot = indicator.querySelector('.status-dot');
    const statusText = indicator.querySelector('span:not(.status-dot)');
    
    if (statusDot && statusText) {
      switch (status) {
        case 'connected':
          statusDot.style.backgroundColor = '#28a745'; // Green
          statusText.textContent = 'Connected';
          break;
        case 'connecting':
          statusDot.style.backgroundColor = '#ffc107'; // Yellow
          statusText.textContent = 'Connecting...';
          break;
        case 'disconnected':
        default:
          statusDot.style.backgroundColor = '#dc3545'; // Red
          statusText.textContent = 'Disconnected';
      }
    }
  }
  
  /**
   * Create user info display
   */
  createUserInfo() {
    const userInfo = document.createElement('div');
    userInfo.className = 'admin-user-info';
    
    this.applyStyles(userInfo, {
      padding: '12px 16px',
      marginTop: 'auto', // Push to bottom
      borderTop: '1px solid #2c3136',
      display: 'flex',
      alignItems: 'center'
    });
    
    // Get current user
    const currentUser = authContext.getCurrentUser();
    if (!currentUser) return;
    
    // User avatar
    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    
    // Get first letter of username
    const initial = (currentUser.displayName || currentUser.username).charAt(0).toUpperCase();
    avatar.textContent = initial;
    
    // Generate color based on username
    const hue = this.generateColorFromString(currentUser.username);
    const bgColor = `hsl(${hue}, 70%, 40%)`;
    
    this.applyStyles(avatar, {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: bgColor,
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: '14px',
      marginRight: '12px',
      flexShrink: '0'
    });
    
    // User info
    const userDetails = document.createElement('div');
    userDetails.className = 'user-details';
    
    this.applyStyles(userDetails, {
      overflow: 'hidden'
    });
    
    // Username
    const nameElement = document.createElement('div');
    nameElement.className = 'user-name';
    nameElement.textContent = currentUser.displayName || currentUser.username;
    
    this.applyStyles(nameElement, {
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#fff',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    });
    
    // Role
    const roleElement = document.createElement('div');
    roleElement.className = 'user-role';
    roleElement.textContent = currentUser.role || 'Administrator';
    
    this.applyStyles(roleElement, {
      fontSize: '12px',
      color: '#adb5bd'
    });
    
    userDetails.appendChild(nameElement);
    userDetails.appendChild(roleElement);
    
    userInfo.appendChild(avatar);
    userInfo.appendChild(userDetails);
    
    this.sidebarElement.appendChild(userInfo);
  }
  
  /**
   * Create exit admin button
   */
  createExitButton() {
    const exitButton = document.createElement('button');
    exitButton.className = 'exit-admin-button';
    exitButton.textContent = 'Exit Admin Panel';
    
    this.applyStyles(exitButton, {
      margin: '16px',
      padding: '8px 16px',
      backgroundColor: 'transparent',
      color: '#adb5bd',
      border: '1px solid #495057',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      width: 'calc(100% - 32px)',
      transition: 'all 0.2s ease'
    });
    
    // Add hover effect
    exitButton.addEventListener('mouseover', () => {
      exitButton.style.backgroundColor = '#495057';
      exitButton.style.color = '#fff';
    });
    
    exitButton.addEventListener('mouseout', () => {
      exitButton.style.backgroundColor = 'transparent';
      exitButton.style.color = '#adb5bd';
    });
    
    // Add click handler
    exitButton.addEventListener('click', () => {
      this.hide();
      
      // Trigger event to show chat UI
      const event = new CustomEvent('admin:exit');
      document.dispatchEvent(event);
      
      // Log exit
      logChatEvent('admin', 'Admin panel exited');
    });
    
    this.sidebarElement.appendChild(exitButton);
  }
  
  /**
   * Switch to a different tab
   * @param {string} tabId - Tab ID to switch to
   */
  switchTab(tabId) {
    // Skip if already active
    if (this.activeTab === tabId) return;
    
    // Update active tab
    this.activeTab = tabId;
    
    // Update sidebar navigation
    const navLinks = this.sidebarElement.querySelectorAll('.admin-nav-link');
    navLinks.forEach(link => {
      const linkTabId = link.getAttribute('data-tab');
      
      if (linkTabId === tabId) {
        link.classList.add('active');
        link.style.backgroundColor = '#2c3136';
        link.style.color = '#fff';
        link.style.borderLeft = '4px solid #2196F3';
      } else {
        link.classList.remove('active');
        link.style.backgroundColor = 'transparent';
        link.style.color = '#adb5bd';
        link.style.borderLeft = '4px solid transparent';
      }
    });
    
    // Clear content area
    this.contentElement.innerHTML = '';
    
    // Load appropriate component
    this.loadTabContent();
    
    // Log tab switch
    logChatEvent('admin', 'Admin tab switched', { tab: tabId });
  }
  
  /**
   * Load content for active tab
   */
  loadTabContent() {
    // Clear existing components
    this.userManager = null;
    this.channelManager = null;
    this.auditLogViewer = null;
    this.settingsManager = null;
    
    // Create title element
    const title = document.createElement('h2');
    title.className = 'content-title';
    
    this.applyStyles(title, {
      margin: '0 0 20px 0',
      padding: '0 0 10px 0',
      borderBottom: '1px solid #e9ecef',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#343a40'
    });
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'tab-content-container';
    
    // Load tab-specific content
    switch (this.activeTab) {
      case 'users':
        title.textContent = 'User Management';
        this.userManager = new UserManager(contentContainer);
        break;
        
      case 'channels':
        title.textContent = 'Channel Management';
        this.channelManager = new ChannelManager(contentContainer);
        break;
        
      case 'audit':
        title.textContent = 'Audit Logs';
        this.auditLogViewer = new AuditLogViewer(contentContainer);
        break;
        
      case 'settings':
        title.textContent = 'System Settings';
        this.settingsManager = new SettingsManager(contentContainer);
        break;
        
      default:
        title.textContent = 'Unknown Tab';
        const errorMessage = document.createElement('p');
        errorMessage.textContent = `Error: Unknown tab "${this.activeTab}"`;
        contentContainer.appendChild(errorMessage);
    }
    
    this.contentElement.appendChild(title);
    this.contentElement.appendChild(contentContainer);
  }
  
  /**
   * Handle connection status changes
   * @param {Object} connectionState - WebSocket connection state
   */
  handleConnectionChange(connectionState) {
    this.updateConnectionIndicator(connectionState.status);
  }
  
  /**
   * Generate a color hue from a string (for user avatars)
   * @param {string} str - Input string
   * @returns {number} Hue value (0-360)
   */
  generateColorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash % 360;
  }
  
  /**
   * Show the admin panel
   */
  show() {
    // Skip if already visible
    if (this.isVisible) return;
    
    // Check permissions
    if (!this.checkAdminPermissions()) {
      console.error('[AdminPanel] User does not have admin permissions');
      return;
    }
    
    // Show panel
    if (this.panelElement) {
      this.panelElement.style.display = 'flex';
    }
    
    // Update state
    this.isVisible = true;
    
    // Load active tab content
    this.loadTabContent();
    
    // Log panel shown
    logChatEvent('admin', 'Admin panel shown');
  }
  
  /**
   * Hide the admin panel
   */
  hide() {
    // Skip if already hidden
    if (!this.isVisible) return;
    
    // Hide panel
    if (this.panelElement) {
      this.panelElement.style.display = 'none';
    }
    
    // Update state
    this.isVisible = false;
    
    // Log panel hidden
    logChatEvent('admin', 'Admin panel hidden');
  }
  
  /**
   * Render the admin panel
   */
  render() {
    // Initial render happens in initialize
    // This just makes sure active tab is shown
    if (this.isVisible) {
      this.loadTabContent();
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
   * Clean up resources
   */
  destroy() {
    try {
      // Remove from DOM
      if (this.panelElement && this.panelElement.parentNode) {
        this.panelElement.parentNode.removeChild(this.panelElement);
      }
      
      // Clean up connection subscription
      if (this.connectionSubscription) {
        this.connectionSubscription();
        this.connectionSubscription = null;
      }
      
      // Clean up child components
      if (this.userManager) {
        this.userManager.destroy();
        this.userManager = null;
      }
      
      if (this.channelManager) {
        this.channelManager.destroy();
        this.channelManager = null;
      }
      
      if (this.auditLogViewer) {
        this.auditLogViewer.destroy();
        this.auditLogViewer = null;
      }
      
      if (this.settingsManager) {
        this.settingsManager.destroy();
        this.settingsManager = null;
      }
      
      // Log destruction
      logChatEvent('admin', 'Admin panel destroyed');
    } catch (error) {
      console.error('[AdminPanel] Error destroying admin panel:', error);
    }
  }
}

export default AdminPanel;