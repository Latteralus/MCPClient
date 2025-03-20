// chat/components/messages/MessageList.js
// Message list component for HIPAA-compliant chat

import authContext from '../../contexts/AuthContext.js';
import webSocketContext from '../../contexts/WebSocketContext.js';
import encryptionContext from '../../contexts/EncryptionContext.js';
import messageService from '../../services/api/messages.js';
import userService from '../../services/api/users.js';
import { logChatEvent } from '../../utils/logger.js';
import { escapeHtml } from '../../utils/validation.js';
import { handleError, ErrorCategory, ErrorCode } from '../../utils/error-handler.js';
import { createCache } from '../../utils/cache.js';

class MessageList {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      channelId: null,
      userId: null,
      maxMessages: 50,
      showTimestamps: true,
      groupMessages: true,
      highlightPHI: true,
      autoScroll: true,
      ...options
    };
    
    this.messageListElement = null;
    this.messages = [];
    this.scrollLock = false;
    
    // New properties for advanced functionality
    this.typingUsers = new Map(); // Map of userId -> typing status
    this.unseenMessageCount = 0;
    this.lastReadMessageId = null;
    this.unreadMarkerElement = null;
    
    // Subscriptions
    this.messageSubscription = null;
    this.connectionSubscription = null;
    
    // Create user info cache
    this.userCache = createCache('messageList_users', {
      maxItems: 100,
      ttl: 30 * 60 * 1000 // 30 minutes
    });
    
    // Bind methods
    this.render = this.render.bind(this);
    this.loadMessages = this.loadMessages.bind(this);
    this.handleNewMessages = this.handleNewMessages.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.handleConnectionChange = this.handleConnectionChange.bind(this);
    this.handleUserTyping = this.handleUserTyping.bind(this);
    this.markMessagesAsRead = this.markMessagesAsRead.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the message list
   */
  initialize() {
    // Create container element
    this.messageListElement = document.createElement('div');
    this.messageListElement.className = 'message-list';
    this.applyStyles(this.messageListElement, {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      overflow: 'auto',
      padding: '16px',
      boxSizing: 'border-box'
    });
    
    // Add scroll event listener
    this.messageListElement.addEventListener('scroll', this.handleScroll);
    
    // Add to container
    if (this.container) {
      this.container.appendChild(this.messageListElement);
    }
    
    // Subscribe to WebSocket messages
    this.messageSubscription = webSocketContext.subscribeToMessages(this.handleNewMessages);
    
    // Subscribe to connection changes
    this.connectionSubscription = webSocketContext.subscribeToConnection(this.handleConnectionChange);
    
    // Load initial messages
    this.loadMessages();
    
    // Log initialization
    logChatEvent('ui', 'Message list component initialized', {
      channelId: this.options.channelId,
      userId: this.options.userId
    });
  }
  
  /**
   * Handle connection state changes
   * @param {Object} connectionState - WebSocket connection state
   */
  handleConnectionChange(connectionState) {
    // If we've reconnected, reload messages to ensure we didn't miss any
    if (connectionState.status === 'connected' && this.connectionStatus !== 'connected') {
      this.loadMessages();
    }
    
    this.connectionStatus = connectionState.status;
  }
  
  /**
   * Handle scroll events
   */
  handleScroll() {
    // Check if user has scrolled up
    const { scrollHeight, scrollTop, clientHeight } = this.messageListElement;
    const isScrolledToBottom = scrollHeight - scrollTop - clientHeight <= 50;
    
    // Update scroll lock
    this.scrollLock = !isScrolledToBottom;
    
    // If scrolled to bottom, mark messages as read
    if (isScrolledToBottom && this.unseenMessageCount > 0) {
      this.markMessagesAsRead();
    }
  }
  
  /**
   * Load messages from service
   */
  async loadMessages() {
    try {
      // If channelId is provided, get channel messages
      if (this.options.channelId) {
        const result = await messageService.getChannelMessages(
          this.options.channelId, 
          { limit: this.options.maxMessages }
        );
        
        if (result.success) {
          // Decrypt messages if encrypted
          this.messages = await this.processMessages(result.data.messages || []);
        } else {
          this.messages = [];
          throw new Error(result.message || 'Failed to load channel messages');
        }
      }
      // If userId is provided, get direct messages
      else if (this.options.userId) {
        const currentUser = authContext.getCurrentUser();
        if (currentUser) {
          const result = await messageService.getDirectMessages(
            currentUser.id,
            this.options.userId,
            { limit: this.options.maxMessages }
          );
          
          if (result.success) {
            // Decrypt messages if encrypted
            this.messages = await this.processMessages(result.data.messages || []);
          } else {
            this.messages = [];
            throw new Error(result.message || 'Failed to load direct messages');
          }
        }
      }
      
      // Render the messages
      this.render();
      
      // Scroll to bottom on initial load
      if (this.options.autoScroll) {
        this.scrollToBottom();
      }
      
      // Mark messages as read
      this.markMessagesAsRead();
    } catch (error) {
      handleError(error, {
        code: ErrorCode.DATA_NOT_FOUND,
        category: ErrorCategory.DATA,
        source: 'MessageList',
        message: 'Failed to load messages'
      });
      
      // Render empty state
      this.render();
    }
  }
  
  /**
   * Process messages (decrypt if needed)
   * @param {Array} messages - Messages to process
   * @returns {Promise<Array>} Processed messages
   */
  async processMessages(messages) {
    try {
      // Load user info for message display
      await this.preloadUserInfo(messages);
      
      // Decrypt messages if encrypted
      if (encryptionContext.getEncryptionState().active) {
        return await encryptionContext.decryptMany(messages);
      }
      
      return messages;
    } catch (error) {
      handleError(error, {
        code: ErrorCode.DECRYPTION_FAILED,
        category: ErrorCategory.SECURITY,
        source: 'MessageList'
      });
      
      return messages.map(msg => {
        if (msg.encrypted) {
          return {
            ...msg,
            text: '[Encrypted message - unable to decrypt]',
            decryptionFailed: true
          };
        }
        return msg;
      });
    }
  }
  
  /**
   * Preload user information for messages
   * @param {Array} messages - Messages to get user info for
   */
  async preloadUserInfo(messages) {
    try {
      // Collect unique user IDs
      const userIds = new Set();
      
      messages.forEach(message => {
        if (message.sender) userIds.add(message.sender);
        if (message.recipient) userIds.add(message.recipient);
      });
      
      // Filter out users we already have in cache
      const userIdsToLoad = Array.from(userIds).filter(
        id => !this.userCache.has(id)
      );
      
      // Load users in batches
      if (userIdsToLoad.length > 0) {
        // Request users from service (up to 20 at a time)
        for (let i = 0; i < userIdsToLoad.length; i += 20) {
          const batch = userIdsToLoad.slice(i, i + 20);
          const users = await userService.getAllUsers({ ids: batch });
          
          // Add to cache
          users.forEach(user => {
            this.userCache.set(user.id, user);
          });
        }
      }
    } catch (error) {
      console.error('[MessageList] Error preloading user info:', error);
    }
  }
  
  /**
   * Get user information by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User object
   */
  async getUserInfo(userId) {
    // Check cache first
    const cachedUser = this.userCache.get(userId);
    if (cachedUser) return cachedUser;
    
    try {
      // Load from service
      const user = await userService.getUserById(userId);
      
      // Cache for future use
      if (user) {
        this.userCache.set(userId, user);
      }
      
      return user || { id: userId, username: 'Unknown User' };
    } catch (error) {
      console.error('[MessageList] Error getting user info:', error);
      return { id: userId, username: 'Unknown User' };
    }
  }
  
  /**
   * Update with new messages
   * @param {string} channelId - Channel ID
   */
  updateChannel(channelId) {
    if (this.options.channelId !== channelId) {
      this.options.channelId = channelId;
      this.options.userId = null; // Clear user ID if channel is set
      this.typingUsers.clear(); // Clear typing indicators
      this.unseenMessageCount = 0; // Reset unseen count
      this.lastReadMessageId = null; // Reset last read
      this.loadMessages();
      
      // Log channel change
      logChatEvent('ui', 'Message list switched to channel', {
        channelId
      });
    }
  }
  
  /**
   * Update with direct messages
   * @param {string} userId - User ID
   */
  updateDirectMessage(userId) {
    if (this.options.userId !== userId) {
      this.options.userId = userId;
      this.options.channelId = null; // Clear channel ID if user is set
      this.typingUsers.clear(); // Clear typing indicators
      this.unseenMessageCount = 0; // Reset unseen count
      this.lastReadMessageId = null; // Reset last read
      this.loadMessages();
      
      // Log direct message change
      logChatEvent('ui', 'Message list switched to direct messages', {
        userId
      });
    }
  }
  
  /**
   * Handle new messages
   * @param {Array} newMessages - New messages
   */
  async handleNewMessages(newMessages) {
    let hasRelevantMessages = false;
    let unreadCount = 0;
    
    // Filter for messages matching current context
    const relevantMessages = newMessages.filter(msg => {
      // Check for typing indicators
      if (msg.type === 'typing_start' || msg.type === 'typing_stop') {
        this.handleUserTyping(msg);
        return false; // Don't add typing indicators to message list
      }
      
      // Check for message read status updates
      if (msg.type === 'message_read') {
        // Handle read receipts if needed
        return false;
      }
      
      // Regular messages
      if (this.options.channelId && msg.channel === this.options.channelId) {
        return true;
      }
      
      if (this.options.userId) {
        const currentUser = authContext.getCurrentUser();
        if (!currentUser) return false;
        
        // Check if direct message between these users
        return (msg.sender === currentUser.id && msg.recipient === this.options.userId) ||
               (msg.sender === this.options.userId && msg.recipient === currentUser.id);
      }
      
      return false;
    });
    
    // If we have new messages for this context
    if (relevantMessages.length > 0) {
      // Process messages (decrypt if needed)
      const processedMessages = await this.processMessages(relevantMessages);
      
      // Add to current message list
      this.messages = [...this.messages, ...processedMessages];
      
      // Count messages not from current user
      const currentUser = authContext.getCurrentUser();
      if (currentUser) {
        unreadCount = processedMessages.filter(msg => 
          msg.sender !== currentUser.id
        ).length;
      }
      
      // Update unseen count if we're scrolled up
      if (this.scrollLock) {
        this.unseenMessageCount += unreadCount;
      }
      
      // Re-render
      this.render();
      
      // Scroll to bottom if not scrolled up
      if (this.options.autoScroll && !this.scrollLock) {
        this.scrollToBottom();
        
        // Mark as read since we're showing them
        if (unreadCount > 0) {
          this.markMessagesAsRead();
        }
      }
      
      hasRelevantMessages = true;
    }
    
    return hasRelevantMessages;
  }
  
  /**
   * Handle user typing indicators
   * @param {Object} typingEvent - Typing event from WebSocket
   */
  handleUserTyping(typingEvent) {
    // Ensure channelId or recipientId matches current context
    const currentUser = authContext.getCurrentUser();
    if (!currentUser) return;
    
    let isRelevant = false;
    
    // Check if relevant to current view
    if (this.options.channelId && typingEvent.channelId === this.options.channelId) {
      isRelevant = true;
    } else if (this.options.userId && 
              (typingEvent.sender === this.options.userId || 
               typingEvent.recipientId === this.options.userId)) {
      isRelevant = true;
    }
    
    if (!isRelevant) return;
    
    // Update typing status
    if (typingEvent.type === 'typing_start') {
      // Set typing status
      this.typingUsers.set(typingEvent.sender, {
        userId: typingEvent.sender,
        timestamp: new Date().getTime()
      });
      
      // Auto-clear after 6 seconds (in case stop event is missed)
      setTimeout(() => {
        const userTyping = this.typingUsers.get(typingEvent.sender);
        if (userTyping && (new Date().getTime() - userTyping.timestamp) > 6000) {
          this.typingUsers.delete(typingEvent.sender);
          this.renderTypingIndicators();
        }
      }, 6000);
    } else if (typingEvent.type === 'typing_stop') {
      // Clear typing status
      this.typingUsers.delete(typingEvent.sender);
    }
    
    // Update typing indicators
    this.renderTypingIndicators();
  }
  
  /**
   * Mark messages as read
   */
  async markMessagesAsRead() {
    try {
      const currentUser = authContext.getCurrentUser();
      if (!currentUser || this.messages.length === 0) return;
      
      // Find unread messages not sent by current user
      const unreadMessages = this.messages.filter(msg => 
        msg.sender !== currentUser.id && 
        !msg.read &&
        msg.id // Ensure message has an ID
      );
      
      if (unreadMessages.length === 0) return;
      
      // Get message IDs to mark as read
      const messageIds = unreadMessages.map(msg => msg.id);
      
      // Broadcast read status
      webSocketContext.sendReadStatus(messageIds, this.options.channelId);
      
      // Call API to mark as read
      await messageService.markMessagesAsRead(messageIds);
      
      // Update local state
      unreadMessages.forEach(msg => {
        msg.read = true;
      });
      
      // Reset unseen count
      this.unseenMessageCount = 0;
      
      // Remember last read message
      this.lastReadMessageId = unreadMessages[unreadMessages.length - 1].id;
      
      // Update UI if needed (hide unread marker)
      if (this.unreadMarkerElement) {
        this.unreadMarkerElement.style.display = 'none';
      }
    } catch (error) {
      console.error('[MessageList] Error marking messages as read:', error);
    }
  }
  
  /**
   * Render the message list
   */
  render() {
    if (!this.messageListElement) return;
    
    // Clear existing content
    this.messageListElement.innerHTML = '';
    
    // If no messages, show empty state
    if (this.messages.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-messages';
      this.applyStyles(emptyState, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
        color: '#666'
      });
      
      const emptyIcon = document.createElement('div');
      emptyIcon.innerHTML = '💬';
      this.applyStyles(emptyIcon, {
        fontSize: '48px',
        marginBottom: '16px'
      });
      
      const emptyText = document.createElement('p');
      emptyText.textContent = 'No messages yet.';
      
      emptyState.appendChild(emptyIcon);
      emptyState.appendChild(emptyText);
      this.messageListElement.appendChild(emptyState);
      return;
    }
    
    // Sort messages by timestamp (oldest first)
    const sortedMessages = [...this.messages].sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
    
    // Group messages if enabled
    if (this.options.groupMessages) {
      this.renderGroupedMessages(sortedMessages);
    } else {
      this.renderIndividualMessages(sortedMessages);
    }
    
    // Add typing indicators
    this.renderTypingIndicators();
  }
  
  /**
   * Render typing indicators
   */
  renderTypingIndicators() {
    // Remove existing typing indicators
    const existingIndicators = this.messageListElement.querySelectorAll('.typing-indicator');
    existingIndicators.forEach(el => el.remove());
    
    // If no typing users, return
    if (this.typingUsers.size === 0) return;
    
    // Create typing indicator container
    const typingContainer = document.createElement('div');
    typingContainer.className = 'typing-indicator';
    this.applyStyles(typingContainer, {
      padding: '8px 16px',
      color: '#666',
      fontSize: '12px',
      fontStyle: 'italic',
      display: 'flex',
      alignItems: 'center'
    });
    
    // Get user names
    const typingUsersList = Array.from(this.typingUsers.values());
    let typingText = '';
    
    if (typingUsersList.length === 1) {
      const user = this.userCache.get(typingUsersList[0].userId) || { username: 'Someone' };
      typingText = `${user.username} is typing...`;
    } else if (typingUsersList.length === 2) {
      const user1 = this.userCache.get(typingUsersList[0].userId) || { username: 'Someone' };
      const user2 = this.userCache.get(typingUsersList[1].userId) || { username: 'Someone' };
      typingText = `${user1.username} and ${user2.username} are typing...`;
    } else {
      typingText = `${typingUsersList.length} people are typing...`;
    }
    
    // Create dots animation
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'typing-dots';
    this.applyStyles(dotsContainer, {
      display: 'inline-block',
      marginRight: '8px'
    });
    
    // Add animated dots
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.textContent = '•';
      this.applyStyles(dot, {
        animation: `typingAnimation 1.4s ${i * 0.2}s infinite`,
        display: 'inline-block'
      });
      dotsContainer.appendChild(dot);
    }
    
    // Add keyframes for animation if not already added
    if (!document.getElementById('typing-animation-style')) {
      const style = document.createElement('style');
      style.id = 'typing-animation-style';
      style.textContent = `
        @keyframes typingAnimation {
          0%, 20% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
          80%, 100% { transform: translateY(0px); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Set text
    const textSpan = document.createElement('span');
    textSpan.textContent = typingText;
    
    typingContainer.appendChild(dotsContainer);
    typingContainer.appendChild(textSpan);
    
    // Add to message list
    this.messageListElement.appendChild(typingContainer);
  }
  
  /**
   * Render messages grouped by sender and date
   * @param {Array} messages - Messages to render
   */
  renderGroupedMessages(messages) {
    if (!messages.length) return;
    
    // Group messages by date first
    const messagesByDate = this.groupMessagesByDate(messages);
    
    // Render each date group
    Object.keys(messagesByDate).forEach(date => {
      // Add date separator
      const dateHeader = this.createDateSeparator(date);
      this.messageListElement.appendChild(dateHeader);
      
      // Group messages by sender within this date
      let currentSender = null;
      let messageGroup = null;
      
      messagesByDate[date].forEach((message, index) => {
        // If new sender or break in time (>5 min), start new group
        const newGroup = currentSender !== message.sender || 
                         (index > 0 && this.messageTimeDiff(
                           messagesByDate[date][index-1], 
                           message
                         ) > 5);
        
        if (newGroup) {
          // Create new message group
          messageGroup = this.createMessageGroup(message);
          this.messageListElement.appendChild(messageGroup);
          currentSender = message.sender;
        } else {
          // Add to existing group
          this.addMessageToGroup(messageGroup, message);
        }
        
        // Add unread marker if this is the first unread message
        if (this.lastReadMessageId && message.id === this.lastReadMessageId) {
          this.addUnreadMarker();
        }
      });
    });
  }
  
  /**
   * Add unread messages marker
   */
  addUnreadMarker() {
    if (this.unseenMessageCount === 0) return;
    
    const marker = document.createElement('div');
    marker.className = 'unread-marker';
    this.applyStyles(marker, {
      width: '100%',
      textAlign: 'center',
      position: 'relative',
      margin: '8px 0',
      height: '0',
      borderBottom: '1px solid #f44336'
    });
    
    const markerText = document.createElement('span');
    markerText.textContent = 'New Messages';
    this.applyStyles(markerText, {
      backgroundColor: '#f44336',
      color: 'white',
      fontSize: '12px',
      padding: '2px 8px',
      borderRadius: '4px',
      position: 'absolute',
      top: '-10px',
      right: '20px'
    });
    
    marker.appendChild(markerText);
    this.messageListElement.appendChild(marker);
    this.unreadMarkerElement = marker;
  }
  
  /**
   * Render individual messages without grouping
   * @param {Array} messages - Messages to render
   */
  renderIndividualMessages(messages) {
    messages.forEach(message => {
      const messageElement = this.createMessageElement(message, false);
      this.messageListElement.appendChild(messageElement);
    });
  }
  
  /**
   * Create a message group element
   * @param {Object} firstMessage - First message in the group
   * @returns {HTMLElement} Message group element
   */
  async createMessageGroup(firstMessage) {
    const currentUser = authContext.getCurrentUser();
    const isCurrentUser = currentUser && firstMessage.sender === currentUser.id;
    
    // Get user information
    const sender = await this.getUserInfo(firstMessage.sender);
    
    const groupElement = document.createElement('div');
    groupElement.className = `message-group ${isCurrentUser ? 'outgoing' : 'incoming'}`;
    this.applyStyles(groupElement, {
      display: 'flex',
      marginBottom: '16px',
      flexDirection: isCurrentUser ? 'row-reverse' : 'row'
    });
    
    // Add avatar
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'avatar-container';
    this.applyStyles(avatarContainer, {
      width: '36px',
      height: '36px',
      marginRight: isCurrentUser ? '0' : '8px',
      marginLeft: isCurrentUser ? '8px' : '0',
      flexShrink: '0'
    });
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    
    // Get first letter of username
    const initial = (sender.displayName || sender.username || 'U').charAt(0).toUpperCase();
    avatar.textContent = initial;
    
    // Generate color based on username
    const hue = this.generateColorFromString(sender.username || 'Unknown');
    const bgColor = `hsl(${hue}, 70%, 80%)`;
    const textColor = `hsl(${hue}, 70%, 30%)`;
    
    this.applyStyles(avatar, {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      backgroundColor: bgColor,
      color: textColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: '16px'
    });
    
    avatarContainer.appendChild(avatar);
    groupElement.appendChild(avatarContainer);
    
    // Create messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'messages-container';
    this.applyStyles(messagesContainer, {
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '80%'
    });
    
    // Add sender name
    const senderElement = document.createElement('div');
    senderElement.className = 'message-sender';
    senderElement.textContent = isCurrentUser ? 'You' : (sender.displayName || sender.username || 'Unknown User');
    this.applyStyles(senderElement, {
      fontWeight: 'bold',
      marginBottom: '4px',
      padding: '0 8px',
      fontSize: '14px',
      color: '#555',
      textAlign: isCurrentUser ? 'right' : 'left'
    });
    
    // Add first message
    const firstMessageElement = this.createBubbleElement(firstMessage, isCurrentUser);
    
    messagesContainer.appendChild(senderElement);
    messagesContainer.appendChild(firstMessageElement);
    
    groupElement.appendChild(messagesContainer);
    
    return groupElement;
  }
  
  /**
   * Add a message to an existing message group
   * @param {HTMLElement} groupElement - Message group element
   * @param {Object} message - Message to add
   */
  addMessageToGroup(groupElement, message) {
    if (!groupElement) return;
    
    const currentUser = authContext.getCurrentUser();
    const isCurrentUser = currentUser && message.sender === currentUser.id;
    
    const messagesContainer = groupElement.querySelector('.messages-container');
    if (!messagesContainer) return;
    
    const bubbleElement = this.createBubbleElement(message, isCurrentUser);
    messagesContainer.appendChild(bubbleElement);
  }
  
  /**
   * Create a message bubble element
   * @param {Object} message - Message data
   * @param {boolean} isCurrentUser - Whether message is from current user
   * @returns {HTMLElement} Message bubble element
   */
  createBubbleElement(message, isCurrentUser) {
    const bubbleElement = document.createElement('div');
    bubbleElement.className = `message-bubble ${isCurrentUser ? 'outgoing' : 'incoming'}`;
    this.applyStyles(bubbleElement, {
      padding: '8px 12px',
      backgroundColor: isCurrentUser ? '#e3f2fd' : '#f5f5f5',
      borderRadius: '12px',
      marginBottom: '4px',
      maxWidth: '100%',
      wordWrap: 'break-word',
      position: 'relative',
      alignSelf: isCurrentUser ? 'flex-end' : 'flex-start'
    });
    
    // Style as error if decryption failed
    if (message.decryptionFailed) {
      bubbleElement.style.backgroundColor = '#ffebee';
      bubbleElement.style.border = '1px solid #ffcdd2';
    }
    
    // Set border radius based on position
    if (isCurrentUser) {
      bubbleElement.style.borderBottomRightRadius = '4px';
    } else {
      bubbleElement.style.borderBottomLeftRadius = '4px';
    }
    
    // Message text
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.innerHTML = escapeHtml(message.text);
    
    // Add timestamp if enabled
    if (this.options.showTimestamps) {
      const timeElement = document.createElement('div');
      timeElement.className = 'message-time';
      timeElement.textContent = this.formatTime(new Date(message.timestamp));
      this.applyStyles(timeElement, {
        fontSize: '10px',
        color: '#999',
        marginTop: '2px',
        textAlign: 'right'
      });
      
      bubbleElement.appendChild(messageText);
      bubbleElement.appendChild(timeElement);
    } else {
      bubbleElement.appendChild(messageText);
    }
    
    // Add encrypted indicator
    if (message.encrypted) {
      const encryptedIndicator = document.createElement('div');
      encryptedIndicator.className = 'encrypted-indicator';
      encryptedIndicator.innerHTML = '🔒';
      this.applyStyles(encryptedIndicator, {
        position: 'absolute',
        bottom: '2px',
        right: '2px',
        fontSize: '8px',
        color: '#2196F3',
        opacity: '0.7'
      });
      
      bubbleElement.appendChild(encryptedIndicator);
    }
    
    // Add PHI indicator if needed
    if (this.options.highlightPHI && (message.containsPHI || encryptionContext.mayContainPHI(message.text))) {
      const phiIndicator = document.createElement('div');
      phiIndicator.className = 'phi-indicator';
      phiIndicator.innerHTML = '🔒 PHI';
      this.applyStyles(phiIndicator, {
        position: 'absolute',
        top: '-6px',
        right: isCurrentUser ? 'auto' : '5px',
        left: isCurrentUser ? '5px' : 'auto',
        backgroundColor: '#ffecb3',
        color: '#bf360c',
        fontSize: '9px',
        padding: '2px 4px',
        borderRadius: '3px',
        fontWeight: 'bold'
      });
      
      bubbleElement.appendChild(phiIndicator);
    }
    
    // Add read indicator for outgoing messages
    if (isCurrentUser && message.read) {
      const readIndicator = document.createElement('div');
      readIndicator.className = 'read-indicator';
      readIndicator.innerHTML = '✓✓';
      this.applyStyles(readIndicator, {
        position: 'absolute',
        right: '4px',
        bottom: '2px',
        fontSize: '8px',
        color: '#4CAF50',
        fontWeight: 'bold'
      });
      
      bubbleElement.appendChild(readIndicator);
    }
    
    // Return the bubble element
    return bubbleElement;
  }
  
  /**
   * Format time for display
   * @param {Date} date - Date object
   * @returns {string} Formatted time
   */
  formatTime(date) {
    if (!date || isNaN(date.getTime())) {
      return '';
    }
    
    // Format as HH:MM AM/PM
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  }
  
  /**
   * Calculate time difference between messages in minutes
   * @param {Object} message1 - First message
   * @param {Object} message2 - Second message
   * @returns {number} Time difference in minutes
   */
  messageTimeDiff(message1, message2) {
    const time1 = new Date(message1.timestamp).getTime();
    const time2 = new Date(message2.timestamp).getTime();
    
    // Calculate difference in minutes
    return Math.abs(time2 - time1) / (60 * 1000);
  }
  
  /**
   * Group messages by date
   * @param {Array} messages - Messages to group
   * @returns {Object} Messages grouped by date
   */
  groupMessagesByDate(messages) {
    const groups = {};
    
    messages.forEach(message => {
      // Get date in YYYY-MM-DD format
      const date = new Date(message.timestamp);
      const dateKey = date.toISOString().split('T')[0];
      
      // Create group if it doesn't exist
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      // Add message to group
      groups[dateKey].push(message);
    });
    
    return groups;
  }
  
  /**
   * Create a date separator
   * @param {string} dateString - Date string (YYYY-MM-DD)
   * @returns {HTMLElement} Date separator element
   */
  createDateSeparator(dateString) {
    const separator = document.createElement('div');
    separator.className = 'date-separator';
    this.applyStyles(separator, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '16px 0',
      position: 'relative'
    });
    
    // Create line
    const line = document.createElement('div');
    this.applyStyles(line, {
      width: '100%',
      height: '1px',
      backgroundColor: '#e0e0e0'
    });
    
    // Create date label
    const dateLabel = document.createElement('div');
    dateLabel.className = 'date-label';
    
    // Format date display
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dateText;
    
    // Check if date is today, yesterday, or other
    if (date.toDateString() === today.toDateString()) {
      dateText = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateText = 'Yesterday';
    } else {
      // Format as Month Day, Year
      dateText = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    dateLabel.textContent = dateText;
    this.applyStyles(dateLabel, {
      backgroundColor: '#fff',
      padding: '0 10px',
      fontSize: '12px',
      color: '#888',
      position: 'absolute'
    });
    
    separator.appendChild(line);
    separator.appendChild(dateLabel);
    
    return separator;
  }
  
  /**
   * Scroll to the bottom of the message list
   */
  scrollToBottom() {
    if (this.messageListElement) {
      this.messageListElement.scrollTop = this.messageListElement.scrollHeight;
    }
  }
  
  /**
   * Generate a color from a string (for user avatars)
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
    // Remove event listeners
    if (this.messageListElement) {
      this.messageListElement.removeEventListener('scroll', this.handleScroll);
    }
    
    // Remove WebSocket subscriptions
    if (this.messageSubscription) {
      this.messageSubscription();
      this.messageSubscription = null;
    }
    
    if (this.connectionSubscription) {
      this.connectionSubscription();
      this.connectionSubscription = null;
    }
    
    // Destroy user cache
    if (this.userCache) {
      this.userCache.destroy();
    }
    
    // Clear typing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
    
    // Remove from DOM
    if (this.messageListElement && this.messageListElement.parentNode) {
      this.messageListElement.parentNode.removeChild(this.messageListElement);
    }
    
    // Log destruction
    logChatEvent('ui', 'Message list component destroyed');
  }
}

export default MessageList;