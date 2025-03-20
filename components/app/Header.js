// components/app/Header.js
// Header component for HIPAA-compliant chat

import { logChatEvent } from '../../utils/logger.js';
import { getEncryptionInfo } from '../../services/encryption/encryption.js';
import UserStatus from '../users/UserStatus.js';

/**
 * Header Component
 * Main application header with navigation and user controls
 */
class Header {
  /**
   * Create a new Header
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Header options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      title: 'MCP Messenger',
      onLogout: null,
      onViewChange: null,
      currentView: 'chat',
      showEncryptionStatus: true,
      ...options
    };
    
    this.headerElement = null;
    this.userStatusComponent = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.handleViewChange = this.handleViewChange.bind(this);
    
    // Initialize component
    this.initialize();
  }
  
  /**
   * Initialize the header
   */
  initialize() {
    // Create header element
    this.headerElement = document.createElement('header');
    this.headerElement.className = 'app-header';
    this.applyStyles(this.headerElement, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      height: '60px',
      backgroundColor: '#343a40',
      color: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    });
    
    // Add to container
    if (this.container) {
      this.container.appendChild(this.headerElement);
    }
    
    // Render component
    this.render();
    
    logChatEvent('ui', 'Header component initialized');
  }
  
  /**
   * Render the header
   */
  render() {
    if (!this.headerElement) return;
    
    // Clear existing content
    this.headerElement.innerHTML = '';
    
    // Create left section (title and navigation)
    const leftSection = document.createElement('div');
    this.applyStyles(leftSection, {
      display: 'flex',
      alignItems: 'center'
    });
    
    // App logo/title
    const titleElement = document.createElement('div');
    titleElement.className = 'app-title';
    titleElement.textContent = this.options.title;
    this.applyStyles(titleElement, {
      fontSize: '18px',
      fontWeight: 'bold',
      marginRight: '20px'
    });
    
    leftSection.appendChild(titleElement);
    
    // Navigation links
    const navLinks = [
      { id: 'chat', label: 'Chat', icon: '💬' },
      { id: 'settings', label: 'Settings', icon: '⚙️' }
    ];
    
    // Create navigation
    const navElement = document.createElement('nav');
    this.applyStyles(navElement, {
      display: 'flex',
      alignItems: 'center'
    });
    
    navLinks.forEach(link => {
      const navItem = document.createElement('a');
      navItem.href = '#';
      navItem.className = `nav-item ${this.options.currentView === link.id ? 'active' : ''}`;
      
      // Apply styles
      this.applyStyles(navItem, {
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        height: '60px',
        color: this.options.currentView === link.id ? 'white' : 'rgba(255,255,255,0.7)',
        textDecoration: 'none',
        borderBottom: this.options.currentView === link.id ? '3px solid #2196F3' : 'none',
        marginRight: '5px',
        cursor: 'pointer'
      });
      
      // Link content
      navItem.innerHTML = `${link.icon} <span style="margin-left: 5px;">${link.label}</span>`;
      
      // Add click event
      navItem.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleViewChange(link.id);
      });
      
      navElement.appendChild(navItem);
    });
    
    leftSection.appendChild(navElement);
    
    // Create right section (user controls)
    const rightSection = document.createElement('div');
    this.applyStyles(rightSection, {
      display: 'flex',
      alignItems: 'center'
    });
    
    // Encryption status
    if (this.options.showEncryptionStatus) {
      const encryptionInfo = getEncryptionInfo();
      
      const encryptionStatus = document.createElement('div');
      encryptionStatus.className = 'encryption-status';
      this.applyStyles(encryptionStatus, {
        display: 'flex',
        alignItems: 'center',
        marginRight: '15px',
        fontSize: '12px',
        color: encryptionInfo.active ? '#4CAF50' : '#F44336',
        cursor: 'help'
      });
      
      // Encryption icon
      const encryptionIcon = document.createElement('span');
      encryptionIcon.innerHTML = encryptionInfo.active ? '🔒' : '🔓';
      this.applyStyles(encryptionIcon, {
        marginRight: '5px',
        fontSize: '16px'
      });
      
      encryptionStatus.appendChild(encryptionIcon);
      
      // Encryption text
      const encryptionText = document.createElement('span');
      encryptionText.textContent = encryptionInfo.active ? 'Encrypted' : 'Not Encrypted';
      encryptionStatus.appendChild(encryptionText);
      
      // Show encryption details on hover
      const tooltip = document.createElement('div');
      tooltip.className = 'encryption-tooltip';
      this.applyStyles(tooltip, {
        position: 'absolute',
        top: '60px',
        right: '0',
        backgroundColor: 'white',
        color: '#333',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '250px',
        zIndex: '1000',
        display: 'none'
      });
      
      tooltip.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">Encryption Details</div>
        <div style="margin-bottom: 3px;">Status: ${encryptionInfo.active ? 'Active' : 'Inactive'}</div>
        <div style="margin-bottom: 3px;">Method: ${encryptionInfo.method}</div>
        <div style="margin-bottom: 3px;">HIPAA Compliant: ${encryptionInfo.hipaaCompliant ? 'Yes' : 'No'}</div>
        <div>Browser Support: ${encryptionInfo.browserSupport}</div>
      `;
      
      encryptionStatus.appendChild(tooltip);
      
      // Show tooltip on hover
      encryptionStatus.addEventListener('mouseenter', () => {
        tooltip.style.display = 'block';
      });
      
      encryptionStatus.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
      
      rightSection.appendChild(encryptionStatus);
    }
    
    // User status (if supported)
    const statusContainer = document.createElement('div');
    this.applyStyles(statusContainer, {
      marginRight: '15px'
    });
    
    this.userStatusComponent = new UserStatus(statusContainer, {
      showStatusText: false
    });
    
    rightSection.appendChild(statusContainer);
    
    // Logout button
    const logoutButton = document.createElement('button');
    logoutButton.className = 'logout-button';
    logoutButton.innerHTML = 'Logout';
    this.applyStyles(logoutButton, {
      backgroundColor: 'transparent',
      color: 'white',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '4px',
      padding: '6px 12px',
      cursor: 'pointer',
      fontSize: '14px'
    });
    
    // Add hover effect
    logoutButton.addEventListener('mouseover', () => {
      logoutButton.style.backgroundColor = 'rgba(255,255,255,0.1)';
    });
    
    logoutButton.addEventListener('mouseout', () => {
      logoutButton.style.backgroundColor = 'transparent';
    });
    
    // Add click event
    logoutButton.addEventListener('click', this.handleLogout);
    
    rightSection.appendChild(logoutButton);
    
    // Add sections to header
    this.headerElement.appendChild(leftSection);
    this.headerElement.appendChild(rightSection);
  }
  
  /**
   * Handle logout button click
   */
  handleLogout() {
    if (typeof this.options.onLogout === 'function') {
      this.options.onLogout();
      
      logChatEvent('ui', 'Logout clicked in header');
    }
  }
  
  /**
   * Handle view change
   * @param {string} view - View to change to
   */
  handleViewChange(view) {
    if (this.options.currentView !== view && typeof this.options.onViewChange === 'function') {
      this.options.onViewChange(view);
      
      // Update current view
      this.options.currentView = view;
      
      // Re-render
      this.render();
      
      logChatEvent('ui', 'View changed via header', { view });
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
   * Update header title
   * @param {string} title - New title
   */
  updateTitle(title) {
    this.options.title = title;
    this.render();
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    // Clean up UserStatus component
    if (this.userStatusComponent && typeof this.userStatusComponent.destroy === 'function') {
      this.userStatusComponent.destroy();
    }
    
    // Remove from DOM
    if (this.headerElement && this.headerElement.parentNode) {
      this.headerElement.parentNode.removeChild(this.headerElement);
    }
    
    logChatEvent('ui', 'Header component destroyed');
  }
}

export default Header;