// chat/components/app/appcontainer/AdminViewRenderer.js
// Handles rendering of the admin view component

/**
 * Render the admin view
 * @param {HTMLElement} container - Container to render into
 * @param {Object} options - Rendering options
 * @returns {HTMLElement} The rendered admin view
 */
export function renderAdminView(container, options = {}) {
    const {
      currentUser = null
    } = options;
    
    // Check if user has admin permissions
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    if (!isAdmin) {
      return renderAccessDenied(container);
    }
    
    // Create admin panel layout
    const adminPanel = document.createElement('div');
    applyStyles(adminPanel, {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: '#f5f7f9',
      padding: '20px'
    });
    
    // Create admin header
    const header = createAdminHeader();
    adminPanel.appendChild(header);
    
    // Create tabs container
    const tabsContainer = document.createElement('div');
    applyStyles(tabsContainer, {
      display: 'flex',
      borderBottom: '1px solid #dee2e6',
      marginBottom: '20px'
    });
    
    // Add tabs
    const tabs = [
      { id: 'users', label: 'Users', icon: '👥' },
      { id: 'channels', label: 'Channels', icon: '🌐' },
      { id: 'roles', label: 'Roles & Permissions', icon: '🔒' },
      { id: 'audit', label: 'Audit Log', icon: '📋' }
    ];
    
    // Set active tab
    const activeTab = 'users';
    
    tabs.forEach(tab => {
      const tabElement = createAdminTab(tab, tab.id === activeTab);
      tabsContainer.appendChild(tabElement);
    });
    
    adminPanel.appendChild(tabsContainer);
    
    // Create content area
    const contentArea = document.createElement('div');
    applyStyles(contentArea, {
      flex: '1',
      backgroundColor: '#ffffff',
      borderRadius: '4px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'auto'
    });
    
    // Render the active tab content
    switch (activeTab) {
      case 'users':
        renderUsersTab(contentArea);
        break;
      case 'channels':
        renderChannelsTab(contentArea);
        break;
      case 'roles':
        renderRolesTab(contentArea);
        break;
      case 'audit':
        renderAuditTab(contentArea);
        break;
      default:
        renderUsersTab(contentArea);
    }
    
    adminPanel.appendChild(contentArea);
    container.appendChild(adminPanel);
    
    return adminPanel;
  }
  
  /**
   * Render access denied message for non-admin users
   * @param {HTMLElement} container - Container to render into
   * @returns {HTMLElement} The rendered access denied message
   */
  function renderAccessDenied(container) {
    const accessDenied = document.createElement('div');
    applyStyles(accessDenied, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      padding: '20px',
      textAlign: 'center',
      color: '#721c24',
      backgroundColor: '#f8d7da'
    });
    
    const iconElement = document.createElement('div');
    iconElement.innerHTML = '⛔';
    applyStyles(iconElement, {
      fontSize: '48px',
      marginBottom: '16px'
    });
    
    const titleElement = document.createElement('h3');
    titleElement.textContent = 'Access Denied';
    applyStyles(titleElement, {
      margin: '0 0 10px 0',
      fontSize: '24px'
    });
    
    const messageElement = document.createElement('p');
    messageElement.textContent = 'Administrator privileges are required to access this area.';
    
    accessDenied.appendChild(iconElement);
    accessDenied.appendChild(titleElement);
    accessDenied.appendChild(messageElement);
    
    container.appendChild(accessDenied);
    return accessDenied;
  }
  
  /**
   * Create admin header
   * @returns {HTMLElement} Admin header element
   */
  function createAdminHeader() {
    const header = document.createElement('div');
    applyStyles(header, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    });
    
    const title = document.createElement('h2');
    title.textContent = 'Admin Panel';
    applyStyles(title, {
      margin: '0',
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#333'
    });
    
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Manage users, channels, and permissions';
    applyStyles(subtitle, {
      margin: '0',
      color: '#666',
      fontSize: '14px'
    });
    
    const titleGroup = document.createElement('div');
    titleGroup.appendChild(title);
    titleGroup.appendChild(subtitle);
    
    header.appendChild(titleGroup);
    
    return header;
  }
  
  /**
   * Create admin tab
   * @param {Object} tab - Tab data
   * @param {boolean} isActive - Whether tab is active
   * @returns {HTMLElement} Tab element
   */
  function createAdminTab(tab, isActive) {
    const tabElement = document.createElement('div');
    applyStyles(tabElement, {
      padding: '12px 16px',
      cursor: 'pointer',
      borderBottom: isActive ? '2px solid #2196F3' : '2px solid transparent',
      color: isActive ? '#2196F3' : '#666',
      fontWeight: isActive ? 'bold' : 'normal',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });
    
    // Tab icon
    const icon = document.createElement('span');
    icon.textContent = tab.icon;
    
    // Tab label
    const label = document.createElement('span');
    label.textContent = tab.label;
    
    tabElement.appendChild(icon);
    tabElement.appendChild(label);
    
    // Hover effect
    tabElement.addEventListener('mouseover', () => {
      if (!isActive) {
        tabElement.style.color = '#333';
        tabElement.style.borderBottom = '2px solid #ddd';
      }
    });
    
    tabElement.addEventListener('mouseout', () => {
      if (!isActive) {
        tabElement.style.color = '#666';
        tabElement.style.borderBottom = '2px solid transparent';
      }
    });
    
    return tabElement;
  }
  
  /**
   * Render users management tab
   * @param {HTMLElement} container - Container to render into
   */
  function renderUsersTab(container) {
    // Create toolbar
    const toolbar = createUsersToolbar();
    container.appendChild(toolbar);
    
    // Create users table
    const table = createUsersTable();
    container.appendChild(table);
  }
  
  /**
   * Create users toolbar
   * @returns {HTMLElement} Users toolbar element
   */
  function createUsersToolbar() {
    const toolbar = document.createElement('div');
    applyStyles(toolbar, {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '15px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      border: '1px solid #dee2e6'
    });
    
    // Left section with search
    const leftSection = document.createElement('div');
    applyStyles(leftSection, {
      display: 'flex',
      alignItems: 'center',
      flex: '1',
      marginRight: '15px'
    });
    
    const searchIcon = document.createElement('span');
    searchIcon.textContent = '🔍';
    applyStyles(searchIcon, {
      marginRight: '8px'
    });
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search users...';
    applyStyles(searchInput, {
      flex: '1',
      padding: '8px 12px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '14px'
    });
    
    leftSection.appendChild(searchIcon);
    leftSection.appendChild(searchInput);
    
    // Right section with actions
    const rightSection = document.createElement('div');
    applyStyles(rightSection, {
      display: 'flex',
      gap: '10px'
    });
    
    // Create user button
    const createButton = document.createElement('button');
    applyStyles(createButton, {
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '8px 12px',
      fontSize: '14px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    });
    
    const createIcon = document.createElement('span');
    createIcon.textContent = '+';
    createButton.appendChild(createIcon);
    
    const createText = document.createElement('span');
    createText.textContent = 'Create User';
    createButton.appendChild(createText);
    
    // Import button
    const importButton = document.createElement('button');
    applyStyles(importButton, {
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '8px 12px',
      fontSize: '14px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    });
    
    const importIcon = document.createElement('span');
    importIcon.textContent = '↑';
    importButton.appendChild(importIcon);
    
    const importText = document.createElement('span');
    importText.textContent = 'Import';
    importButton.appendChild(importText);
    
    rightSection.appendChild(createButton);
    rightSection.appendChild(importButton);
    
    // Add both sections to toolbar
    toolbar.appendChild(leftSection);
    toolbar.appendChild(rightSection);
    
    return toolbar;
  }
  
  /**
   * Create users table
   * @returns {HTMLElement} Users table element
   */
  function createUsersTable() {
    const tableContainer = document.createElement('div');
    applyStyles(tableContainer, {
      backgroundColor: '#ffffff',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      overflow: 'hidden'
    });
    
    const table = document.createElement('table');
    applyStyles(table, {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px'
    });
    
    // Create table header
    const thead = document.createElement('thead');
    applyStyles(thead, {
      backgroundColor: '#f8f9fa',
      fontWeight: 'bold'
    });
    
    const headerRow = document.createElement('tr');
    
    const headers = ['Username', 'Display Name', 'Role', 'Status', 'Last Login', 'Actions'];
    
    headers.forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      applyStyles(th, {
        padding: '12px 15px',
        textAlign: 'left',
        borderBottom: '2px solid #dee2e6'
      });
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Mock user data
    const users = [
      { username: 'admin', displayName: 'Administrator', role: 'admin', status: 'online', lastLogin: '2023-04-15T08:30:00Z' },
      { username: 'john.doe', displayName: 'John Doe', role: 'user', status: 'online', lastLogin: '2023-04-15T09:15:00Z' },
      { username: 'jane.smith', displayName: 'Jane Smith', role: 'moderator', status: 'away', lastLogin: '2023-04-14T17:45:00Z' },
      { username: 'support', displayName: 'Support Team', role: 'moderator', status: 'dnd', lastLogin: '2023-04-15T10:00:00Z' }
    ];
    
    users.forEach(user => {
      const row = createUserRow(user);
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    
    // Add pagination controls
    const paginationControls = createPaginationControls(1, 1, 4);
    tableContainer.appendChild(paginationControls);
    
    return tableContainer;
  }
  
  /**
   * Create user table row
   * @param {Object} user - User data
   * @returns {HTMLElement} Table row element
   */
  function createUserRow(user) {
    const row = document.createElement('tr');
    
    // Add hover effect
    row.addEventListener('mouseover', () => {
      row.style.backgroundColor = '#f8f9fa';
    });
    
    row.addEventListener('mouseout', () => {
      row.style.backgroundColor = '';
    });
    
    // Username cell
    const usernameCell = document.createElement('td');
    usernameCell.textContent = user.username;
    applyStyles(usernameCell, {
      padding: '12px 15px',
      borderBottom: '1px solid #dee2e6'
    });
    
    // Display name cell
    const displayNameCell = document.createElement('td');
    displayNameCell.textContent = user.displayName;
    applyStyles(displayNameCell, {
      padding: '12px 15px',
      borderBottom: '1px solid #dee2e6'
    });
    
    // Role cell
    const roleCell = document.createElement('td');
    
    const roleBadge = document.createElement('span');
    roleBadge.textContent = user.role || 'user';
    
    // Style based on role
    let badgeColor = '#6c757d'; // Default gray
    
    if (user.role === 'admin') {
      badgeColor = '#dc3545'; // Red for admin
    } else if (user.role === 'moderator') {
      badgeColor = '#ffc107'; // Yellow for moderator
    }
    
    applyStyles(roleBadge, {
      backgroundColor: badgeColor,
      color: 'white',
      padding: '3px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      textTransform: 'uppercase'
    });
    
    roleCell.appendChild(roleBadge);
    applyStyles(roleCell, {
      padding: '12px 15px',
      borderBottom: '1px solid #dee2e6'
    });
    
    // Status cell
    const statusCell = document.createElement('td');
    
    const statusBadge = document.createElement('span');
    statusBadge.textContent = user.status || 'offline';
    
    // Style based on status
    let statusColor = '#6c757d'; // Default gray
    
    if (user.status === 'online') {
      statusColor = '#28a745'; // Green
    } else if (user.status === 'away') {
      statusColor = '#ffc107'; // Yellow
    } else if (user.status === 'dnd') {
      statusColor = '#dc3545'; // Red
    }
    
    applyStyles(statusBadge, {
      backgroundColor: statusColor,
      color: 'white',
      padding: '3px 8px',
      borderRadius: '12px',
      fontSize: '12px'
    });
    
    statusCell.appendChild(statusBadge);
    applyStyles(statusCell, {
      padding: '12px 15px',
      borderBottom: '1px solid #dee2e6'
    });
    
    // Last login cell
    const lastLoginCell = document.createElement('td');
    lastLoginCell.textContent = formatDateTime(user.lastLogin);
    applyStyles(lastLoginCell, {
      padding: '12px 15px',
      borderBottom: '1px solid #dee2e6'
    });
    
    // Actions cell
    const actionsCell = document.createElement('td');
    applyStyles(actionsCell, {
      padding: '12px 15px',
      borderBottom: '1px solid #dee2e6'
    });
    
    const actionsContainer = document.createElement('div');
    applyStyles(actionsContainer, {
      display: 'flex',
      gap: '5px'
    });
    
    // Edit button
    const editButton = createActionButton('✏️', 'Edit user');
    
    // Reset password button
    const resetButton = createActionButton('🔑', 'Reset password');
    
    // Delete button
    const deleteButton = createActionButton('🗑️', 'Delete user');
    
    actionsContainer.appendChild(editButton);
    actionsContainer.appendChild(resetButton);
    actionsContainer.appendChild(deleteButton);
    actionsCell.appendChild(actionsContainer);
    
    // Add cells to row
    row.appendChild(usernameCell);
    row.appendChild(displayNameCell);
    row.appendChild(roleCell);
    row.appendChild(statusCell);
    row.appendChild(lastLoginCell);
    row.appendChild(actionsCell);
    
    return row;
  }
  
  /**
   * Create an action button
   * @param {string} icon - Button icon
   * @param {string} title - Button title
   * @returns {HTMLElement} Button element
   */
  function createActionButton(icon, title) {
    const button = document.createElement('button');
    button.textContent = icon;
    button.title = title;
    
    applyStyles(button, {
      width: '28px',
      height: '28px',
      borderRadius: '4px',
      border: '1px solid #dee2e6',
      backgroundColor: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px'
    });
    
    // Hover effect
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = '#f8f9fa';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = 'white';
    });
    
    return button;
  }
  
  /**
   * Create pagination controls
   * @param {number} currentPage - Current page number
   * @param {number} totalPages - Total pages
   * @param {number} totalItems - Total items
   * @returns {HTMLElement} Pagination controls
   */
  function createPaginationControls(currentPage, totalPages, totalItems) {
    const controls = document.createElement('div');
    applyStyles(controls, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 15px',
      backgroundColor: '#f8f9fa',
      borderTop: '1px solid #dee2e6'
    });
    
    // Results info
    const resultsInfo = document.createElement('div');
    resultsInfo.textContent = `Showing ${totalItems} of ${totalItems} users`;
    applyStyles(resultsInfo, {
      fontSize: '14px',
      color: '#6c757d'
    });
    
    // Page controls
    const pageControls = document.createElement('div');
    applyStyles(pageControls, {
      display: 'flex',
      gap: '5px',
      alignItems: 'center'
    });
    
    // First page button
    const firstButton = document.createElement('button');
    firstButton.textContent = '⟨⟨';
    firstButton.title = 'First Page';
    applyStyles(firstButton, {
      padding: '5px 10px',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      backgroundColor: 'white',
      cursor: 'pointer',
      opacity: '0.5'
    });
    
    firstButton.disabled = true;
    
    // Previous page button
    const prevButton = document.createElement('button');
    prevButton.textContent = '⟨';
    prevButton.title = 'Previous Page';
    applyStyles(prevButton, {
      padding: '5px 10px',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      backgroundColor: 'white',
      cursor: 'pointer',
      opacity: '0.5'
    });
    
    prevButton.disabled = true;
    
    // Page indicator
    const pageIndicator = document.createElement('span');
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    applyStyles(pageIndicator, {
      padding: '0 10px',
      fontSize: '14px'
    });
    
    // Next page button
    const nextButton = document.createElement('button');
    nextButton.textContent = '⟩';
    nextButton.title = 'Next Page';
    applyStyles(nextButton, {
      padding: '5px 10px',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      backgroundColor: 'white',
      cursor: 'pointer',
      opacity: '0.5'
    });
    
    nextButton.disabled = true;
    
    // Last page button
    const lastButton = document.createElement('button');
    lastButton.textContent = '⟩⟩';
    lastButton.title = 'Last Page';
    applyStyles(lastButton, {
      padding: '5px 10px',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      backgroundColor: 'white',
      cursor: 'pointer',
      opacity: '0.5'
    });
    
    lastButton.disabled = true;
    
    // Add all controls
    pageControls.appendChild(firstButton);
    pageControls.appendChild(prevButton);
    pageControls.appendChild(pageIndicator);
    pageControls.appendChild(nextButton);
    pageControls.appendChild(lastButton);
    
    controls.appendChild(resultsInfo);
    controls.appendChild(pageControls);
    
    return controls;
  }
  
  /**
   * Render channels management tab
   * @param {HTMLElement} container - Container to render into
   */
  function renderChannelsTab(container) {
    const placeholder = document.createElement('div');
    applyStyles(placeholder, {
      textAlign: 'center',
      padding: '20px',
      color: '#666'
    });
    
    placeholder.textContent = 'Channel management interface would go here';
    container.appendChild(placeholder);
  }
  
  /**
   * Render roles management tab
   * @param {HTMLElement} container - Container to render into
   */
  function renderRolesTab(container) {
    const placeholder = document.createElement('div');
    applyStyles(placeholder, {
      textAlign: 'center',
      padding: '20px',
      color: '#666'
    });
    
    placeholder.textContent = 'Roles and permissions management interface would go here';
    container.appendChild(placeholder);
  }
  
  /**
   * Render audit log tab
   * @param {HTMLElement} container - Container to render into
   */
  function renderAuditTab(container) {
    const placeholder = document.createElement('div');
    applyStyles(placeholder, {
      textAlign: 'center',
      padding: '20px',
      color: '#666'
    });
    
    placeholder.textContent = 'Audit log interface would go here';
    container.appendChild(placeholder);
  }
  
  /**
   * Format a date and time for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date and time
   */
  function formatDateTime(dateString) {
    if (!dateString) return 'Never';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return dateString;
    }
  }
  
  /**
   * Apply CSS styles to an element
   * @param {HTMLElement} element - Element to style
   * @param {Object} styles - Styles to apply
   */
  function applyStyles(element, styles) {
    Object.assign(element.style, styles);
  }
  
  export default { renderAdminView };