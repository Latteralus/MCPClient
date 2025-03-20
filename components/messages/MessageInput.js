// chat/components/messages/MessageInput.js
// Message input component for HIPAA-compliant chat

import { sendChatMessage } from '../../services/messageService.js';
import { isAuthenticated, hasPermission } from '../../services/auth';
import { logChatEvent } from '../../utils/logger.js';
import { validateMessage, containsPotentialPHI } from '../../utils/validation.js';

class MessageInput {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      channelId: null,
      userId: null,
      placeholder: 'Type a message...',
      maxLength: 2000,
      showCharacterCount: true,
      showPHIWarning: true,
      autoFocus: true,
      ...options
    };
    
    this.inputContainerElement = null;
    this.textareaElement = null;
    this.sendButtonElement = null;
    this.characterCountElement = null;
    this.phiWarningElement = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleSendClick = this.handleSendClick.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.checkPHI = this.checkPHI.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the message input
   */
  initialize() {
    // Create container element
    this.inputContainerElement = document.createElement('div');
    this.inputContainerElement.className = 'message-input-container';
    this.applyStyles(this.inputContainerElement, {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      backgroundColor: '#f9f9f9',
      borderTop: '1px solid #e0e0e0',
      padding: '10px',
      boxSizing: 'border-box'
    });
    
    // Add to container
    if (this.container) {
      this.container.appendChild(this.inputContainerElement);
    }
    
    // Render the input
    this.render();
    
    // Log initialization
    logChatEvent('ui', 'Message input component initialized', {
      channelId: this.options.channelId,
      userId: this.options.userId
    });
  }
  
  /**
   * Render the message input
   */
  render() {
    if (!this.inputContainerElement) return;
    
    // Clear existing content
    this.inputContainerElement.innerHTML = '';
    
    // Check if user can send messages
    const canSendMessages = isAuthenticated() && hasPermission('message.create');
    
    if (canSendMessages) {
      // Create input row
      const inputRow = document.createElement('div');
      inputRow.className = 'input-row';
      this.applyStyles(inputRow, {
        display: 'flex',
        alignItems: 'flex-end'
      });
      
      // Create textarea
      this.textareaElement = document.createElement('textarea');
      this.textareaElement.className = 'message-textarea';
      this.textareaElement.placeholder = this.options.placeholder;
      this.textareaElement.maxLength = this.options.maxLength;
      this.applyStyles(this.textareaElement, {
        flex: '1',
        minHeight: '40px',
        maxHeight: '120px',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        resize: 'none',
        fontSize: '14px',
        fontFamily: 'inherit',
        outline: 'none'
      });
      
      // Add event listeners
      this.textareaElement.addEventListener('input', this.handleInput);
      this.textareaElement.addEventListener('keydown', this.handleKeyDown);
      
      // Create send button
      this.sendButtonElement = document.createElement('button');
      this.sendButtonElement.className = 'send-button';
      this.sendButtonElement.innerHTML = '➤'; // Right arrow icon
      this.sendButtonElement.title = 'Send Message';
      this.sendButtonElement.disabled = true;
      this.applyStyles(this.sendButtonElement, {
        marginLeft: '8px',
        width: '40px',
        height: '40px',
        backgroundColor: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: '0.7'
      });
      
      // Add event listener
      this.sendButtonElement.addEventListener('click', this.handleSendClick);
      
      inputRow.appendChild(this.textareaElement);
      inputRow.appendChild(this.sendButtonElement);
      this.inputContainerElement.appendChild(inputRow);
      
      // Create info row
      const infoRow = document.createElement('div');
      infoRow.className = 'info-row';
      this.applyStyles(infoRow, {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '4px',
        fontSize: '12px',
        color: '#666'
      });
      
      // Character count
      if (this.options.showCharacterCount) {
        this.characterCountElement = document.createElement('div');
        this.characterCountElement.className = 'character-count';
        this.characterCountElement.textContent = `0/${this.options.maxLength}`;
        infoRow.appendChild(this.characterCountElement);
      }
      
      // PHI warning (hidden initially)
      if (this.options.showPHIWarning) {
        this.phiWarningElement = document.createElement('div');
        this.phiWarningElement.className = 'phi-warning';
        this.phiWarningElement.innerHTML = '🔒 This message may contain PHI (Protected Health Information)';
        this.applyStyles(this.phiWarningElement, {
          color: '#bf360c',
          fontWeight: 'bold',
          display: 'none'
        });
        infoRow.appendChild(this.phiWarningElement);
      }
      
      this.inputContainerElement.appendChild(infoRow);
      
      // Auto focus if enabled
      if (this.options.autoFocus) {
        this.textareaElement.focus();
      }
    } else {
      // Create readonly notice
      const readonlyNotice = document.createElement('div');
      readonlyNotice.className = 'readonly-notice';
      this.applyStyles(readonlyNotice, {
        padding: '10px',
        backgroundColor: '#f0f0f0',
        color: '#666',
        borderRadius: '4px',
        textAlign: 'center'
      });
      
      if (!isAuthenticated()) {
        readonlyNotice.textContent = 'You must be logged in to send messages';
      } else {
        readonlyNotice.textContent = 'You do not have permission to send messages';
      }
      
      this.inputContainerElement.appendChild(readonlyNotice);
    }
    
    // Add HIPAA notice
    const hipaaNotice = document.createElement('div');
    hipaaNotice.className = 'hipaa-notice';
    hipaaNotice.innerHTML = '🔒 HIPAA Compliant Chat - Messages are encrypted and expire after 24 hours';
    this.applyStyles(hipaaNotice, {
      fontSize: '10px',
      color: '#666',
      textAlign: 'center',
      padding: '4px',
      backgroundColor: '#f0f0f0',
      marginTop: '8px',
      borderRadius: '2px'
    });
    
    this.inputContainerElement.appendChild(hipaaNotice);
  }
  
  /**
   * Handle input events
   * @param {Event} e - Input event
   */
  handleInput(e) {
    if (!this.textareaElement) return;
    
    const text = this.textareaElement.value.trim();
    
    // Update character count
    if (this.characterCountElement) {
      this.characterCountElement.textContent = `${text.length}/${this.options.maxLength}`;
      
      // Show warning when approaching limit
      if (text.length > this.options.maxLength * 0.9) {
        this.characterCountElement.style.color = '#f44336';
      } else {
        this.characterCountElement.style.color = '#666';
      }
    }
    
    // Update send button
    if (this.sendButtonElement) {
      if (text.length > 0) {
        this.sendButtonElement.disabled = false;
        this.sendButtonElement.style.opacity = '1';
      } else {
        this.sendButtonElement.disabled = true;
        this.sendButtonElement.style.opacity = '0.7';
      }
    }
    
    // Check for PHI
    this.checkPHI(text);
    
    // Auto-resize textarea
    this.autoResizeTextarea();
  }
  
  /**
   * Check for PHI in message
   * @param {string} text - Message text
   */
  checkPHI(text) {
    if (!this.phiWarningElement || !this.options.showPHIWarning) return;
    
    if (containsPotentialPHI(text)) {
      this.phiWarningElement.style.display = 'block';
    } else {
      this.phiWarningElement.style.display = 'none';
    }
  }
  
  /**
   * Auto-resize textarea based on content
   */
  autoResizeTextarea() {
    if (!this.textareaElement) return;
    
    // Reset height to auto to get proper scrollHeight
    this.textareaElement.style.height = 'auto';
    
    // Set new height based on scrollHeight, with min/max constraints
    const newHeight = Math.min(
      Math.max(this.textareaElement.scrollHeight, 40), // Min height is 40px
      120 // Max height is 120px
    );
    
    this.textareaElement.style.height = `${newHeight}px`;
  }
  
  /**
   * Handle keydown events
   * @param {KeyboardEvent} e - Keydown event
   */
  handleKeyDown(e) {
    // Send on Enter (but allow Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }
  
  /**
   * Handle send button click
   */
  handleSendClick() {
    this.sendMessage();
  }
  
  /**
   * Send the message
   */
  sendMessage() {
    if (!this.textareaElement) return;
    
    const text = this.textareaElement.value.trim();
    if (!text) return;
    
    // Validate message
    const validationResult = validateMessage(text);
    if (!validationResult.success) {
      // Show error message
      alert(validationResult.error);
      return;
    }
    
    // Determine where to send the message
    if (this.options.channelId) {
      // Send to channel
      sendChatMessage(text, this.options.channelId);
    } else if (this.options.userId) {
      // Send as direct message
      sendChatMessage(text, null, this.options.userId);
    } else {
      console.error('[CRM Extension] Cannot send message: no channel ID or user ID specified');
      return;
    }
    
    // Clear input
    this.textareaElement.value = '';
    
    // Reset UI
    if (this.characterCountElement) {
      this.characterCountElement.textContent = `0/${this.options.maxLength}`;
      this.characterCountElement.style.color = '#666';
    }
    
    if (this.phiWarningElement) {
      this.phiWarningElement.style.display = 'none';
    }
    
    if (this.sendButtonElement) {
      this.sendButtonElement.disabled = true;
      this.sendButtonElement.style.opacity = '0.7';
    }
    
    // Resize textarea
    this.autoResizeTextarea();
    
    // Focus textarea
    this.textareaElement.focus();
    
    // Log message sent
    logChatEvent('ui', 'Message sent', {
      channelId: this.options.channelId,
      userId: this.options.userId,
      containsPHI: validationResult.containsPHI
    });
  }
  
  /**
   * Update channel ID
   * @param {string} channelId - New channel ID
   */
  updateChannel(channelId) {
    this.options.channelId = channelId;
    this.options.userId = null; // Clear user ID if channel is set
    
    // Log channel change
    logChatEvent('ui', 'Message input switched to channel', {
      channelId
    });
  }
  
  /**
   * Update user ID for direct messages
   * @param {string} userId - New user ID
   */
  updateDirectMessage(userId) {
    this.options.userId = userId;
    this.options.channelId = null; // Clear channel ID if user is set
    
    // Log direct message change
    logChatEvent('ui', 'Message input switched to direct messages', {
      userId
    });
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
    if (this.textareaElement) {
      this.textareaElement.removeEventListener('input', this.handleInput);
      this.textareaElement.removeEventListener('keydown', this.handleKeyDown);
    }
    
    if (this.sendButtonElement) {
      this.sendButtonElement.removeEventListener('click', this.handleSendClick);
    }
    
    // Remove from DOM
    if (this.inputContainerElement && this.inputContainerElement.parentNode) {
      this.inputContainerElement.parentNode.removeChild(this.inputContainerElement);
    }
    
    // Log destruction
    logChatEvent('ui', 'Message input component destroyed');
  }
}

export default MessageInput;