// chat/components/users/UserList.js
// User list component for HIPAA-compliant chat

import { getOnlineUsers, getAllUsers, addUserStatusListener } from '../../services/userService.js';
import { getCurrentUser, isAuthenticated } from '../../services/auth';
import { logChatEvent } from '../../utils/logger.js';

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
    
    // Status listener unsubscribe function
    this.unsubscribeStatusListener = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.handleUserStatusUpdate = this.handleUserStatusUpdate.bind(this);
    this.handleUserClick = this.handleUserClick.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.filterUsers = this.filterUsers.bind(this);
    
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
    
    // Get initial user lists
    this.onlineUsers = getOnlineUsers();
    
    if (this.options.showOfflineUsers) {
      this.allUsers = getAllUsers();
    }
    
    // Subscribe to user status updates
    this.unsubscribeStatusListener = addUserStatusListener(this.handleUserStatusUpdate);
    
    // Render initial state
    this.render();
    
    // Log initialization
    logChatEvent('ui', 'User list component initialized');
  }
  
  /**
   * Handle user status updates
   * @param {Array} users - Updated online users
   */
  handleUserStatusUpdate(users) {
    this.onlineUsers = users;
    
    // Also update all users if showing offline users
    if (this.options.showOfflineUsers) {
      this.allUsers = getAllUsers();
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
    
    header.appendChild(headerTitle);
    header.appendChild(countBadge);
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
                      
    if (totalUsers === 0) {
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
    const currentUser = getCurrentUser();
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
    
    // Status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'status-indicator';
    this.applyStyles(statusIndicator, {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: isOnline ? '#4CAF50' : '#9e9e9e',
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
    if (this.options.showUserStatus && user.status) {
      const statusText = document.createElement('div');
      statusText.className = 'status-text';
      statusText.textContent = user.status;
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
   * Cleanup resources
   */
  destroy() {
    // Unsubscribe from user status updates
    if (this.unsubscribeStatusListener) {
      this.unsubscribeStatusListener();
      this.unsubscribeStatusListener = null;
    }
    
    // Remove event listeners
    if (this.searchInput) {
      this.searchInput.removeEventListener('input', this.handleSearch);
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