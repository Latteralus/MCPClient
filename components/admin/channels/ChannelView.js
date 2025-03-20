// chat/components/channels/ChannelView.js
// Channel view component for HIPAA-compliant chat

import { getChannelById, getActiveChannel, hasPermission } from '../../../services/channelService.js';
import { getChannelMessages } from '../../../utils/storage.js';
import { addMessageListener, sendChatMessage } from '../../../services/messageService.js';
import { getUserById, getOnlineUsers, addUserStatusListener } from '../../../services/userService.js';
import { getCurrentUser, isAuthenticated } from '../../../services/auth';
import { logChatEvent } from '../../../utils/logger.js';
import { containsPotentialPHI } from '../../../utils/validation.js';

class ChannelView {
  constructor(container) {
    this.container = container;
    this.channelViewElement = null;
    this.messagesElement = null;
    this.inputElement = null;
    this.channel = null;
    this.channelId = getActiveChannel();
    this.messages = [];
    this.onlineUsers = [];
    
    // Message listener unsubscribe function
    this.unsubscribeMessageListener = null;
    this.unsubscribeUserStatusListener = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.renderMessages = this.renderMessages.bind(this);
    this.handleMessageReceived = this.handleMessageReceived.bind(this);
    this.handleUserStatusUpdate = this.handleUserStatusUpdate.bind(this);
    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.handleInputKeydown = this.handleInputKeydown.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the channel view
   */
  initialize() {
    // Create container element
    this.channelViewElement = document.createElement('div');
    this.channelViewElement.className = 'channel-view';
    this.applyStyles(this.channelViewElement, {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      overflow: 'hidden'
    });
    
    // Add to container
    if (this.container) {
      this.container.appendChild(this.channelViewElement);
    }
    
    // Load channel and messages
    this.loadChannelData();
    
    // Subscribe to message updates
    this.unsubscribeMessageListener = addMessageListener(this.handleMessageReceived);
    
    // Subscribe to user status updates
    this.unsubscribeUserStatusListener = addUserStatusListener(this.handleUserStatusUpdate);
    
    // Get online users
    this.onlineUsers = getOnlineUsers();
    
    // Render initial state
    this.render();
    
    // Log initialization
    logChatEvent('ui', 'Channel view component initialized', {
      channelId: this.channelId
    });
  }
  
  /**
   * Load channel data and messages
   */
  loadChannelData() {
    // Get channel information
    this.channel = getChannelById(this.channelId);
    
    // Load channel messages
    if (this.channel) {
      this.messages = getChannelMessages(this.channelId);
    } else {
      this.messages = [];
    }
  }
  
  /**
   * Update the active channel
   * @param {string} channelId - New channel ID
   */
  updateActiveChannel(channelId) {
    if (this.channelId !== channelId) {
      this.channelId = channelId;
      this.loadChannelData();
      this.render();
      
      // Log channel switch
      logChatEvent('ui', 'Channel view switched channels', {
        channelId: this.channelId,
        channelName: this.channel?.name
      });
    }
  }
  
  /**
   * Handle incoming messages
   * @param {Array} newMessages - New messages
   */
  handleMessageReceived(newMessages) {
    let hasChannelMessages = false;
    
    // Filter messages for current channel
    const relevantMessages = newMessages.filter(msg => {
      return msg.channel === this.channelId;
    });
    
    // If we have new messages for this channel
    if (relevantMessages.length > 0) {
      // Update messages
      this.loadChannelData();
      
      // Re-render messages
      this.renderMessages();
      
      // Scroll to bottom
      this.scrollToBottom();
      
      hasChannelMessages = true;
    }
    
    // Only update UI if we have relevant messages
    return hasChannelMessages;
  }
  
  /**
   * Handle user status updates
   * @param {Array} users - Online users
   */
  handleUserStatusUpdate(users) {
    this.onlineUsers = users;
    // Potentially update UI to show who is typing, etc.
  }
  
  /**
   * Render the channel view
   */
  render() {
    if (!this.channelViewElement) return;
    
    // Clear existing content
    this.channelViewElement.innerHTML = '';
    
    // If no channel is selected, show placeholder
    if (!this.channel) {
      const placeholder = document.createElement('div');
      placeholder.className = 'channel-placeholder';
      this.applyStyles(placeholder, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '20px',
        textAlign: 'center',
        color: '#666',
        backgroundColor: '#f5f5f5'
      });
      
      const placeholderIcon = document.createElement('div');
      placeholderIcon.innerHTML = '🔔';
      this.applyStyles(placeholderIcon, {
        fontSize: '48px',
        marginBottom: '16px'
      });
      
      const placeholderText = document.createElement('p');
      placeholderText.textContent = 'Select a channel to start chatting';
      
      placeholder.appendChild(placeholderIcon);
      placeholder.appendChild(placeholderText);
      this.channelViewElement.appendChild(placeholder);
      return;
    }
    
    // Create channel header
    const header = document.createElement('div');
    header.className = 'channel-header';
    this.applyStyles(header, {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#f5f5f5'
    });
    
    // Channel icon
    const channelIcon = document.createElement('span');
    channelIcon.className = 'channel-icon';
    channelIcon.innerHTML = this.channel.type === 'public' ? '&#127760;' : '&#128274;'; // Globe or Lock
    this.applyStyles(channelIcon, {
      marginRight: '8px',
      fontSize: '16px'
    });
    
    // Channel name
    const channelName = document.createElement('h2');
    channelName.className = 'channel-name';
    channelName.textContent = this.channel.name;
    this.applyStyles(channelName, {
      margin: '0',
      fontSize: '16px',
      fontWeight: 'bold'
    });
    
    // Channel description (if available)
    if (this.channel.description) {
      const channelDesc = document.createElement('span');
      channelDesc.className = 'channel-description';
      channelDesc.textContent = this.channel.description;
      this.applyStyles(channelDesc, {
        marginLeft: '12px',
        fontSize: '14px',
        color: '#666',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      });
      header.appendChild(channelDesc);
    }
    
    // Online user count
    const onlineCount = document.createElement('span');
    onlineCount.className = 'online-count';
    onlineCount.textContent = `${this.onlineUsers.length} online`;
    this.applyStyles(onlineCount, {
      marginLeft: 'auto',
      fontSize: '12px',
      color: '#666'
    });
    
    header.appendChild(channelIcon);
    header.appendChild(channelName);
    header.appendChild(onlineCount);
    this.channelViewElement.appendChild(header);
    
    // Create messages container
    this.messagesElement = document.createElement('div');
    this.messagesElement.className = 'channel-messages';
    this.applyStyles(this.messagesElement, {
      flex: '1',
      overflowY: 'auto',
      padding: '16px',
      backgroundColor: '#ffffff'
    });
    this.channelViewElement.appendChild(this.messagesElement);
    
    // Render messages
    this.renderMessages();
    
    // Create input area
    const inputArea = document.createElement('div');
    inputArea.className = 'channel-input-area';
    this.applyStyles(inputArea, {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      borderTop: '1px solid #e0e0e0',
      backgroundColor: '#f9f9f9'
    });
    
    // Check if user can send messages in this channel
    const canSendMessages = isAuthenticated() && 
                           hasPermission('message.create') && 
                           (!this.channel.readonly || hasPermission('channel.update'));
    
    if (canSendMessages) {
      // Create textarea
      this.inputElement = document.createElement('textarea');
      this.inputElement.className = 'message-input';
      this.inputElement.placeholder = 'Type a message...';
      this.applyStyles(this.inputElement, {
        flex: '1',
        padding: '8px 12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        resize: 'none',
        minHeight: '40px',
        maxHeight: '120px',
        outline: 'none',
        fontFamily: 'inherit',
        fontSize: '14px'
      });
      
      // Add keydown event listener
      this.inputElement.addEventListener('keydown', this.handleInputKeydown);
      
      // Create send button
      const sendButton = document.createElement('button');
      sendButton.className = 'send-button';
      sendButton.innerHTML = '&#10148;'; // Right arrow
      sendButton.title = 'Send Message';
      this.applyStyles(sendButton, {
        marginLeft: '8px',
        padding: '8px 16px',
        backgroundColor: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px'
      });
      
      // Add click event listener
      sendButton.addEventListener('click', this.handleSendMessage);
      
      inputArea.appendChild(this.inputElement);
      inputArea.appendChild(sendButton);
    } else {
      // Create readonly notice
      const readonlyNotice = document.createElement('div');
      readonlyNotice.className = 'readonly-notice';
      this.applyStyles(readonlyNotice, {
        width: '100%',
        textAlign: 'center',
        padding: '10px',
        backgroundColor: '#f0f0f0',
        color: '#666',
        borderRadius: '4px'
      });
      
      if (!isAuthenticated()) {
        readonlyNotice.textContent = 'You must be logged in to send messages';
      } else if (this.channel.readonly) {
        readonlyNotice.textContent = 'This channel is read-only';
      } else {
        readonlyNotice.textContent = 'You do not have permission to send messages';
      }
      
      inputArea.appendChild(readonlyNotice);
    }
    
    this.channelViewElement.appendChild(inputArea);
    
    // Add HIPAA notice if needed
    if (isAuthenticated()) {
      const hipaaNotice = document.createElement('div');
      hipaaNotice.className = 'hipaa-notice';
      this.applyStyles(hipaaNotice, {
        padding: '6px 16px',
        backgroundColor: '#e8f5e9',
        borderTop: '1px solid #c8e6c9',
        fontSize: '12px',
        color: '#2e7d32',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      });
      
      hipaaNotice.innerHTML = '🔒 HIPAA Compliant Chat - Messages are encrypted and expire after 24 hours';
      this.channelViewElement.appendChild(hipaaNotice);
    }
  }
  
  /**
   * Render channel messages
   */
  renderMessages() {
    if (!this.messagesElement) return;
    
    // Clear existing messages
    this.messagesElement.innerHTML = '';
    
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
        padding: '20px',
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
      emptyText.textContent = 'No messages yet. Be the first to start the conversation!';
      
      emptyState.appendChild(emptyIcon);
      emptyState.appendChild(emptyText);
      this.messagesElement.appendChild(emptyState);
      return;
    }
    
    // Group messages by date
    const groupedMessages = this.groupMessagesByDate();
    
    // Render each group
    Object.keys(groupedMessages).forEach(date => {
      // Add date header
      const dateHeader = document.createElement('div');
      dateHeader.className = 'date-header';
      this.applyStyles(dateHeader, {
        textAlign: 'center',
        margin: '16px 0',
        position: 'relative'
      });
      
      const dateLine = document.createElement('hr');
      this.applyStyles(dateLine, {
        border: 'none',
        borderTop: '1px solid #e0e0e0',
        margin: '10px 0'
      });
      
      const dateLabel = document.createElement('span');
      dateLabel.textContent = date;
      this.applyStyles(dateLabel, {
        backgroundColor: '#fff',
        padding: '0 10px',
        fontSize: '12px',
        color: '#666',
        position: 'absolute',
        top: '0',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
      
      dateHeader.appendChild(dateLine);
      dateHeader.appendChild(dateLabel);
      this.messagesElement.appendChild(dateHeader);
      
      // Render messages for this date
      let prevSender = null;
      
      groupedMessages[date].forEach(message => {
        this.messagesElement.appendChild(
          this.createMessageElement(message, prevSender === message.sender)
        );
        prevSender = message.sender;
      });
    });
    
    // Scroll to bottom
    this.scrollToBottom();
  }
  
  /**
   * Group messages by date
   * @returns {Object} Messages grouped by date
   */
  groupMessagesByDate() {
    const groups = {};
    
    this.messages.forEach(message => {
      const date = new Date(message.timestamp);
      const dateString = this.formatDate(date);
      
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      
      groups[dateString].push(message);
    });
    
    return groups;
  }
  
  /**
   * Format a date for display
   * @param {Date} date - Date to format
   * @returns {string} Formatted date
   */
  formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }
  
  /**
   * Format a time for display
   * @param {Date} date - Date to format
   * @returns {string} Formatted time
   */
  formatTime(date) {
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  }
  
  /**
   * Create a message element
   * @param {Object} message - Message data
   * @param {boolean} continuedMessage - Whether this is a continued message from same sender
   * @returns {HTMLElement} Message element
   */
  createMessageElement(message, continuedMessage = false) {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container';
    messageContainer.setAttribute('data-message-id', message.id);
    this.applyStyles(messageContainer, {
      display: 'flex',
      marginBottom: continuedMessage ? '2px' : '12px',
      paddingTop: continuedMessage ? '0' : '4px'
    });
    
    // Get current user
    const currentUser = getCurrentUser();
    const isCurrentUser = currentUser && message.sender === currentUser.username;
    
    // Avatar (hidden for continued messages)
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'avatar-container';
    this.applyStyles(avatarContainer, {
      width: '36px',
      marginRight: '8px',
      display: continuedMessage ? 'block' : 'flex',
      visibility: continuedMessage ? 'hidden' : 'visible',
      alignItems: 'center',
      justifyContent: 'center'
    });
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    
    // Get first letter of username
    const initial = message.sender.charAt(0).toUpperCase();
    avatar.textContent = initial;
    
    // Generate color based on username
    const hue = this.generateColorFromString(message.sender);
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
    messageContainer.appendChild(avatarContainer);
    
    // Message content
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    this.applyStyles(messageContent, {
      flex: '1'
    });
    
    // Only show sender name for first message in a group
    if (!continuedMessage) {
      const messageSender = document.createElement('div');
      messageSender.className = 'message-sender';
      messageSender.textContent = isCurrentUser ? 'You' : message.sender;
      this.applyStyles(messageSender, {
        fontWeight: 'bold',
        marginBottom: '2px',
        display: 'flex',
        alignItems: 'center'
      });
      
      // Add timestamp
      const messageTime = document.createElement('span');
      messageTime.className = 'message-time';
      messageTime.textContent = this.formatTime(new Date(message.timestamp));
      this.applyStyles(messageTime, {
        fontSize: '12px',
        color: '#666',
        marginLeft: '8px',
        fontWeight: 'normal'
      });
      
      messageSender.appendChild(messageTime);
      messageContent.appendChild(messageSender);
    }
    
    // Message text
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    
    // Format message text
    messageText.textContent = message.text;
    
    this.applyStyles(messageText, {
      padding: '8px 12px',
      backgroundColor: isCurrentUser ? '#e3f2fd' : '#f5f5f5',
      borderRadius: '4px',
      display: 'inline-block',
      maxWidth: '80%',
      wordWrap: 'break-word'
    });
    
    messageContent.appendChild(messageText);
    
    // Add PHI warning if needed
    if (containsPotentialPHI(message.text)) {
      const phiWarning = document.createElement('div');
      phiWarning.className = 'phi-warning';
      phiWarning.innerHTML = '🔒 Potential PHI - This message may contain protected health information';
      this.applyStyles(phiWarning, {
        fontSize: '10px',
        color: '#666',
        marginTop: '2px',
        fontStyle: 'italic'
      });
      
      messageContent.appendChild(phiWarning);
    }
    
    messageContainer.appendChild(messageContent);
    
    return messageContainer;
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
   * Handle input keydown event
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleInputKeydown(e) {
    // Send on Enter (but allow Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSendMessage();
    }
  }
  
  /**
   * Handle send message button click
   */
  handleSendMessage() {
    if (!this.inputElement || !this.channel) return;
    
    const messageText = this.inputElement.value.trim();
    if (!messageText) return;
    
    // Send message
    sendChatMessage(messageText, this.channelId);
    
    // Clear input
    this.inputElement.value = '';
    
    // Focus input
    this.inputElement.focus();
  }
  
  /**
   * Scroll the message container to the bottom
   */
  scrollToBottom() {
    if (this.messagesElement) {
      this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
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
    // Unsubscribe from message updates
    if (this.unsubscribeMessageListener) {
      this.unsubscribeMessageListener();
      this.unsubscribeMessageListener = null;
    }
    
    // Unsubscribe from user status updates
    if (this.unsubscribeUserStatusListener) {
      this.unsubscribeUserStatusListener();
      this.unsubscribeUserStatusListener = null;
    }
    
    // Remove event listeners
    if (this.inputElement) {
      this.inputElement.removeEventListener('keydown', this.handleInputKeydown);
    }
    
    // Remove from DOM
    if (this.channelViewElement && this.channelViewElement.parentNode) {
      this.channelViewElement.parentNode.removeChild(this.channelViewElement);
    }
    
    // Log destruction
    logChatEvent('ui', 'Channel view component destroyed');
  }
}

export default ChannelView;