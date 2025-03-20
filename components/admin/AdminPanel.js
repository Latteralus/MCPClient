// chat/components/admin/AdminPanel.js
// Admin panel component for HIPAA-compliant chat

import { getCurrentUser, hasPermission } from '../../services/auth';
import { logChatEvent } from '../../utils/logger.js';
import { getAuditLogStats, searchAuditLog, exportAuditLog } from '../../utils/logger.js';
import { getStorageUsage, cleanupExpiredMessages } from '../../utils/storage.js';
import { getEncryptionInfo } from '../../utils/encryption.js';

/**
 * Admin Panel Component
 * Provides administrative functionality for the chat system
 */
class AdminPanel {
  /**
   * Create a new AdminPanel
   * @param {HTMLElement} container - The container element
   */
  constructor(container) {
    this.container = container;
    this.panelElement = null;
    this.activeTab = 'dashboard';
    this.tabContents = {};
    
    // Subcomponents (will be implemented later)
    this.userManager = null;
    this.channelManager = null;
    this.roleManager = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.switchTab = this.switchTab.bind(this);
    this.renderDashboard = this.renderDashboard.bind(this);
    this.renderAuditLog = this.renderAuditLog.bind(this);
    this.renderSettings = this.renderSettings.bind(this);
    this.refreshStats = this.refreshStats.bind(this);
    this.handleExportAuditLog = this.handleExportAuditLog.bind(this);
    this.handleMessageCleanup = this.handleMessageCleanup.bind(this);
    
    // Stats
    this.auditStats = null;
    this.storageStats = null;
    this.encryptionInfo = null;
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the admin panel
   */
  initialize() {
    // Create panel element
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'admin-panel';
    this.applyStyles(this.panelElement, {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      backgroundColor: '#f8f9fa'
    });
    
    // Add to container
    if (this.container) {
      this.container.appendChild(this.panelElement);
    }
    
    // Get initial stats
    this.refreshStats();
    
    // Render the panel
    this.render();
    
    // Log initialization
    logChatEvent('admin', 'Admin panel initialized');
  }
  
  /**
   * Refresh statistics
   */
  refreshStats() {
    this.auditStats = getAuditLogStats();
    this.storageStats = getStorageUsage();
    this.encryptionInfo = getEncryptionInfo();
  }
  
  /**
   * Render the admin panel
   */
  render() {
    if (!this.panelElement) return;
    
    // Clear existing content
    this.panelElement.innerHTML = '';
    
    // Check permissions
    const currentUser = getCurrentUser();
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    if (!isAdmin) {
      this.renderAccessDenied();
      return;
    }
    
    // Create header
    const header = document.createElement('div');
    header.className = 'admin-header';
    this.applyStyles(header, {
      padding: '16px',
      backgroundColor: '#343a40',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    });
    
    const headerTitle = document.createElement('h2');
    headerTitle.textContent = 'MCP Chat Administration';
    this.applyStyles(headerTitle, {
      margin: '0',
      fontSize: '18px',
      fontWeight: 'bold'
    });
    
    header.appendChild(headerTitle);
    this.panelElement.appendChild(header);
    
    // Create tab navigation
    const tabNav = document.createElement('div');
    tabNav.className = 'admin-tabs';
    this.applyStyles(tabNav, {
      display: 'flex',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #dee2e6'
    });
    
    // Define tabs
    const tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'users', label: 'User Management', icon: '👥' },
      { id: 'channels', label: 'Channel Management', icon: '💬' },
      { id: 'roles', label: 'Roles & Permissions', icon: '🔑' },
      { id: 'audit', label: 'Audit Log', icon: '📝' },
      { id: 'settings', label: 'System Settings', icon: '⚙️' }
    ];
    
    // Create tab buttons
    tabs.forEach(tab => {
      const tabButton = document.createElement('button');
      tabButton.className = `tab-button ${this.activeTab === tab.id ? 'active' : ''}`;
      tabButton.setAttribute('data-tab', tab.id);
      
      this.applyStyles(tabButton, {
        padding: '12px 16px',
        backgroundColor: this.activeTab === tab.id ? '#ffffff' : 'transparent',
        border: 'none',
        borderBottom: this.activeTab === tab.id ? '2px solid #2196F3' : '2px solid transparent',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: this.activeTab === tab.id ? 'bold' : 'normal',
        display: 'flex',
        alignItems: 'center',
        color: this.activeTab === tab.id ? '#2196F3' : '#495057'
      });
      
      const tabIcon = document.createElement('span');
      tabIcon.textContent = tab.icon;
      this.applyStyles(tabIcon, {
        marginRight: '8px',
        fontSize: '16px'
      });
      
      const tabLabel = document.createElement('span');
      tabLabel.textContent = tab.label;
      
      tabButton.appendChild(tabIcon);
      tabButton.appendChild(tabLabel);
      
      // Add click event
      tabButton.addEventListener('click', () => this.switchTab(tab.id));
      
      tabNav.appendChild(tabButton);
    });
    
    this.panelElement.appendChild(tabNav);
    
    // Create tab content container
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    this.applyStyles(tabContent, {
      flex: '1',
      padding: '20px',
      backgroundColor: '#ffffff',
      overflowY: 'auto'
    });
    
    // Render the active tab content
    switch (this.activeTab) {
      case 'dashboard':
        this.renderDashboard(tabContent);
        break;
      case 'users':
        this.renderUserManagement(tabContent);
        break;
      case 'channels':
        this.renderChannelManagement(tabContent);
        break;
      case 'roles':
        this.renderRoleManagement(tabContent);
        break;
      case 'audit':
        this.renderAuditLog(tabContent);
        break;
      case 'settings':
        this.renderSettings(tabContent);
        break;
      default:
        this.renderDashboard(tabContent);
    }
    
    this.panelElement.appendChild(tabContent);
    
    // Save tab content element for later reference
    this.tabContents[this.activeTab] = tabContent;
  }
  
  /**
   * Render access denied message
   */
  renderAccessDenied() {
    this.panelElement.innerHTML = '';
    
    const accessDenied = document.createElement('div');
    this.applyStyles(accessDenied, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '20px',
      textAlign: 'center',
      color: '#721c24',
      backgroundColor: '#f8d7da'
    });
    
    const iconElement = document.createElement('div');
    iconElement.innerHTML = '⛔';
    this.applyStyles(iconElement, {
      fontSize: '48px',
      marginBottom: '16px'
    });
    
    const titleElement = document.createElement('h3');
    titleElement.textContent = 'Access Denied';
    this.applyStyles(titleElement, {
      margin: '0 0 10px 0',
      fontSize: '24px'
    });
    
    const messageElement = document.createElement('p');
    messageElement.textContent = 'Administrator privileges are required to access this area.';
    
    accessDenied.appendChild(iconElement);
    accessDenied.appendChild(titleElement);
    accessDenied.appendChild(messageElement);
    
    this.panelElement.appendChild(accessDenied);
    
    // Log access attempt
    logChatEvent('admin', 'Access denied to admin panel');
  }
  
  /**
   * Switch to a different tab
   * @param {string} tabId - ID of the tab to switch to
   */
  switchTab(tabId) {
    if (this.activeTab === tabId) return;
    
    this.activeTab = tabId;
    
    // Log tab switch
    logChatEvent('admin', `Switched to ${tabId} tab`);
    
    // Re-render the panel
    this.render();
  }
  
  /**
   * Render the dashboard tab
   * @param {HTMLElement} container - The tab content container
   */
  renderDashboard(container) {
    // Refresh stats
    this.refreshStats();
    
    // Dashboard header
    const header = document.createElement('div');
    this.applyStyles(header, {
      marginBottom: '20px'
    });
    
    const title = document.createElement('h3');
    title.textContent = 'System Dashboard';
    this.applyStyles(title, {
      margin: '0 0 8px 0',
      fontSize: '20px',
      fontWeight: 'bold'
    });
    
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Overview of system status and metrics';
    this.applyStyles(subtitle, {
      margin: '0',
      color: '#6c757d',
      fontSize: '14px'
    });
    
    header.appendChild(title);
    header.appendChild(subtitle);
    container.appendChild(header);
    
    // Create a grid for stat cards
    const statsGrid = document.createElement('div');
    this.applyStyles(statsGrid, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    });
    
    // User stats card
    const userStatsCard = this.createStatCard(
      '👥 Users',
      [
        { label: 'Total Users', value: this.storageStats.userCount },
        { label: 'Users Online', value: '...' }, // Would need real-time data
        { label: 'Admin Users', value: '...' }, // Would need a count from user service
        { label: 'Last Login', value: '...' } // Would need from auth service
      ]
    );
    
    // Message stats card
    const messageStatsCard = this.createStatCard(
      '💬 Messages',
      [
        { label: 'Total Messages', value: this.storageStats.messageCount },
        { label: 'Storage Usage', value: `${this.storageStats.messagesKB} KB` },
        { label: 'Expiration', value: '24 hours' },
        { label: 'Encryption', value: this.encryptionInfo.method }
      ]
    );
    
    // Channel stats card
    const channelStatsCard = this.createStatCard(
      '📢 Channels',
      [
        { label: 'Total Channels', value: this.storageStats.channelCount },
        { label: 'Public Channels', value: '...' }, // Would need from channel service
        { label: 'Private Channels', value: '...' }, // Would need from channel service
        { label: 'Storage Usage', value: `${this.storageStats.channelsKB} KB` }
      ]
    );
    
    // Audit log stats card
    const auditStatsCard = this.createStatCard(
      '📝 Audit Log',
      [
        { label: 'Total Entries', value: this.auditStats.totalEntries },
        { label: 'Oldest Entry', value: this.formatDate(this.auditStats.oldestEntry) },
        { label: 'Newest Entry', value: this.formatDate(this.auditStats.newestEntry) },
        { label: 'Retention Period', value: `${this.auditStats.retentionDays} days` }
      ]
    );
    
    // Security stats card
    const securityStatsCard = this.createStatCard(
      '🔒 Security',
      [
        { label: 'Encryption Status', value: this.encryptionInfo.active ? 'Active' : 'Inactive' },
        { label: 'Encryption Method', value: this.encryptionInfo.method },
        { label: 'HIPAA Compliant', value: this.encryptionInfo.hipaaCompliant ? 'Yes' : 'No' },
        { label: 'Browser Support', value: this.encryptionInfo.browserSupport }
      ]
    );
    
    // Add cards to grid
    statsGrid.appendChild(userStatsCard);
    statsGrid.appendChild(messageStatsCard);
    statsGrid.appendChild(channelStatsCard);
    statsGrid.appendChild(auditStatsCard);
    statsGrid.appendChild(securityStatsCard);
    
    container.appendChild(statsGrid);
    
    // Add quick actions section
    const actionsSection = document.createElement('div');
    this.applyStyles(actionsSection, {
      marginBottom: '30px'
    });
    
    const actionsTitle = document.createElement('h4');
    actionsTitle.textContent = 'Quick Actions';
    this.applyStyles(actionsTitle, {
      margin: '0 0 15px 0',
      fontSize: '16px',
      fontWeight: 'bold'
    });
    
    actionsSection.appendChild(actionsTitle);
    
    // Create action buttons
    const actionsGrid = document.createElement('div');
    this.applyStyles(actionsGrid, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '10px'
    });
    
    // Create user action
    const createUserBtn = this.createActionButton('Add New User', '👤', () => {
      this.switchTab('users');
      // Would trigger user creation modal in UserManager
    });
    
    // Create channel action
    const createChannelBtn = this.createActionButton('Create Channel', '📢', () => {
      this.switchTab('channels');
      // Would trigger channel creation modal in ChannelManager
    });
    
    // Export audit log action
    const exportLogBtn = this.createActionButton('Export Audit Log', '📥', this.handleExportAuditLog);
    
    // Clean up messages action
    const cleanupBtn = this.createActionButton('Clean Expired Messages', '🧹', this.handleMessageCleanup);
    
    // View audit log action
    const viewLogBtn = this.createActionButton('View Audit Log', '📋', () => {
      this.switchTab('audit');
    });
    
    // Add buttons to grid
    actionsGrid.appendChild(createUserBtn);
    actionsGrid.appendChild(createChannelBtn);
    actionsGrid.appendChild(exportLogBtn);
    actionsGrid.appendChild(cleanupBtn);
    actionsGrid.appendChild(viewLogBtn);
    
    actionsSection.appendChild(actionsGrid);
    container.appendChild(actionsSection);
    
    // Add refresh button
    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh Dashboard';
    this.applyStyles(refreshButton, {
      padding: '8px 16px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '20px auto'
    });
    
    refreshButton.addEventListener('click', () => {
      this.refreshStats();
      this.renderDashboard(container);
      
      // Log refresh
      logChatEvent('admin', 'Refreshed dashboard');
    });
    
    container.appendChild(refreshButton);
  }
  
  /**
   * Create a stat card element
   * @param {string} title - Card title
   * @param {Array} stats - Array of stat objects {label, value}
   * @returns {HTMLElement} Stat card element
   */
  createStatCard(title, stats) {
    const card = document.createElement('div');
    this.applyStyles(card, {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      padding: '16px',
      border: '1px solid #e9ecef'
    });
    
    const cardTitle = document.createElement('h4');
    cardTitle.textContent = title;
    this.applyStyles(cardTitle, {
      margin: '0 0 12px 0',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#495057',
      borderBottom: '1px solid #e9ecef',
      paddingBottom: '8px'
    });
    
    card.appendChild(cardTitle);
    
    // Add stats
    const statsList = document.createElement('div');
    
    stats.forEach(stat => {
      const statItem = document.createElement('div');
      this.applyStyles(statItem, {
        display: 'flex',
        justifyContent: 'space-between',
        margin: '8px 0'
      });
      
      const statLabel = document.createElement('span');
      statLabel.textContent = stat.label;
      this.applyStyles(statLabel, {
        color: '#6c757d',
        fontSize: '14px'
      });
      
      const statValue = document.createElement('span');
      statValue.textContent = stat.value;
      this.applyStyles(statValue, {
        fontWeight: 'bold',
        fontSize: '14px'
      });
      
      statItem.appendChild(statLabel);
      statItem.appendChild(statValue);
      
      statsList.appendChild(statItem);
    });
    
    card.appendChild(statsList);
    
    return card;
  }
  
  /**
   * Create an action button
   * @param {string} label - Button label
   * @param {string} icon - Button icon
   * @param {Function} onClick - Click handler
   * @returns {HTMLElement} Button element
   */
  createActionButton(label, icon, onClick) {
    const button = document.createElement('button');
    this.applyStyles(button, {
      padding: '10px',
      backgroundColor: '#ffffff',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: '100%',
      textAlign: 'left',
      transition: 'background-color 0.2s'
    });
    
    // Add hover effect
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = '#f8f9fa';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = '#ffffff';
    });
    
    const iconElement = document.createElement('span');
    iconElement.textContent = icon;
    this.applyStyles(iconElement, {
      marginRight: '8px',
      fontSize: '16px'
    });
    
    const labelElement = document.createElement('span');
    labelElement.textContent = label;
    
    button.appendChild(iconElement);
    button.appendChild(labelElement);
    
    // Add click handler
    if (typeof onClick === 'function') {
      button.addEventListener('click', onClick);
    }
    
    return button;
  }
  
  /**
   * Handle export audit log action
   */
  handleExportAuditLog() {
    exportAuditLog();
    
    // Show success message
    alert('Audit log has been exported successfully.');
    
    // Log action
    logChatEvent('admin', 'Exported audit log');
  }
  
  /**
   * Handle message cleanup action
   */
  handleMessageCleanup() {
    const removedCount = cleanupExpiredMessages();
    
    // Show success message
    alert(`Cleanup complete. Removed ${removedCount} expired messages.`);
    
    // Refresh stats
    this.refreshStats();
    
    // Re-render dashboard if it's the active tab
    if (this.activeTab === 'dashboard' && this.tabContents.dashboard) {
      this.renderDashboard(this.tabContents.dashboard);
    }
    
    // Log action
    logChatEvent('admin', `Cleaned up ${removedCount} expired messages`);
  }
  
  /**
   * Render the user management tab
   * @param {HTMLElement} container - The tab content container
   */
  renderUserManagement(container) {
    // This will be implemented in UserManager.js
    // For now, just show a placeholder
    
    const placeholder = document.createElement('div');
    this.applyStyles(placeholder, {
      textAlign: 'center',
      padding: '50px',
      color: '#6c757d'
    });
    
    const icon = document.createElement('div');
    icon.innerHTML = '👥';
    this.applyStyles(icon, {
      fontSize: '48px',
      marginBottom: '16px'
    });
    
    const title = document.createElement('h4');
    title.textContent = 'User Management';
    this.applyStyles(title, {
      margin: '0 0 8px 0',
      fontSize: '20px'
    });
    
    const message = document.createElement('p');
    message.textContent = 'User Management component will be implemented here.';
    
    placeholder.appendChild(icon);
    placeholder.appendChild(title);
    placeholder.appendChild(message);
    
    container.appendChild(placeholder);
  }
  
  /**
   * Render the channel management tab
   * @param {HTMLElement} container - The tab content container
   */
  renderChannelManagement(container) {
    // This will be implemented in ChannelManager.js
    // For now, just show a placeholder
    
    const placeholder = document.createElement('div');
    this.applyStyles(placeholder, {
      textAlign: 'center',
      padding: '50px',
      color: '#6c757d'
    });
    
    const icon = document.createElement('div');
    icon.innerHTML = '💬';
    this.applyStyles(icon, {
      fontSize: '48px',
      marginBottom: '16px'
    });
    
    const title = document.createElement('h4');
    title.textContent = 'Channel Management';
    this.applyStyles(title, {
      margin: '0 0 8px 0',
      fontSize: '20px'
    });
    
    const message = document.createElement('p');
    message.textContent = 'Channel Management component will be implemented here.';
    
    placeholder.appendChild(icon);
    placeholder.appendChild(title);
    placeholder.appendChild(message);
    
    container.appendChild(placeholder);
  }
  
  /**
   * Render the role management tab
   * @param {HTMLElement} container - The tab content container
   */
  renderRoleManagement(container) {
    // This will be implemented in RoleManager.js
    // For now, just show a placeholder
    
    const placeholder = document.createElement('div');
    this.applyStyles(placeholder, {
      textAlign: 'center',
      padding: '50px',
      color: '#6c757d'
    });
    
    const icon = document.createElement('div');
    icon.innerHTML = '🔑';
    this.applyStyles(icon, {
      fontSize: '48px',
      marginBottom: '16px'
    });
    
    const title = document.createElement('h4');
    title.textContent = 'Roles & Permissions';
    this.applyStyles(title, {
      margin: '0 0 8px 0',
      fontSize: '20px'
    });
    
    const message = document.createElement('p');
    message.textContent = 'Role Management component will be implemented here.';
    
    placeholder.appendChild(icon);
    placeholder.appendChild(title);
    placeholder.appendChild(message);
    
    container.appendChild(placeholder);
  }
  
  /**
   * Render the audit log tab
   * @param {HTMLElement} container - The tab content container
   */
  renderAuditLog(container) {
    // Refresh stats
    this.refreshStats();
    
    // Audit log header
    const header = document.createElement('div');
    this.applyStyles(header, {
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    });
    
    const titleBlock = document.createElement('div');
    
    const title = document.createElement('h3');
    title.textContent = 'Audit Log';
    this.applyStyles(title, {
      margin: '0 0 8px 0',
      fontSize: '20px',
      fontWeight: 'bold'
    });
    
    const subtitle = document.createElement('p');
    subtitle.textContent = `${this.auditStats.totalEntries} total entries · Retention: ${this.auditStats.retentionDays} days`;
    this.applyStyles(subtitle, {
      margin: '0',
      color: '#6c757d',
      fontSize: '14px'
    });
    
    titleBlock.appendChild(title);
    titleBlock.appendChild(subtitle);
    
    // Export button
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export Log';
    this.applyStyles(exportButton, {
      padding: '8px 16px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center'
    });
    
    const exportIcon = document.createElement('span');
    exportIcon.textContent = '📥';
    this.applyStyles(exportIcon, {
      marginRight: '8px'
    });
    
    exportButton.prepend(exportIcon);
    exportButton.addEventListener('click', this.handleExportAuditLog);
    
    header.appendChild(titleBlock);
    header.appendChild(exportButton);
    container.appendChild(header);
    
    // Create search/filter section
    const filterSection = document.createElement('div');
    this.applyStyles(filterSection, {
      backgroundColor: '#f8f9fa',
      padding: '16px',
      borderRadius: '4px',
      marginBottom: '20px',
      border: '1px solid #dee2e6'
    });
    
    const filterTitle = document.createElement('h4');
    filterTitle.textContent = 'Search & Filter';
    this.applyStyles(filterTitle, {
      margin: '0 0 12px 0',
      fontSize: '16px',
      fontWeight: 'bold'
    });
    
    const filterForm = document.createElement('form');
    this.applyStyles(filterForm, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '12px'
    });
    
    // Category filter
    const categoryGroup = document.createElement('div');
    
    const categoryLabel = document.createElement('label');
    categoryLabel.textContent = 'Category';
    categoryLabel.htmlFor = 'category-filter';
    this.applyStyles(categoryLabel, {
      display: 'block',
      marginBottom: '5px',
      fontSize: '14px'
    });
    
    const categorySelect = document.createElement('select');
    categorySelect.id = 'category-filter';
    this.applyStyles(categorySelect, {
      width: '100%',
      padding: '8px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      boxSizing: 'border-box'
    });
    
    // Add options for each category
    const categoryOptions = [
      { value: '', label: 'All Categories' },
      { value: 'system', label: 'System' },
      { value: 'auth', label: 'Authentication' },
      { value: 'message', label: 'Messages' },
      { value: 'channel', label: 'Channels' },
      { value: 'user', label: 'Users' },
      { value: 'admin', label: 'Admin' },
      { value: 'security', label: 'Security' },
      { value: 'storage', label: 'Storage' }
    ];
    
    categoryOptions.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      categorySelect.appendChild(optionElement);
    });
    
    categoryGroup.appendChild(categoryLabel);
    categoryGroup.appendChild(categorySelect);
    
    // Username filter
    const usernameGroup = document.createElement('div');
    
    const usernameLabel = document.createElement('label');
    usernameLabel.textContent = 'Username';
    usernameLabel.htmlFor = 'username-filter';
    this.applyStyles(usernameLabel, {
      display: 'block',
      marginBottom: '5px',
      fontSize: '14px'
    });
    
    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.id = 'username-filter';
    usernameInput.placeholder = 'Enter username';
    this.applyStyles(usernameInput, {
      width: '100%',
      padding: '8px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      boxSizing: 'border-box'
    });
    
    usernameGroup.appendChild(usernameLabel);
    usernameGroup.appendChild(usernameInput);
    
    // Date range filters
    const startDateGroup = document.createElement('div');
    
    const startDateLabel = document.createElement('label');
    startDateLabel.textContent = 'Start Date';
    startDateLabel.htmlFor = 'start-date-filter';
    this.applyStyles(startDateLabel, {
      display: 'block',
      marginBottom: '5px',
      fontSize: '14px'
    });
    
    const startDateInput = document.createElement('input');
    startDateInput.type = 'date';
    startDateInput.id = 'start-date-filter';
    this.applyStyles(startDateInput, {
      width: '100%',
      padding: '8px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      boxSizing: 'border-box'
    });
    
    startDateGroup.appendChild(startDateLabel);
    startDateGroup.appendChild(startDateInput);
    
    const endDateGroup = document.createElement('div');
    
    const endDateLabel = document.createElement('label');
    endDateLabel.textContent = 'End Date';
    endDateLabel.htmlFor = 'end-date-filter';
    this.applyStyles(endDateLabel, {
      display: 'block',
      marginBottom: '5px',
      fontSize: '14px'
    });
    
    const endDateInput = document.createElement('input');
    endDateInput.type = 'date';
    endDateInput.id = 'end-date-filter';
    this.applyStyles(endDateInput, {
      width: '100%',
      padding: '8px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      boxSizing: 'border-box'
    });
    
    endDateGroup.appendChild(endDateLabel);
    endDateGroup.appendChild(endDateInput);
    
    // Action filter
    const actionGroup = document.createElement('div');
    
    const actionLabel = document.createElement('label');
    actionLabel.textContent = 'Action';
    actionLabel.htmlFor = 'action-filter';
    this.applyStyles(actionLabel, {
      display: 'block',
      marginBottom: '5px',
      fontSize: '14px'
    });
    
    const actionInput = document.createElement('input');
    actionInput.type = 'text';
    actionInput.id = 'action-filter';
    actionInput.placeholder = 'Filter by action';
    this.applyStyles(actionInput, {
      width: '100%',
      padding: '8px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      boxSizing: 'border-box'
    });
    
    actionGroup.appendChild(actionLabel);
    actionGroup.appendChild(actionInput);
    
    // Add filter groups to form
    filterForm.appendChild(categoryGroup);
    filterForm.appendChild(usernameGroup);
    filterForm.appendChild(startDateGroup);
    filterForm.appendChild(endDateGroup);
    filterForm.appendChild(actionGroup);
    
    // Add search button
    const searchButtonGroup = document.createElement('div');
    this.applyStyles(searchButtonGroup, {
      display: 'flex',
      alignItems: 'flex-end'
    });
    
    const searchButton = document.createElement('button');
    searchButton.type = 'button';
    searchButton.textContent = 'Search';
    this.applyStyles(searchButton, {
      padding: '8px 16px',
      backgroundColor: '#2196F3',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    });
    
    searchButton.addEventListener('click', () => {
      // Get filter values
      const filters = {
        category: categorySelect.value,
        username: usernameInput.value,
        startDate: startDateInput.value,
        endDate: endDateInput.value,
        action: actionInput.value
      };
      
      // Render audit log results with filters
      this.renderAuditLogResults(container, filters);
      
      // Log search
      logChatEvent('admin', 'Searched audit log', { filters });
    });
    
    searchButtonGroup.appendChild(searchButton);
    filterForm.appendChild(searchButtonGroup);
    
    filterSection.appendChild(filterTitle);
    filterSection.appendChild(filterForm);
    container.appendChild(filterSection);
    
    // Initially show results without filters
    this.renderAuditLogResults(container, {});
  }
  
  /**
   * Render audit log results
   * @param {HTMLElement} container - The container element
   * @param {Object} filters - Search filters
   */
  renderAuditLogResults(container, filters) {
    // Remove previous results if they exist
    const previousResults = container.querySelector('.audit-log-results');
    if (previousResults) {
      container.removeChild(previousResults);
    }
    
    // Create results container
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'audit-log-results';
    
    // Get filtered audit log entries
    const entries = searchAuditLog({
      category: filters.category || undefined,
      username: filters.username || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      action: filters.action || undefined
    }, 100); // Limit to 100 results
    
    // Create table for audit log
    const table = document.createElement('table');
    this.applyStyles(table, {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px'
    });
    
    // Table header
    const thead = document.createElement('thead');
    this.applyStyles(thead, {
      backgroundColor: '#f8f9fa',
      fontWeight: 'bold'
    });
    
    const headerRow = document.createElement('tr');
    
    const headers = ['Timestamp', 'Category', 'Username', 'Action', 'Details'];
    
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      this.applyStyles(th, {
        padding: '10px 8px',
        textAlign: 'left',
        borderBottom: '2px solid #dee2e6'
      });
      
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Table body
    const tbody = document.createElement('tbody');
    
    if (entries.length === 0) {
      // No results
      const noResultsRow = document.createElement('tr');
      
      const noResultsCell = document.createElement('td');
      noResultsCell.textContent = 'No audit log entries found matching the criteria.';
      this.applyStyles(noResultsCell, {
        padding: '20px 10px',
        textAlign: 'center',
        color: '#6c757d'
      });
      noResultsCell.colSpan = headers.length;
      
      noResultsRow.appendChild(noResultsCell);
      tbody.appendChild(noResultsRow);
    } else {
      // Show results
      entries.forEach(entry => {
        const row = document.createElement('tr');
        
        // Add hover effect
        row.addEventListener('mouseover', () => {
          row.style.backgroundColor = '#f8f9fa';
        });
        
        row.addEventListener('mouseout', () => {
          row.style.backgroundColor = '';
        });
        
        // Timestamp cell
        const timestampCell = document.createElement('td');
        timestampCell.textContent = this.formatDateTime(entry.timestamp);
        this.applyStyles(timestampCell, {
          padding: '8px',
          borderBottom: '1px solid #dee2e6',
          whiteSpace: 'nowrap'
        });
        
        // Category cell
        const categoryCell = document.createElement('td');
        categoryCell.textContent = entry.category;
        this.applyStyles(categoryCell, {
          padding: '8px',
          borderBottom: '1px solid #dee2e6'
        });
        
        // Username cell
        const usernameCell = document.createElement('td');
        usernameCell.textContent = entry.username;
        this.applyStyles(usernameCell, {
          padding: '8px',
          borderBottom: '1px solid #dee2e6'
        });
        
        // Action cell
        const actionCell = document.createElement('td');
        actionCell.textContent = entry.action;
        this.applyStyles(actionCell, {
          padding: '8px',
          borderBottom: '1px solid #dee2e6'
        });
        
        // Details cell
        const detailsCell = document.createElement('td');
        
        if (entry.details && Object.keys(entry.details).length > 0) {
          const detailsText = Object.entries(entry.details)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          
          detailsCell.textContent = detailsText;
        } else {
          detailsCell.textContent = '-';
        }
        
        this.applyStyles(detailsCell, {
          padding: '8px',
          borderBottom: '1px solid #dee2e6',
          fontSize: '12px',
          color: '#6c757d'
        });
        
        row.appendChild(timestampCell);
        row.appendChild(categoryCell);
        row.appendChild(usernameCell);
        row.appendChild(actionCell);
        row.appendChild(detailsCell);
        
        tbody.appendChild(row);
      });
    }
    
    table.appendChild(tbody);
    resultsContainer.appendChild(table);
    
    // Add pagination controls
    const paginationControls = document.createElement('div');
    this.applyStyles(paginationControls, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '16px',
      padding: '8px 0',
      borderTop: '1px solid #dee2e6'
    });
    
    const resultsInfo = document.createElement('div');
    resultsInfo.textContent = `Showing ${entries.length} of ${this.auditStats.totalEntries} entries`;
    this.applyStyles(resultsInfo, {
      fontSize: '14px',
      color: '#6c757d'
    });
    
    const pageControls = document.createElement('div');
    this.applyStyles(pageControls, {
      display: 'flex',
      gap: '8px'
    });
    
    // Previous page button
    const prevButton = document.createElement('button');
    prevButton.textContent = '← Previous';
    this.applyStyles(prevButton, {
      padding: '4px 8px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    });
    prevButton.disabled = true; // First page by default
    
    // Next page button
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next →';
    this.applyStyles(nextButton, {
      padding: '4px 8px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    });
    nextButton.disabled = entries.length < 100; // Disable if we have fewer entries than the limit
    
    // Add buttons to controls
    pageControls.appendChild(prevButton);
    pageControls.appendChild(nextButton);
    
    paginationControls.appendChild(resultsInfo);
    paginationControls.appendChild(pageControls);
    
    resultsContainer.appendChild(paginationControls);
    container.appendChild(resultsContainer);
  }
  
  /**
   * Render the settings tab
   * @param {HTMLElement} container - The tab content container
   */
  renderSettings(container) {
    // Settings header
    const header = document.createElement('div');
    this.applyStyles(header, {
      marginBottom: '20px'
    });
    
    const title = document.createElement('h3');
    title.textContent = 'System Settings';
    this.applyStyles(title, {
      margin: '0 0 8px 0',
      fontSize: '20px',
      fontWeight: 'bold'
    });
    
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Configure HIPAA-compliant chat system settings';
    this.applyStyles(subtitle, {
      margin: '0',
      color: '#6c757d',
      fontSize: '14px'
    });
    
    header.appendChild(title);
    header.appendChild(subtitle);
    container.appendChild(header);
    
    // Create settings sections
    
    // Server settings
    const serverSection = this.createSettingsSection('Server Configuration', '🖥️');
    
    // WebSocket URL
    const urlSetting = this.createSettingItem(
      'WebSocket Server URL', 
      'The URL of the WebSocket server for real-time communication',
      'server_url',
      'text',
      localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000'
    );
    
    serverSection.contentElement.appendChild(urlSetting);
    
    // Max reconnect attempts
    const reconnectSetting = this.createSettingItem(
      'Max Reconnection Attempts', 
      'Maximum number of times to attempt reconnection on disconnection',
      'max_reconnect_attempts',
      'number',
      '5'
    );
    
    serverSection.contentElement.appendChild(reconnectSetting);
    
    // Heartbeat interval
    const heartbeatSetting = this.createSettingItem(
      'Heartbeat Interval (sec)', 
      'Time between heartbeat messages to keep connection alive',
      'heartbeat_interval',
      'number',
      '30'
    );
    
    serverSection.contentElement.appendChild(heartbeatSetting);
    
    container.appendChild(serverSection.section);
    
    // Security settings
    const securitySection = this.createSettingsSection('Security Settings', '🔒');
    
    // Session timeout
    const timeoutSetting = this.createSettingItem(
      'Session Timeout (min)', 
      'Automatically log out users after this period of inactivity',
      'session_timeout',
      'number',
      '15'
    );
    
    securitySection.contentElement.appendChild(timeoutSetting);
    
    // Enable 2FA
    const twoFactorSetting = this.createSettingItem(
      'Two-Factor Authentication', 
      'Enable two-factor authentication for login',
      'enable_2fa',
      'checkbox',
      'false'
    );
    
    securitySection.contentElement.appendChild(twoFactorSetting);
    
    // Minimum password length
    const passwordLengthSetting = this.createSettingItem(
      'Minimum Password Length', 
      'Minimum number of characters required for passwords',
      'min_password_length',
      'number',
      '8'
    );
    
    securitySection.contentElement.appendChild(passwordLengthSetting);
    
    container.appendChild(securitySection.section);
    
    // Message settings
    const messageSection = this.createSettingsSection('Message Configuration', '💬');
    
    // Message expiration
    const expirationSetting = this.createSettingItem(
      'Message Expiration (hours)', 
      'Time after which messages are automatically deleted',
      'message_expiration',
      'number',
      '24'
    );
    
    messageSection.contentElement.appendChild(expirationSetting);
    
    // Max message length
    const maxLengthSetting = this.createSettingItem(
      'Maximum Message Length', 
      'Maximum character count for chat messages',
      'max_message_length',
      'number',
      '2000'
    );
    
    messageSection.contentElement.appendChild(maxLengthSetting);
    
    // Allow message editing
    const editingSetting = this.createSettingItem(
      'Allow Message Editing', 
      'Allow users to edit their messages',
      'allow_message_editing',
      'checkbox',
      'true'
    );
    
    messageSection.contentElement.appendChild(editingSetting);
    
    // Allow message deletion
    const deletionSetting = this.createSettingItem(
      'Allow Message Deletion', 
      'Allow users to delete their messages',
      'allow_message_deletion',
      'checkbox',
      'true'
    );
    
    messageSection.contentElement.appendChild(deletionSetting);
    
    container.appendChild(messageSection.section);
    
    // Feature settings
    const featureSection = this.createSettingsSection('Feature Flags', '🚩');
    
    // Enable direct messaging
    const dmSetting = this.createSettingItem(
      'Direct Messaging', 
      'Allow users to send private messages to each other',
      'enable_direct_messaging',
      'checkbox',
      'true'
    );
    
    featureSection.contentElement.appendChild(dmSetting);
    
    // Enable file sharing
    const fileSetting = this.createSettingItem(
      'File Sharing', 
      'Allow users to share files (disabled for HIPAA compliance)',
      'enable_file_sharing',
      'checkbox',
      'false'
    );
    
    featureSection.contentElement.appendChild(fileSetting);
    
    // Enable message threading
    const threadingSetting = this.createSettingItem(
      'Message Threading', 
      'Allow threaded replies to messages',
      'enable_threading',
      'checkbox',
      'false'
    );
    
    featureSection.contentElement.appendChild(threadingSetting);
    
    // Enable user channel creation
    const channelSetting = this.createSettingItem(
      'User Channel Creation', 
      'Allow non-admin users to create channels',
      'user_channel_creation',
      'checkbox',
      'false'
    );
    
    featureSection.contentElement.appendChild(channelSetting);
    
    container.appendChild(featureSection.section);
    
    // Add save button
    const saveButtonContainer = document.createElement('div');
    this.applyStyles(saveButtonContainer, {
      marginTop: '30px',
      display: 'flex',
      justifyContent: 'center'
    });
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Settings';
    this.applyStyles(saveButton, {
      padding: '10px 20px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 'bold'
    });
    
    saveButton.addEventListener('click', () => {
      // In a real implementation, this would save all settings
      alert('Settings saved successfully.');
      
      // Log settings update
      logChatEvent('admin', 'Updated system settings');
    });
    
    saveButtonContainer.appendChild(saveButton);
    container.appendChild(saveButtonContainer);
  }
  
  /**
   * Create a settings section
   * @param {string} title - Section title
   * @param {string} icon - Section icon
   * @returns {Object} Section elements
   */
  createSettingsSection(title, icon) {
    const section = document.createElement('div');
    this.applyStyles(section, {
      backgroundColor: '#ffffff',
      borderRadius: '4px',
      border: '1px solid #dee2e6',
      marginBottom: '20px',
      overflow: 'hidden'
    });
    
    // Section header
    const header = document.createElement('div');
    this.applyStyles(header, {
      padding: '12px 16px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #dee2e6',
      display: 'flex',
      alignItems: 'center'
    });
    
    const iconElement = document.createElement('span');
    iconElement.textContent = icon;
    this.applyStyles(iconElement, {
      marginRight: '8px',
      fontSize: '18px'
    });
    
    const titleElement = document.createElement('h4');
    titleElement.textContent = title;
    this.applyStyles(titleElement, {
      margin: '0',
      fontSize: '16px',
      fontWeight: 'bold'
    });
    
    header.appendChild(iconElement);
    header.appendChild(titleElement);
    section.appendChild(header);
    
    // Section content
    const content = document.createElement('div');
    this.applyStyles(content, {
      padding: '16px'
    });
    
    section.appendChild(content);
    
    return {
      section,
      headerElement: header,
      contentElement: content
    };
  }
  
  /**
   * Create a setting item
   * @param {string} name - Setting name
   * @param {string} description - Setting description
   * @param {string} key - Setting key
   * @param {string} type - Input type (text, number, checkbox)
   * @param {string} defaultValue - Default value
   * @returns {HTMLElement} Setting item element
   */
  createSettingItem(name, description, key, type, defaultValue) {
    const item = document.createElement('div');
    this.applyStyles(item, {
      marginBottom: '16px',
      paddingBottom: '16px',
      borderBottom: '1px solid #f0f0f0'
    });
    
    // Setting header
    const itemHeader = document.createElement('div');
    this.applyStyles(itemHeader, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    });
    
    const nameElement = document.createElement('label');
    nameElement.textContent = name;
    nameElement.htmlFor = `setting-${key}`;
    this.applyStyles(nameElement, {
      fontWeight: 'bold',
      fontSize: '14px'
    });
    
    let inputElement;
    
    if (type === 'checkbox') {
      inputElement = document.createElement('input');
      inputElement.type = 'checkbox';
      inputElement.id = `setting-${key}`;
      inputElement.checked = defaultValue === 'true';
      this.applyStyles(inputElement, {
        transform: 'scale(1.2)'
      });
    } else {
      inputElement = document.createElement('input');
      inputElement.type = type;
      inputElement.id = `setting-${key}`;
      inputElement.value = defaultValue;
      this.applyStyles(inputElement, {
        padding: '6px 8px',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        width: '200px'
      });
    }
    
    itemHeader.appendChild(nameElement);
    itemHeader.appendChild(inputElement);
    
    // Setting description
    const descElement = document.createElement('div');
    descElement.textContent = description;
    this.applyStyles(descElement, {
      fontSize: '12px',
      color: '#6c757d'
    });
    
    item.appendChild(itemHeader);
    item.appendChild(descElement);
    
    return item;
  }
  
  /**
   * Format a date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  }
  
  /**
   * Format a date and time for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date and time
   */
  formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    } catch (error) {
      return dateString;
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
   * Destroy the admin panel
   */
  destroy() {
    // Remove event listeners
    
    // Remove from DOM
    if (this.panelElement && this.panelElement.parentNode) {
      this.panelElement.parentNode.removeChild(this.panelElement);
    }
    
    // Log destruction
    logChatEvent('admin', 'Admin panel destroyed');
  }
}

export default AdminPanel;