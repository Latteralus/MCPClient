// chat/components/users/UserList.js
// User list component for HIPAA-compliant chat

import authContext from '../../contexts/AuthContext.js';
import webSocketContext from '../../contexts/WebSocketContext.js';
import userService from '../../services/api/users.js';
import { logChatEvent } from '../../utils/logger.js';
import { handleError, ErrorCategory, ErrorCode } from '../../utils/error-handler.js';
import { createCache } from '../../utils/cache.js';

class UserList {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      showOfflineUsers: false,
      enableDirectMessages: true,
      showUserStatus: true,
      showSearch: true,
      onUserSelect: null,
      ...options
    };
    
    this.userListElement = null;
    this.searchInput = null;
    this.onlineUsers = [];
    this.allUsers = [];
    this.searchTerm = '';
    
    // Create user status cache
    this.userStatusCache = createCache('userList_statuses', {
      maxItems: 100,
      ttl: 5 * 60 * 1000 // 5 minutes
    });
    
    // Subscription for user status updates
    this.userSubscription = null;
    
    // Subscription for connection status
    this.connectionSubscription = null;
    
    // Track connection status
    this.connectionStatus = 'disconnected';
    
    // Bind methods
    this.render = this.render.bind(this);
    this.handleUserStatusUpdate = this.handleUserStatusUpdate.bind(this);
    this.handleUserClick = this.handleUserClick.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.filterUsers = this.filterUsers.bind(this);
    this.handleConnectionChange = this.handleConnectionChange.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the user list
   */
  initialize() {
    // Create container element
    this.userListElement = document.createElement('div');
    this.userListElement.className = 'user-list';
    this.applyStyles(this.userListElement, {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      backgroundColor: '#f5f5f5',
      borderLeft: '1px solid #e0e0e0'
    });
    
    // Add to container
    if (this.container) {
      this.container.appendChild(this.userListElement);
    }
    
    // Subscribe to user status updates through WebSocketContext
    this.userSubscription = webSocketContext.subscribeToUsers(this.handleUserStatusUpdate);
    
    // Subscribe to connection status changes
    this.connectionSubscription = webSocketContext.subscribeToConnection(this.handleConnectionChange);
    
    // Load initial user lists
    this.loadUsers();
    
    // Render initial state
    this.render();
    
    // Log initialization
    logChatEvent('ui', 'User list component initialized');
  }
  
  /**
   * Handle connection status changes
   * @param {Object} connectionState - WebSocket connection state
   */
  handleConnectionChange(connectionState) {
    const prevStatus = this.connectionStatus;
    this.connectionStatus = connectionState.status;
    
    // If we've reconnected, reload users
    if (prevStatus !== 'connected' && connectionState.status === 'connected') {
      this.loadUsers();
    }
    
    // Update UI if needed
    this.render();
  }
  
  /**
   * Load users from service
   */
  async loadUsers() {
    try {
      // Don't load if not connected
      if (this.connectionStatus !== 'connected') {
        return;
      }
      
      // Get online users
      this.onlineUsers = userService.getOnlineUsers();
      
      // If showing offline users, load all users
      if (this.options.showOfflineUsers) {
        const result = await userService.getAllUsers();
        if (result.success) {
          this.allUsers = result.data.users || [];
        } else {
          this.allUsers = [];
          console.warn('[UserList] Failed to load all users:', result.message);
        }
      }
      
      // Request user list refresh from server
      webSocketContext.fetchUserList(this.options.showOfflineUsers);
      
      // Render with new data
      this.render();
    } catch (error) {
      handleError(error, {
        code: ErrorCode.DATA_NOT_FOUND,
        category: ErrorCategory.DATA,
        source: 'UserList',
        message: 'Failed to load users'
      });
    }
  }
  
  /**
   * Handle user status updates
   * @param {Array} users - Updated online users
   */
  handleUserStatusUpdate(users) {
    this.onlineUsers = users || [];
    
    // Update status cache for users
    users.forEach(user => {
      this.userStatusCache.set(user.id, user.status || 'online');
    });
    
    // Also update all users if showing offline users
    if (this.options.showOfflineUsers) {
      // Request all users if we don't have them yet
      if (this.allUsers.length === 0) {
        this.loadUsers();
      }
    }
    
    // Re-render the list
    this.render();
  }
  
  /**
   * Render the user list
   */
  render() {
    if (!this.userListElement) return;
    
    // Clear existing content
    this.userListElement.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'user-list-header';
    this.applyStyles(header, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#e9ecef'
    });
    
    const headerTitle = document.createElement('h3');
    headerTitle.textContent = 'Users';
    this.applyStyles(headerTitle, {
      margin: '0',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#333'
    });
    
    // Add user count badge
    const countBadge = document.createElement('span');
    countBadge.className = 'user-count';
    countBadge.textContent = this.onlineUsers.length.toString();
    this.applyStyles(countBadge, {
      backgroundColor: '#4CAF50',
      color: 'white',
      borderRadius: '12px',
      padding: '2px 8px',
      fontSize: '12px',
      fontWeight: 'bold'
    });
    
    // Add connection status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'connection-status';
    
    // Style based on connection status
    let statusColor = '#f44336'; // Red for disconnected
    let statusText = 'Offline';
    
    if (this.connectionStatus === 'connected') {
      statusColor = '#4CAF50'; // Green for connected
      statusText = 'Online';
    } else if (this.connectionStatus === 'connecting') {
      statusColor = '#FF9800'; // Orange for connecting
      statusText = 'Connecting...';
    }
    
    this.applyStyles(statusIndicator, {
      display: 'flex',
      alignItems: 'center',
      fontSize: '12px',
      color: '#666',
      marginRight: '10px'
    });
    
    const statusDot = document.createElement('span');
    this.applyStyles(statusDot, {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: statusColor,
      marginRight: '4px'
    });
    
    statusIndicator.appendChild(statusDot);
    statusIndicator.appendChild(document.createTextNode(statusText));
    
    // Create header controls container
    const headerControls = document.createElement('div');
    this.applyStyles(headerControls, {
      display: 'flex',
      alignItems: 'center'
    });
    
    // Add refresh button
    const refreshButton = document.createElement('button');
    refreshButton.className = 'refresh-button';
    refreshButton.innerHTML = '↻';
    refreshButton.title = 'Refresh Users';
    this.applyStyles(refreshButton, {
      background: 'none',
      border: 'none',
      fontSize: '18px',
      cursor: 'pointer',
      color: '#666',
      marginRight: '8px'
    });
    
    refreshButton.addEventListener('click', () => this.loadUsers());
    
    headerControls.appendChild(statusIndicator);
    headerControls.appendChild(refreshButton);
    headerControls.appendChild(countBadge);
    
    header.appendChild(headerTitle);
    header.appendChild(headerControls);
    
    this.userListElement.appendChild(header);
    
    // Search box if enabled
    if (this.options.showSearch) {
      const searchContainer = document.createElement('div');
      searchContainer.className = 'search-container';
      this.applyStyles(searchContainer, {
        padding: '8px 16px',
        borderBottom: '1px solid #e0e0e0'
      });
      
      this.searchInput = document.createElement('input');
      this.searchInput.type = 'text';
      this.searchInput.className = 'search-input';
      this.searchInput.placeholder = 'Search users...';
      this.searchInput.value = this.searchTerm;
      this.applyStyles(this.searchInput, {
        width: '100%',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
        fontSize: '14px'
      });
      
      this.searchInput.addEventListener('input', this.handleSearch);
      
      searchContainer.appendChild(this.searchInput);
      this.userListElement.appendChild(searchContainer);
    }
    
    // Create scrollable user container
    const userContainer = document.createElement('div');
    userContainer.className = 'user-list-container';
    this.applyStyles(userContainer, {
      flex: '1',
      overflowY: 'auto',
      padding: '8px 0'
    });
    
    // Show disconnected message if not connected
    if (this.connectionStatus !== 'connected') {
      const disconnectedMessage = document.createElement('div');
      disconnectedMessage.className = 'disconnected-message';
      this.applyStyles(disconnectedMessage, {
        padding: '16px',
        textAlign: 'center',
        color: '#666',
        fontStyle: 'italic'
      });
      
      if (this.connectionStatus === 'connecting') {
        disconnectedMessage.textContent = 'Connecting to server...';
      } else {
        disconnectedMessage.textContent = 'Disconnected from server. Reconnecting...';
      }
      
      userContainer.appendChild(disconnectedMessage);
      
      // If we have cached users, still show them but with an indicator
      if (this.onlineUsers.length > 0) {
        const cachedNotice = document.createElement('div');
        cachedNotice.className = 'cached-notice';
        this.applyStyles(cachedNotice, {
          padding: '8px 16px',
          fontSize: '12px',
          color: '#666',
          fontStyle: 'italic',
          backgroundColor: '#fff3e0',
          margin: '8px 0',
          textAlign: 'center'
        });
        
        cachedNotice.textContent = 'Showing cached user data';
        userContainer.appendChild(cachedNotice);
      }
    }
    
    // Filter and sort users
    const usersToDisplay = this.filterUsers();
    
    // Separate online and offline users
    const onlineUserIds = this.onlineUsers.map(user => user.id);
    
    const onlineUsersToDisplay = usersToDisplay.filter(user => 
      onlineUserIds.includes(user.id)
    );
    
    const offlineUsersToDisplay = usersToDisplay.filter(user => 
      !onlineUserIds.includes(user.id)
    );
    
    // Add online users
    if (onlineUsersToDisplay.length > 0) {
      const onlineHeader = this.createUserGroupHeader('Online');
      userContainer.appendChild(onlineHeader);
      
      onlineUsersToDisplay.forEach(user => {
        const userItem = this.createUserItem(user, true);
        userContainer.appendChild(userItem);
      });
    }
    
    // Add offline users if showing
    if (this.options.showOfflineUsers && offlineUsersToDisplay.length > 0) {
      const offlineHeader = this.createUserGroupHeader('Offline');
      userContainer.appendChild(offlineHeader);
      
      offlineUsersToDisplay.forEach(user => {
        const userItem = this.createUserItem(user, false);
        userContainer.appendChild(userItem);
      });
    }
    
    // Add empty state if no users
    const totalUsers = onlineUsersToDisplay.length + 
                      (this.options.showOfflineUsers ? offlineUsersToDisplay.length : 0);
                      
    if (totalUsers === 0 && this.connectionStatus === 'connected') {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      this.applyStyles(emptyState, {
        padding: '20px',
        textAlign: 'center',
        color: '#666'
      });
      
      if (this.searchTerm) {
        emptyState.textContent = 'No users found matching "' + this.searchTerm + '"';
      } else {
        emptyState.textContent = 'No users available';
      }
      
      userContainer.appendChild(emptyState);
    }
    
    this.userListElement.appendChild(userContainer);
  }
  
  /**
   * Filter users based on search term
   * @returns {Array} Filtered users
   */
  filterUsers() {
    let users = this.options.showOfflineUsers ? this.allUsers : this.onlineUsers;
    
    // Apply search filter if search term exists
    if (this.searchTerm) {
      const searchTermLower = this.searchTerm.toLowerCase();
      users = users.filter(user => {
        const displayName = user.displayName || user.username;
        return user.username.toLowerCase().includes(searchTermLower) || 
               (displayName && displayName.toLowerCase().includes(searchTermLower));
      });
    }
    
    // Sort: online first, then alphabetically by display name or username
    return users.sort((a, b) => {
      const aOnline = this.onlineUsers.some(onlineUser => onlineUser.id === a.id);
      const bOnline = this.onlineUsers.some(onlineUser => onlineUser.id === b.id);
      
      // First sort by online status
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      
      // Then sort alphabetically
      const aName = (a.displayName || a.username).toLowerCase();
      const bName = (b.displayName || b.username).toLowerCase();
      
      return aName.localeCompare(bName);
    });
  }
  
  /**
   * Create a user group header
   * @param {string} title - Group title
   * @returns {HTMLElement} Header element
   */
  createUserGroupHeader(title) {
    const header = document.createElement('div');
    header.className = 'user-group-header';
    this.applyStyles(header, {
      padding: '6px 16px',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#666',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    });
    
    header.textContent = title;
    return header;
  }
  
  /**
   * Create a user item
   * @param {Object} user - User data
   * @param {boolean} isOnline - Whether user is online
   * @returns {HTMLElement} User item element
   */
  createUserItem(user, isOnline) {
    const currentUser = authContext.getCurrentUser();
    const isSelf = currentUser && user.id === currentUser.id;
    
    const item = document.createElement('div');
    item.className = 'user-item';
    item.setAttribute('data-user-id', user.id);
    
    this.applyStyles(item, {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 16px',
      cursor: this.options.enableDirectMessages && !isSelf ? 'pointer' : 'default',
      opacity: isOnline ? '1' : '0.6'
    });
    
    // Add hover effect
    item.addEventListener('mouseover', () => {
      item.style.backgroundColor = '#e9ecef';
    });
    
    item.addEventListener('mouseout', () => {
      item.style.backgroundColor = '';
    });
    
    // Get user status
    const userStatus = isOnline ? (user.status || 'online') : 'offline';
    
    // Status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'status-indicator';
    
    // Set color based on status
    let statusColor;
    switch (userStatus) {
      case 'online':
        statusColor = '#4CAF50'; // Green
        break;
      case 'away':
        statusColor = '#FF9800'; // Orange
        break;
      case 'busy':
        statusColor = '#f44336'; // Red
        break;
      case 'offline':
      default:
        statusColor = '#9e9e9e'; // Grey
    }
    
    this.applyStyles(statusIndicator, {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: statusColor,
      marginRight: '8px'
    });
    
    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    
    // Get first letter of username
    const initial = (user.displayName || user.username).charAt(0).toUpperCase();
    avatar.textContent = initial;
    
    // Generate color based on username
    const hue = this.generateColorFromString(user.username);
    const bgColor = `hsl(${hue}, 70%, 80%)`;
    const textColor = `hsl(${hue}, 70%, 30%)`;
    
    this.applyStyles(avatar, {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: bgColor,
      color: textColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: '14px',
      marginRight: '8px'
    });
    
    // User info
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    this.applyStyles(userInfo, {
      flex: '1',
      overflow: 'hidden'
    });
    
    // Username/display name
    const userName = document.createElement('div');
    userName.className = 'user-name';
    userName.textContent = user.displayName || user.username;
    this.applyStyles(userName, {
      fontWeight: isSelf ? 'bold' : 'normal',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    });
    
    // Username if display name exists
    if (user.displayName && user.displayName !== user.username) {
      const usernameDisplay = document.createElement('div');
      usernameDisplay.className = 'username-display';
      usernameDisplay.textContent = '@' + user.username;
      this.applyStyles(usernameDisplay, {
        fontSize: '12px',
        color: '#666',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      });
      userInfo.appendChild(usernameDisplay);
    }
    
    userInfo.appendChild(userName);
    
    // Role badge for admin/moderator
    if (user.role === 'admin' || user.role === 'moderator') {
      const roleBadge = document.createElement('span');
      roleBadge.className = 'role-badge';
      roleBadge.textContent = user.role;
      this.applyStyles(roleBadge, {
        fontSize: '10px',
        backgroundColor: user.role === 'admin' ? '#ff5722' : '#2196F3',
        color: 'white',
        padding: '1px 4px',
        borderRadius: '3px',
        marginLeft: '4px',
        textTransform: 'capitalize'
      });
      
      userName.appendChild(roleBadge);
    }
    
    // Add self indicator
    if (isSelf) {
      const selfIndicator = document.createElement('span');
      selfIndicator.className = 'self-indicator';
      selfIndicator.textContent = '(you)';
      this.applyStyles(selfIndicator, {
        fontSize: '12px',
        color: '#666',
        marginLeft: '4px'
      });
      
      userName.appendChild(selfIndicator);
    }
    
    // Add user status if available and enabled
    if (this.options.showUserStatus && userStatus) {
      const statusText = document.createElement('div');
      statusText.className = 'status-text';
      
      // Capitalize first letter
      const formattedStatus = userStatus.charAt(0).toUpperCase() + userStatus.slice(1);
      statusText.textContent = formattedStatus;
      
      this.applyStyles(statusText, {
        fontSize: '12px',
        color: '#666',
        fontStyle: 'italic'
      });
      
      userInfo.appendChild(statusText);
    }
    
    // Message button for direct messaging
    if (this.options.enableDirectMessages && !isSelf) {
      const messageButton = document.createElement('button');
      messageButton.className = 'message-button';
      messageButton.innerHTML = '&#9993;'; // Envelope icon
      messageButton.title = 'Send Message';
      this.applyStyles(messageButton, {
        backgroundColor: 'transparent',
        border: 'none',
        color: '#2196F3',
        cursor: 'pointer',
        padding: '4px',
        fontSize: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isOnline ? '1' : '0.6'
      });
      
      // Add event listener (specific to button)
      messageButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent item click
        this.handleUserClick(user);
      });
      
      item.appendChild(messageButton);
    }
    
    // Add components
    item.appendChild(statusIndicator);
    item.appendChild(avatar);
    item.appendChild(userInfo);
    
    // Add event listener
    if (this.options.enableDirectMessages && !isSelf) {
      item.addEventListener('click', () => this.handleUserClick(user));
    }
    
    return item;
  }
  
  /**
   * Handle user item click
   * @param {Object} user - Selected user
   */
  handleUserClick(user) {
    if (this.options.onUserSelect && typeof this.options.onUserSelect === 'function') {
      this.options.onUserSelect(user);
    }
    
    // Log user selection
    logChatEvent('ui', 'User selected for direct message', { targetUserId: user.id });
  }
  
  /**
   * Handle search input
   * @param {Event} e - Input event
   */
  handleSearch(e) {
    this.searchTerm = e.target.value.trim();
    this.render();
  }
  
  /**
   * Generate a color hue from a string
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
   * Apply CSS styles to an element
   * @param {HTMLElement} element - Element to style
   * @param {Object} styles - Styles to apply
   */
  applyStyles(element, styles) {
    Object.assign(element.style, styles);
  }
  
  /**
   * Toggle showing offline users
   * @param {boolean} show - Whether to show offline users
   */
  toggleOfflineUsers(show) {
    if (this.options.showOfflineUsers !== show) {
      this.options.showOfflineUsers = show;
      
      // Load all users if needed
      if (show && this.allUsers.length === 0) {
        this.loadUsers();
      } else {
        this.render();
      }
    }
  }
  
  /**
   * Refresh user list
   */
  refresh() {
    this.loadUsers();
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    // Remove WebSocket subscriptions
    if (this.userSubscription) {
      this.userSubscription();
      this.userSubscription = null;
    }
    
    if (this.connectionSubscription) {
      this.connectionSubscription();
      this.connectionSubscription = null;
    }
    
    // Remove event listeners
    if (this.searchInput) {
      this.searchInput.removeEventListener('input', this.handleSearch);
    }
    
    // Destroy user cache
    if (this.userStatusCache) {
      this.userStatusCache.destroy();
    }
    
    // Remove from DOM
    if (this.userListElement && this.userListElement.parentNode) {
      this.userListElement.parentNode.removeChild(this.userListElement);
    }
    
    // Log destruction
    logChatEvent('ui', 'User list component destroyed');
  }
}

export default UserList;