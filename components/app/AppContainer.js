// components/app/AppContainer.js
// Main container component for HIPAA-compliant chat

import authContext from '../../contexts/AuthContext.js';
import MessageList from '../messages/MessageList.js';
import MessageInput from '../messages/MessageInput.js';
import UserList from '../users/UserList.js';
import UserStatus from '../users/UserStatus.js';
import LoginForm from '../auth/LoginForm.js';
import NotificationSystem from './NotificationSystem.js';
import Header from './Header.js';
import { logChatEvent } from '../../utils/logger.js';
import { initEncryption } from '../../services/encryption/encryption.js';
import { connectToServer, disconnectFromServer, getConnectionStatus } from '../../services/websocket/connection.js';
import { initMessageService } from '../../services/api/messages.js';
import { initUserService } from '../../services/api/users.js';
import { initChannelService, getAvailableChannels, setActiveChannel } from '../../services/api/channels.js';

/**
 * Main application container component
 * Handles authentication state and view rendering
 */
class AppContainer {
  /**
   * Create a new AppContainer
   * @param {HTMLElement} container - Container element
   */
  constructor(container) {
    this.container = container;
    this.state = {
      authenticated: false,
      user: null,
      view: 'login', // login, chat, settings, admin
      activeChannelId: null,
      activeDMUserId: null,
      connectionStatus: 'disconnected',
      initialized: false
    };
    
    this.headerComponent = null;
    this.notificationSystem = null;
    this.messageListComponent = null;
    this.messageInputComponent = null;
    this.userListComponent = null;
    this.userStatusComponent = null;
    this.loginFormComponent = null;
    
    // Authentication state listener
    this.authUnsubscribe = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.handleChannelSelect = this.handleChannelSelect.bind(this);
    this.handleUserSelect = this.handleUserSelect.bind(this);
    this.handleViewChange = this.handleViewChange.bind(this);
    this.cleanupComponents = this.cleanupComponents.bind(this);
    
    // Initialize the container
    this.initialize();
  }
  
  /**
   * Initialize the app container
   */
  async initialize() {
    try {
      console.log('[AppContainer] Initializing...');
      
      // Initialize core services
      await initEncryption();
      initMessageService();
      initUserService();
      initChannelService();
      
      // Create notification system (persistent across views)
      this.notificationSystem = new NotificationSystem();
      
      // Subscribe to auth state changes
      this.authUnsubscribe = authContext.subscribe(authState => {
        const wasAuthenticated = this.state.authenticated;
        
        // Update state
        this.state.authenticated = authState.authenticated;
        this.state.user = authState.user;
        
        // Handle authentication state change
        if (authState.authenticated && !wasAuthenticated) {
          // User logged in, connect to server and show chat view
          this.state.view = 'chat';
          connectToServer();
          
          // Set first available channel as active
          setTimeout(() => {
            const channels = getAvailableChannels();
            if (channels.length > 0) {
              this.handleChannelSelect(channels[0].id);
            }
          }, 500);
        } else if (!authState.authenticated && wasAuthenticated) {
          // User logged out, disconnect from server and show login view
          this.state.view = 'login';
          disconnectFromServer();
          
          // Clear active channel/DM
          this.state.activeChannelId = null;
          this.state.activeDMUserId = null;
        }
        
        // Re-render the view
        this.render();
      });
      
      // Set initialized flag
      this.state.initialized = true;
      
      // Initial render
      this.render();
      
      logChatEvent('system', 'App container initialized');
    } catch (error) {
      console.error('[AppContainer] Initialization error:', error);
      logChatEvent('error', 'App container initialization error', { error: error.message });
    }
  }
  
  /**
   * Render the app container
   */
  render() {
    if (!this.container) return;
    
    try {
      // Clear container
      this.cleanupComponents();
      this.container.innerHTML = '';
      
      // Apply container styles
      this.applyStyles(this.container, {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      });
      
      // Render appropriate view based on authentication state
      if (!this.state.authenticated) {
        this.renderLoginView();
      } else {
        switch (this.state.view) {
          case 'chat':
            this.renderChatView();
            break;
          case 'settings':
            this.renderSettingsView();
            break;
          case 'admin':
            this.renderAdminView();
            break;
          default:
            this.renderChatView();
        }
      }
      
      logChatEvent('ui', `App container rendered ${this.state.view} view`);
    } catch (error) {
      console.error('[AppContainer] Render error:', error);
      logChatEvent('error', 'App container render error', { error: error.message });
      
      // Show error message
      this.container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #f44336;">
          <h3>Error</h3>
          <p>An error occurred while rendering the application. Please try again later.</p>
        </div>
      `;
    }
  }
  
  /**
   * Render the login view
   */
  renderLoginView() {
    // Create login container
    const loginContainer = document.createElement('div');
    this.applyStyles(loginContainer, {
      width: '100%',
      height: '100%',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#f5f5f5'
    });
    
    // Create app title
    const titleContainer = document.createElement('div');
    this.applyStyles(titleContainer, {
      marginBottom: '30px',
      textAlign: 'center'
    });
    
    const title = document.createElement('h1');
    title.textContent = 'MCP Messenger';
    this.applyStyles(title, {
      fontSize: '28px',
      color: '#343a40',
      margin: '0 0 10px 0'
    });
    
    const subtitle = document.createElement('p');
    subtitle.textContent = 'HIPAA-Compliant Secure Messaging';
    this.applyStyles(subtitle, {
      fontSize: '14px',
      color: '#6c757d',
      margin: '0'
    });
    
    titleContainer.appendChild(title);
    titleContainer.appendChild(subtitle);
    loginContainer.appendChild(titleContainer);
    
    // Create login form
    this.loginFormComponent = new LoginForm(loginContainer, this.handleLogin);
    
    // Add to container
    this.container.appendChild(loginContainer);
  }
  
  /**
   * Render the chat view
   */
  renderChatView() {
    // Create header
    this.headerComponent = new Header(this.container, {
      title: 'MCP Messenger',
      onLogout: this.handleLogout,
      onViewChange: this.handleViewChange,
      currentView: this.state.view
    });
    
    // Create layout container
    const layoutContainer = document.createElement('div');
    this.applyStyles(layoutContainer, {
      display: 'flex',
      flexGrow: '1',
      height: 'calc(100% - 60px)', // Subtract header height
      overflow: 'hidden'
    });
    
    // Create channel/conversation sidebar (left)
    const channelSidebar = document.createElement('div');
    this.applyStyles(channelSidebar, {
      width: '200px',
      flexShrink: '0',
      backgroundColor: '#343a40',
      color: 'white',
      display: 'flex',
      flexDirection: 'column'
    });
    
    // Channel list header
    const channelHeader = document.createElement('div');
    channelHeader.textContent = 'Channels';
    this.applyStyles(channelHeader, {
      padding: '12px 16px',
      fontWeight: 'bold',
      fontSize: '14px',
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    });
    
    // Channel list container
    const channelList = document.createElement('div');
    this.applyStyles(channelList, {
      overflowY: 'auto',
      flexGrow: '1'
    });
    
    // Add available channels
    const channels = getAvailableChannels();
    channels.forEach(channel => {
      const channelItem = document.createElement('div');
      channelItem.textContent = `# ${channel.name}`;
      this.applyStyles(channelItem, {
        padding: '8px 16px',
        cursor: 'pointer',
        backgroundColor: this.state.activeChannelId === channel.id ? 'rgba(255,255,255,0.1)' : 'transparent',
        borderLeft: this.state.activeChannelId === channel.id ? '3px solid #2196F3' : '3px solid transparent'
      });
      
      // Add click event
      channelItem.addEventListener('click', () => {
        this.handleChannelSelect(channel.id);
      });
      
      channelList.appendChild(channelItem);
    });
    
    // Direct messages header
    const dmHeader = document.createElement('div');
    dmHeader.textContent = 'Direct Messages';
    this.applyStyles(dmHeader, {
      padding: '12px 16px',
      fontWeight: 'bold',
      fontSize: '14px',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    });
    
    // Add channel elements to sidebar
    channelSidebar.appendChild(channelHeader);
    channelSidebar.appendChild(channelList);
    channelSidebar.appendChild(dmHeader);
    
    // Create user status component at bottom of sidebar
    const statusContainer = document.createElement('div');
    this.applyStyles(statusContainer, {
      padding: '10px',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center'
    });
    
    // User info
    const userInfo = document.createElement('div');
    this.applyStyles(userInfo, {
      marginLeft: '10px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      fontSize: '14px'
    });
    
    userInfo.textContent = this.state.user ? this.state.user.username : 'Unknown';
    
    // Create user status component
    this.userStatusComponent = new UserStatus(statusContainer);
    
    statusContainer.appendChild(userInfo);
    channelSidebar.appendChild(statusContainer);
    
    // Create main chat area (center)
    const chatArea = document.createElement('div');
    this.applyStyles(chatArea, {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: '1',
      overflow: 'hidden',
      borderLeft: '1px solid #dee2e6',
      borderRight: '1px solid #dee2e6'
    });
    
    // Chat header
    const chatHeader = document.createElement('div');
    this.applyStyles(chatHeader, {
      padding: '12px 16px',
      borderBottom: '1px solid #dee2e6',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center'
    });
    
    // Get current channel or DM info
    let headerText = 'Select a conversation';
    
    if (this.state.activeChannelId) {
      const activeChannel = channels.find(c => c.id === this.state.activeChannelId);
      if (activeChannel) {
        headerText = `# ${activeChannel.name}`;
      }
    } else if (this.state.activeDMUserId) {
      // Would need user service to get user info
      headerText = 'Direct Message';
    }
    
    chatHeader.textContent = headerText;
    
    // Connection status indicator
    const connectionStatus = document.createElement('div');
    this.state.connectionStatus = getConnectionStatus(); // Update connection status
    
    let statusText = 'Disconnected';
    let statusColor = '#f44336'; // Red
    
    if (this.state.connectionStatus === 'connected') {
      statusText = 'Connected';
      statusColor = '#4CAF50'; // Green
    } else if (this.state.connectionStatus === 'connecting') {
      statusText = 'Connecting...';
      statusColor = '#FFC107'; // Yellow
    }
    
    connectionStatus.textContent = statusText;
    this.applyStyles(connectionStatus, {
      fontSize: '12px',
      color: statusColor,
      marginLeft: '10px',
      padding: '2px 8px',
      borderRadius: '10px',
      backgroundColor: 'rgba(0,0,0,0.05)'
    });
    
    chatHeader.appendChild(connectionStatus);
    chatArea.appendChild(chatHeader);
    
    // MessageList and MessageInput components
    if (this.state.activeChannelId || this.state.activeDMUserId) {
      // Messages container
      const messagesContainer = document.createElement('div');
      this.applyStyles(messagesContainer, {
        flexGrow: '1',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      });
      
      // Create MessageList component
      if (this.state.activeChannelId) {
        this.messageListComponent = new MessageList(messagesContainer, {
          channelId: this.state.activeChannelId,
          autoScroll: true
        });
      } else if (this.state.activeDMUserId) {
        this.messageListComponent = new MessageList(messagesContainer, {
          userId: this.state.activeDMUserId,
          autoScroll: true
        });
      }
      
      // Create MessageInput component
      const inputContainer = document.createElement('div');
      this.applyStyles(inputContainer, {
        borderTop: '1px solid #dee2e6'
      });
      
      if (this.state.activeChannelId) {
        this.messageInputComponent = new MessageInput(inputContainer, {
          channelId: this.state.activeChannelId,
          placeholder: 'Type your message...'
        });
      } else if (this.state.activeDMUserId) {
        this.messageInputComponent = new MessageInput(inputContainer, {
          userId: this.state.activeDMUserId,
          placeholder: 'Type your message...'
        });
      }
      
      messagesContainer.appendChild(inputContainer);
      chatArea.appendChild(messagesContainer);
    } else {
      // No active conversation selected
      const noConversation = document.createElement('div');
      this.applyStyles(noConversation, {
        flexGrow: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        color: '#6c757d',
        textAlign: 'center'
      });
      
      noConversation.textContent = 'Select a channel or direct message to start chatting';
      chatArea.appendChild(noConversation);
    }
    
    // Create user list sidebar (right)
    const userSidebar = document.createElement('div');
    this.applyStyles(userSidebar, {
      width: '250px',
      flexShrink: '0',
      backgroundColor: '#f8f9fa',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    });
    
    // Create UserList component
    this.userListComponent = new UserList(userSidebar, {
      showOfflineUsers: true,
      enableDirectMessages: true,
      onUserSelect: this.handleUserSelect
    });
    
    // Add components to layout
    layoutContainer.appendChild(channelSidebar);
    layoutContainer.appendChild(chatArea);
    layoutContainer.appendChild(userSidebar);
    
    // Add layout to container
    this.container.appendChild(layoutContainer);
  }
  
  /**
   * Render the settings view
   */
  renderSettingsView() {
    // For now, just render a placeholder
    // Create header
    this.headerComponent = new Header(this.container, {
      title: 'Settings',
      onLogout: this.handleLogout,
      onViewChange: this.handleViewChange,
      currentView: this.state.view
    });
    
    // Create settings container
    const settingsContainer = document.createElement('div');
    this.applyStyles(settingsContainer, {
      padding: '20px',
      overflow: 'auto',
      height: 'calc(100% - 60px)' // Subtract header height
    });
    
    const title = document.createElement('h2');
    title.textContent = 'Settings';
    
    const content = document.createElement('p');
    content.textContent = 'Settings view is under construction.';
    
    settingsContainer.appendChild(title);
    settingsContainer.appendChild(content);
    
    // Add to container
    this.container.appendChild(settingsContainer);
  }
  
  /**
   * Render the admin view
   */
  renderAdminView() {
    // For now, just render a placeholder
    // Create header
    this.headerComponent = new Header(this.container, {
      title: 'Admin Panel',
      onLogout: this.handleLogout,
      onViewChange: this.handleViewChange,
      currentView: this.state.view
    });
    
    // Create admin container
    const adminContainer = document.createElement('div');
    this.applyStyles(adminContainer, {
      padding: '20px',
      overflow: 'auto',
      height: 'calc(100% - 60px)' // Subtract header height
    });
    
    const title = document.createElement('h2');
    title.textContent = 'Admin Panel';
    
    const content = document.createElement('p');
    content.textContent = 'Admin panel is under construction.';
    
    adminContainer.appendChild(title);
    adminContainer.appendChild(content);
    
    // Add to container
    this.container.appendChild(adminContainer);
  }
  
  /**
   * Handle successful login
   * @param {Object} user - Authenticated user
   */
  handleLogin(user) {
    // Authentication is handled by auth context
    // The auth listener will update the state and trigger a re-render
    logChatEvent('auth', 'User logged in via login form', {
      username: user.username
    });
  }
  
  /**
   * Handle logout
   */
  handleLogout() {
    // Logout user through auth context
    authContext.logout('user_initiated');
    
    logChatEvent('auth', 'User logged out via header');
  }
  
  /**
   * Handle channel selection
   * @param {string} channelId - Selected channel ID
   */
  handleChannelSelect(channelId) {
    // Set active channel
    this.state.activeChannelId = channelId;
    this.state.activeDMUserId = null;
    
    // Update channel service
    setActiveChannel(channelId);
    
    // Re-render
    this.render();
    
    logChatEvent('ui', 'Channel selected', {
      channelId
    });
  }
  
  /**
   * Handle user selection for direct messages
   * @param {Object} user - Selected user
   */
  handleUserSelect(user) {
    // Set active direct message
    this.state.activeDMUserId = user.id;
    this.state.activeChannelId = null;
    
    // Re-render
    this.render();
    
    logChatEvent('ui', 'User selected for direct message', {
      userId: user.id
    });
  }
  
  /**
   * Handle view change
   * @param {string} view - New view to display
   */
  handleViewChange(view) {
    if (this.state.view !== view) {
      this.state.view = view;
      this.render();
      
      logChatEvent('ui', 'View changed', {
        view
      });
    }
  }
  
  /**
   * Clean up components
   */
  cleanupComponents() {
    // Destroy component instances to prevent memory leaks
    if (this.headerComponent) {
      if (typeof this.headerComponent.destroy === 'function') {
        this.headerComponent.destroy();
      }
      this.headerComponent = null;
    }
    
    if (this.messageListComponent) {
      if (typeof this.messageListComponent.destroy === 'function') {
        this.messageListComponent.destroy();
      }
      this.messageListComponent = null;
    }
    
    if (this.messageInputComponent) {
      if (typeof this.messageInputComponent.destroy === 'function') {
        this.messageInputComponent.destroy();
      }
      this.messageInputComponent = null;
    }
    
    if (this.userListComponent) {
      if (typeof this.userListComponent.destroy === 'function') {
        this.userListComponent.destroy();
      }
      this.userListComponent = null;
    }
    
    if (this.userStatusComponent) {
      if (typeof this.userStatusComponent.destroy === 'function') {
        this.userStatusComponent.destroy();
      }
      this.userStatusComponent = null;
    }
    
    if (this.loginFormComponent) {
      if (typeof this.loginFormComponent.destroy === 'function') {
        this.loginFormComponent.destroy();
      }
      this.loginFormComponent = null;
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
    try {
      // Clean up components
      this.cleanupComponents();
      
      // Unsubscribe from auth context
      if (this.authUnsubscribe) {
        this.authUnsubscribe();
        this.authUnsubscribe = null;
      }
      
      // Disconnect from server
      disconnectFromServer();
      
      // Clear container
      if (this.container) {
        this.container.innerHTML = '';
      }
      
      logChatEvent('system', 'App container destroyed');
    } catch (error) {
      console.error('[AppContainer] Destroy error:', error);
      logChatEvent('error', 'App container destroy error', { error: error.message });
    }
  }
}

export default AppContainer;