// chat/components/app/appcontainer/HeaderRenderer.js
// Handles rendering of the custom header component

/**
 * Create custom header for HIPAA-compliant chat
 * @param {HTMLElement} container - The container to render the header into
 * @param {Object} options - Header options
 * @returns {HTMLElement} The created header element
 */
export function createCustomHeader(container, options = {}) {
    const {
      currentUser,
      connectionStatus = 'connected',
      activeView = 'chat',
      onViewSwitch = () => {},
      onToggleUserList = () => {},
      onLogout = () => {}
    } = options;
  
    // Header bar colors
    const COLORS = {
      primary: '#2196F3',      // Blue - main header color
      primaryDark: '#1976D2',  // Darker blue for hover effects
      text: '#ffffff',         // White text
      textSecondary: 'rgba(255, 255, 255, 0.7)', // Semi-transparent white
      accent: '#4CAF50',       // Green accent color
      warning: '#FFC107',      // Yellow warning
      error: '#F44336'         // Red error
    };
  
    const header = document.createElement('div');
    header.className = 'hipaa-chat-header';
    applyStyles(header, {
      backgroundColor: COLORS.primary,
      color: COLORS.text,
      padding: '0 20px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    });
  
    // Left section: Logo and title
    const leftSection = document.createElement('div');
    applyStyles(leftSection, {
      display: 'flex',
      alignItems: 'center',
      height: '100%'
    });
  
    // App logo/title
    const appTitle = document.createElement('div');
    applyStyles(appTitle, {
      display: 'flex',
      alignItems: 'center',
      marginRight: '24px'
    });
  
    // Logo icon
    const logoIcon = document.createElement('span');
    logoIcon.textContent = '💬';
    applyStyles(logoIcon, {
      fontSize: '24px',
      marginRight: '10px'
    });
  
    // Title
    const title = document.createElement('h1');
    title.textContent = 'MCP Chat';
    applyStyles(title, {
      margin: '0',
      fontSize: '20px',
      fontWeight: 'bold',
      letterSpacing: '0.5px'
    });
  
    appTitle.appendChild(logoIcon);
    appTitle.appendChild(title);
    leftSection.appendChild(appTitle);
  
    // Navigation tabs
    const nav = document.createElement('nav');
    applyStyles(nav, {
      display: 'flex',
      height: '100%'
    });
  
    // Create navigation items
    const navItems = [
      { id: 'chat', label: 'Chat' },
      { id: 'admin', label: 'Admin', adminOnly: true },
      { id: 'settings', label: 'Settings' }
    ];
  
    // Create nav items
    navItems.forEach(navItem => {
      // Skip admin tab for non-admin users
      if (navItem.adminOnly && currentUser?.role !== 'admin') {
        return;
      }
  
      const isActive = activeView === navItem.id;
      
      const navItemElement = document.createElement('div');
      navItemElement.className = `nav-item ${isActive ? 'active' : ''}`;
      applyStyles(navItemElement, {
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        cursor: 'pointer',
        position: 'relative',
        color: isActive ? COLORS.text : COLORS.textSecondary,
        fontWeight: isActive ? 'bold' : 'normal'
      });
  
      // Add active indicator line at bottom
      if (isActive) {
        const activeIndicator = document.createElement('div');
        applyStyles(activeIndicator, {
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: '100%',
          height: '3px',
          backgroundColor: COLORS.text
        });
        navItemElement.appendChild(activeIndicator);
      }
  
      navItemElement.textContent = navItem.label;
  
      // Add hover effect
      navItemElement.addEventListener('mouseover', () => {
        if (!isActive) {
          navItemElement.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          navItemElement.style.color = COLORS.text;
        }
      });
  
      navItemElement.addEventListener('mouseout', () => {
        if (!isActive) {
          navItemElement.style.backgroundColor = 'transparent';
          navItemElement.style.color = COLORS.textSecondary;
        }
      });
  
      // Add click handler
      navItemElement.addEventListener('click', () => {
        if (onViewSwitch) {
          onViewSwitch(navItem.id);
        }
      });
  
      nav.appendChild(navItemElement);
    });
  
    leftSection.appendChild(nav);
  
    // Center section: Connection status
    const centerSection = document.createElement('div');
    applyStyles(centerSection, {
      display: 'flex',
      justifyContent: 'center',
      flex: '1'
    });
  
    const connectionIndicator = createConnectionIndicator(connectionStatus);
    centerSection.appendChild(connectionIndicator);
  
    // Right section: User info and actions
    const rightSection = document.createElement('div');
    applyStyles(rightSection, {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    });
  
    // Toggle user list button
    const toggleUserListButton = document.createElement('button');
    toggleUserListButton.title = 'Toggle Team Members';
    toggleUserListButton.innerHTML = '👥';
    applyStyles(toggleUserListButton, {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      border: 'none',
      color: COLORS.text,
      fontSize: '18px',
      cursor: 'pointer',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
  
    // Add hover effect
    toggleUserListButton.addEventListener('mouseover', () => {
      toggleUserListButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    });
  
    toggleUserListButton.addEventListener('mouseout', () => {
      toggleUserListButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    });
  
    toggleUserListButton.addEventListener('click', () => {
      if (onToggleUserList) {
        onToggleUserList();
      }
    });
  
    // User profile button
    const userProfile = document.createElement('div');
    applyStyles(userProfile, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      padding: '6px',
      borderRadius: '4px',
      position: 'relative'
    });
  
    // Add hover effect
    userProfile.addEventListener('mouseover', () => {
      userProfile.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });
  
    userProfile.addEventListener('mouseout', () => {
      userProfile.style.backgroundColor = 'transparent';
    });
  
    // User avatar
    const userAvatar = document.createElement('div');
    applyStyles(userAvatar, {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: '16px'
    });
  
    // Get first letter of username or display name
    const initial = currentUser?.displayName?.charAt(0) || currentUser?.username?.charAt(0) || '?';
    userAvatar.textContent = initial.toUpperCase();
  
    // User name
    const userName = document.createElement('div');
    userName.textContent = currentUser?.displayName || currentUser?.username || 'Guest';
    applyStyles(userName, {
      fontSize: '14px',
      fontWeight: 'medium'
    });
  
    // Dropdown arrow
    const dropdownArrow = document.createElement('span');
    dropdownArrow.innerHTML = '&#9662;'; // Down triangle
    applyStyles(dropdownArrow, {
      fontSize: '12px',
      marginLeft: '4px'
    });
  
    userProfile.appendChild(userAvatar);
    userProfile.appendChild(userName);
    userProfile.appendChild(dropdownArrow);
  
    // Create dropdown menu (initially hidden)
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'user-dropdown';
    applyStyles(dropdownMenu, {
      position: 'absolute',
      top: '50px',
      right: '0',
      backgroundColor: 'white',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      borderRadius: '4px',
      zIndex: '100',
      minWidth: '180px',
      display: 'none'
    });
  
    // Dropdown items
    const dropdownItems = [
      { label: 'Profile', icon: '👤', onClick: () => console.log('Profile clicked') },
      { label: 'Preferences', icon: '⚙️', onClick: () => console.log('Preferences clicked') },
      { type: 'divider' },
      { label: 'Logout', icon: '🚪', onClick: onLogout }
    ];
  
    dropdownItems.forEach(item => {
      if (item.type === 'divider') {
        const divider = document.createElement('div');
        applyStyles(divider, {
          height: '1px',
          backgroundColor: '#e0e0e0',
          margin: '8px 0'
        });
        dropdownMenu.appendChild(divider);
        return;
      }
      
      const menuItem = document.createElement('div');
      applyStyles(menuItem, {
        display: 'flex',
        alignItems: 'center',
        padding: '10px 16px',
        cursor: 'pointer',
        color: '#333',
        fontSize: '14px'
      });
  
      // Add hover effect
      menuItem.addEventListener('mouseover', () => {
        menuItem.style.backgroundColor = '#f5f5f5';
      });
  
      menuItem.addEventListener('mouseout', () => {
        menuItem.style.backgroundColor = 'transparent';
      });
  
      // Icon
      const icon = document.createElement('span');
      icon.textContent = item.icon;
      applyStyles(icon, {
        marginRight: '12px',
        fontSize: '16px'
      });
  
      // Label
      const label = document.createElement('span');
      label.textContent = item.label;
  
      menuItem.appendChild(icon);
      menuItem.appendChild(label);
  
      // Add click handler
      if (item.onClick) {
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdownMenu.style.display = 'none';
          item.onClick();
        });
      }
  
      dropdownMenu.appendChild(menuItem);
    });
  
    // Toggle dropdown menu on click
    userProfile.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
    });
  
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdownMenu.style.display = 'none';
    });
  
    // Add elements to right section
    rightSection.appendChild(toggleUserListButton);
    rightSection.appendChild(userProfile);
    rightSection.appendChild(dropdownMenu);
  
    // Add all sections to header
    header.appendChild(leftSection);
    header.appendChild(centerSection);
    header.appendChild(rightSection);
  
    // Add header to container if provided
    if (container) {
      container.appendChild(header);
    }
  
    return header;
  }
  
  /**
   * Create connection status indicator
   * @param {string} status - Connection status
   * @returns {HTMLElement} Status indicator element
   */
  function createConnectionIndicator(status) {
    const statusColors = {
      connected: '#4CAF50',    // Green
      connecting: '#FFC107',   // Yellow
      disconnected: '#F44336', // Red
      error: '#F44336'         // Red
    };
  
    const statusText = {
      connected: 'Connected',
      connecting: 'Connecting...',
      disconnected: 'Disconnected',
      error: 'Connection Error'
    };
  
    const indicator = document.createElement('div');
    applyStyles(indicator, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '6px 12px'
    });
  
    // Status dot
    const statusDot = document.createElement('div');
    applyStyles(statusDot, {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: statusColors[status] || statusColors.error
    });
  
    // Status label
    const statusLabel = document.createElement('span');
    statusLabel.textContent = statusText[status] || 'Unknown';
    applyStyles(statusLabel, {
      fontSize: '12px',
      fontWeight: 'medium'
    });
  
    indicator.appendChild(statusDot);
    indicator.appendChild(statusLabel);
  
    return indicator;
  }
  
  /**
   * Apply CSS styles to an element
   * @param {HTMLElement} element - Element to style
   * @param {Object} styles - Styles to apply
   */
  function applyStyles(element, styles) {
    Object.assign(element.style, styles);
  }
  
  export default { createCustomHeader };