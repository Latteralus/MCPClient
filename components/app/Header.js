// chat/components/app/Header.js
// Application header component for HIPAA-compliant chat

import { logout, getCurrentUser } from '../../services/auth';
import { logChatEvent } from '../../utils/logger.js';
import UserStatus from '../users/UserStatus.js';

/**
 * Header Component
 * Provides navigation, user info, and connection status
 */
class Header {
  /**
   * Create a new Header
   * @param {Object} options - Header options
   * @param {Object} options.user - Current user
   * @param {string} options.connectionStatus - Connection status
   * @param {string} options.activeView - Active view
   * @param {Function} options.onViewSwitch - View switch callback
   * @param {Function} options.onToggleUserList - Toggle user list callback
   * @param {Function} options.onToggleAdminPanel - Toggle admin panel callback
   */
  constructor(options = {}) {
    this.options = {
      user: null,
      connectionStatus: 'disconnected',
      activeView: 'chat',
      onViewSwitch: () => {},
      onToggleUserList: () => {},
      onToggleAdminPanel: () => {},
      ...options
    };
    
    this.headerElement = null;
    this.connectionIndicator = null;
    this.userStatusComponent = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.updateConnectionStatus = this.updateConnectionStatus.bind(this);
    this.updateActiveView = this.updateActiveView.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }
  
  /**
   * Render the header
   * @returns {HTMLElement} The rendered header
   */
  render() {
    // Create header element
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'hipaa-chat-header';
    this.applyStyles(this.headerElement, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      height: '60px',
      backgroundColor: '#2196F3',
      color: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    });
    
    // Create left section (title and nav)
    const leftSection = document.createElement('div');
    this.applyStyles(leftSection, {
      display: 'flex',
      alignItems: 'center'
    });
    
    // App title
    const title = document.createElement('h1');
    title.textContent = 'MCP Chat';
    this.applyStyles(title, {
      margin: '0 20px 0 0',
      fontSize: '18px',
      fontWeight: 'bold'
    });
    
    // Navigation links
    const nav = document.createElement('nav');
    this.applyStyles(nav, {
      display: 'flex',
      gap: '15px'
    });
    
    // Chat link
    const chatLink = this.createNavLink('Chat', this.options.activeView === 'chat', () => {
      this.options.onViewSwitch('chat');
    });
    
    // Admin link (only for admins)
    let adminLink = null;
    if (this.options.user && this.options.user.role === 'admin') {
      adminLink = this.createNavLink('Admin', this.options.activeView === 'admin', () => {
        this.options.onViewSwitch('admin');
      });
      nav.appendChild(adminLink);
    }
    
    // Settings link
    const settingsLink = this.createNavLink('Settings', this.options.activeView === 'settings', () => {
      this.options.onViewSwitch('settings');
    });
    
    // Add links to nav
    nav.appendChild(chatLink);
    if (adminLink) nav.appendChild(adminLink);
    nav.appendChild(settingsLink);
    
    // Add title and nav to left section
    leftSection.appendChild(title);
    leftSection.appendChild(nav);
    
    // Create center section (connection status)
    const centerSection = document.createElement('div');
    this.connectionIndicator = this.createConnectionIndicator(this.options.connectionStatus);
    centerSection.appendChild(this.connectionIndicator);
    
    // Create right section (user info and actions)
    const rightSection = document.createElement('div');
    this.applyStyles(rightSection, {
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    });
    
    // User status
    if (this.options.user) {
      this.userStatusComponent = new UserStatus(rightSection);
    }
    
    // Toggle user list button
    const toggleUserListButton = document.createElement('button');
    toggleUserListButton.title = 'Toggle User List';
    toggleUserListButton.innerHTML = '👥';
    this.applyStyles(toggleUserListButton, {
      backgroundColor: 'transparent',
      border: 'none',
      color: 'white',
      fontSize: '20px',
      cursor: 'pointer',
      padding: '5px'
    });
    
    toggleUserListButton.addEventListener('click', () => {
      this.options.onToggleUserList();
    });
    
    // User menu
    const userMenu = this.createUserMenu(this.options.user);
    
    // Add elements to right section
    rightSection.appendChild(toggleUserListButton);
    rightSection.appendChild(userMenu);
    
    // Add sections to header
    this.headerElement.appendChild(leftSection);
    this.headerElement.appendChild(centerSection);
    this.headerElement.appendChild(rightSection);
    
    return this.headerElement;
  }
  
  /**
   * Create a navigation link
   * @param {string} text - Link text
   * @param {boolean} active - Whether link is active
   * @param {Function} onClick - Click handler
   * @returns {HTMLElement} Nav link element
   */
  createNavLink(text, active, onClick) {
    const link = document.createElement('button');
    link.textContent = text;
    this.applyStyles(link, {
      backgroundColor: 'transparent',
      border: 'none',
      color: 'white',
      padding: '5px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: active ? 'bold' : 'normal',
      borderBottom: active ? '2px solid white' : 'none'
    });
    
    link.addEventListener('click', onClick);
    
    return link;
  }
  
  /**
   * Create a connection status indicator
   * @param {string} status - Connection status
   * @returns {HTMLElement} Status indicator element
   */
  createConnectionIndicator(status) {
    const statusColors = {
      connected: '#4CAF50', // Green
      connecting: '#FFC107', // Yellow
      disconnected: '#F44336', // Red
      error: '#F44336' // Red
    };
    
    const statusText = {
      connected: 'Connected',
      connecting: 'Connecting...',
      disconnected: 'Disconnected',
      error: 'Connection Error'
    };
    
    const indicator = document.createElement('div');
    indicator.className = 'connection-indicator';
    this.applyStyles(indicator, {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '12px'
    });
    
    const statusDot = document.createElement('span');
    this.applyStyles(statusDot, {
      display: 'inline-block',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: statusColors[status] || '#F44336'
    });
    
    const statusLabel = document.createElement('span');
    statusLabel.textContent = statusText[status] || 'Unknown';
    
    indicator.appendChild(statusDot);
    indicator.appendChild(statusLabel);
    
    return indicator;
  }
  
  /**
   * Create user menu
   * @param {Object} user - User object
   * @returns {HTMLElement} User menu element
   */
  createUserMenu(user) {
    const userMenu = document.createElement('div');
    this.applyStyles(userMenu, {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer'
    });
    
    // User avatar
    const avatar = document.createElement('div');
    const initial = user?.username?.charAt(0)?.toUpperCase() || '?';
    avatar.textContent = initial;
    this.applyStyles(avatar, {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: '#ffffff33',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      marginRight: '8px'
    });
    
    // User info
    const userInfo = document.createElement('div');
    
    const username = document.createElement('div');
    username.textContent = user?.displayName || user?.username || 'Unknown User';
    this.applyStyles(username, {
      fontWeight: 'bold',
      fontSize: '14px'
    });
    
    const role = document.createElement('div');
    role.textContent = user?.role || 'user';
    this.applyStyles(role, {
      fontSize: '12px',
      opacity: '0.8'
    });
    
    userInfo.appendChild(username);
    userInfo.appendChild(role);
    
    // Dropdown menu
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'user-dropdown-menu';
    this.applyStyles(dropdownMenu, {
      position: 'absolute',
      top: '100%',
      right: '0',
      backgroundColor: 'white',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      borderRadius: '4px',
      width: '150px',
      display: 'none',
      zIndex: '1000'
    });
    
    // Menu items
    const profileMenuItem = this.createMenuItem('Profile', () => {
      console.log('[CRM Extension] Profile menu clicked');
    });
    
    const logoutMenuItem = this.createMenuItem('Logout', this.handleLogout);
    
    dropdownMenu.appendChild(profileMenuItem);
    dropdownMenu.appendChild(logoutMenuItem);
    
    // Toggle dropdown on click
    const toggleDropdown = () => {
      const isVisible = dropdownMenu.style.display === 'block';
      dropdownMenu.style.display = isVisible ? 'none' : 'block';
    };
    
    userMenu.addEventListener('click', toggleDropdown);
    
    // Close dropdown when clicking elsewhere
    document.addEventListener('click', (e) => {
      if (!userMenu.contains(e.target)) {
        dropdownMenu.style.display = 'none';
      }
    });
    
    // Add elements to menu
    userMenu.appendChild(avatar);
    userMenu.appendChild(userInfo);
    userMenu.appendChild(dropdownMenu);
    
    return userMenu;
  }
  
  /**
   * Create a menu item
   * @param {string} text - Item text
   * @param {Function} onClick - Click handler
   * @returns {HTMLElement} Menu item element
   */
  createMenuItem(text, onClick) {
    const item = document.createElement('div');
    item.textContent = text;
    this.applyStyles(item, {
      padding: '8px 16px',
      color: '#333',
      cursor: 'pointer',
      fontSize: '14px'
    });
    
    // Add hover effect
    item.addEventListener('mouseover', () => {
      item.style.backgroundColor = '#f5f5f5';
    });
    
    item.addEventListener('mouseout', () => {
      item.style.backgroundColor = '';
    });
    
    item.addEventListener('click', onClick);
    
    return item;
  }
  
  /**
   * Handle logout button click
   */
  handleLogout() {
    // Log user logout
    logChatEvent('auth', 'User initiated logout');
    
    // Perform logout
    logout('User initiated logout');
    
    // Force page reload to reset application state
    window.location.reload();
  }
  
  /**
   * Update connection status
   * @param {string} status - New connection status
   */
  updateConnectionStatus(status) {
    if (!this.connectionIndicator) return;
    
    // Re-create the indicator with new status
    const newIndicator = this.createConnectionIndicator(status);
    
    // Replace existing indicator
    this.connectionIndicator.parentNode.replaceChild(newIndicator, this.connectionIndicator);
    this.connectionIndicator = newIndicator;
  }
  
  /**
   * Update active view
   * @param {string} view - New active view
   */
  updateActiveView(view) {
    // For a proper update, we'd need to re-render the navigation
    // In a real implementation, you might update just the affected elements
    if (this.headerElement) {
      // For simplicity, we'll re-render the entire header
      const parent = this.headerElement.parentNode;
      if (parent) {
        this.options.activeView = view;
        const newHeader = this.render();
        parent.replaceChild(newHeader, this.headerElement);
      }
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
    // Clean up user status component
    if (this.userStatusComponent) {
      this.userStatusComponent.destroy();
    }
    
    // Remove from DOM
    if (this.headerElement && this.headerElement.parentNode) {
      this.headerElement.parentNode.removeChild(this.headerElement);
    }
  }
}

export default Header;