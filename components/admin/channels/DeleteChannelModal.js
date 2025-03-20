// chat/components/admin/channels/DeleteChannelModal.js
// Delete channel confirmation modal component for HIPAA-compliant chat

import ModalBase from '../../common/ModalBase.js';
import authContext from '../../../contexts/AuthContext.js';
import { logChatEvent } from '../../../utils/logger.js';
import { handleError, ErrorCategory, ErrorCode } from '../../../utils/error-handler.js';

/**
 * Delete Channel Modal Component
 * Modal dialog for confirming channel deletion
 */
class DeleteChannelModal extends ModalBase {
  /**
   * Create a new DeleteChannelModal
   * @param {Object} options - Modal options
   * @param {Function} options.onSubmit - Submit handler function
   */
  constructor(options = {}) {
    // Configure base modal
    super({
      title: 'Delete Channel',
      width: '450px',
      className: 'delete-channel-modal',
      closeOnOverlayClick: true,
      closeOnEscape: true,
      ...options
    });
    
    // Additional options
    this.options = {
      onSubmit: async () => true,
      ...options
    };
    
    // Current channel data
    this.currentChannel = null;
    
    // Form state
    this.formState = {
      confirmText: '',
      deleteMessages: true,
      isSubmitting: false,
      error: null
    };
    
    // Form elements
    this.formElement = null;
    this.confirmInput = null;
    this.deleteMessagesToggle = null;
    this.errorContainer = null;
    this.confirmButton = null;
    this.cancelButton = null;
    
    // Bind methods
    this.renderContent = this.renderContent.bind(this);
    this.renderFooter = this.renderFooter.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleConfirmInputChange = this.handleConfirmInputChange.bind(this);
    this.handleDeleteMessagesChange = this.handleDeleteMessagesChange.bind(this);
    this.setChannel = this.setChannel.bind(this);
    this.updateConfirmButton = this.updateConfirmButton.bind(this);
    this.showError = this.showError.bind(this);
  }
  
  /**
   * Render modal content
   * @returns {HTMLElement} Modal content
   */
  renderContent() {
    try {
      // Create container
      const container = document.createElement('div');
      
      // Show message if no channel is selected
      if (!this.currentChannel) {
        const noChannelMessage = document.createElement('div');
        noChannelMessage.textContent = 'No channel selected.';
        this.applyStyles(noChannelMessage, {
          textAlign: 'center',
          color: '#666'
        });
        container.appendChild(noChannelMessage);
        return container;
      }
      
      // Create form element
      this.formElement = document.createElement('form');
      this.formElement.className = 'delete-channel-form';
      this.formElement.addEventListener('submit', this.handleSubmit);
      
      // Create form error container
      this.errorContainer = document.createElement('div');
      this.errorContainer.className = 'form-error-container';
      this.applyStyles(this.errorContainer, {
        color: '#f44336',
        backgroundColor: '#ffebee',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '16px',
        display: 'none'
      });
      this.formElement.appendChild(this.errorContainer);
      
      // Warning message
      const warningContainer = document.createElement('div');
      warningContainer.className = 'warning-container';
      this.applyStyles(warningContainer, {
        backgroundColor: '#fff3e0',
        padding: '12px',
        borderRadius: '4px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      });
      
      // Warning icon
      const warningIcon = document.createElement('div');
      warningIcon.innerHTML = '⚠️';
      this.applyStyles(warningIcon, {
        fontSize: '24px',
        lineHeight: '1'
      });
      warningContainer.appendChild(warningIcon);
      
      // Warning text
      const warningText = document.createElement('div');
      
      // Bold message part
      const boldWarning = document.createElement('div');
      boldWarning.textContent = 'This action cannot be undone.';
      this.applyStyles(boldWarning, {
        fontWeight: 'bold',
        marginBottom: '8px',
        color: '#e65100'
      });
      warningText.appendChild(boldWarning);
      
      // Regular message part
      const warningDetails = document.createElement('div');
      warningDetails.innerHTML = `You are about to delete the channel <strong>${this.currentChannel.name}</strong>. This will remove the channel and potentially all its messages from the system.`;
      warningText.appendChild(warningDetails);
      
      // Add additional warning for channels with messages
      if (this.currentChannel.messageCount > 0) {
        const messageWarning = document.createElement('div');
        messageWarning.innerHTML = `<strong>This channel contains ${this.currentChannel.messageCount} messages</strong> that may include important patient information.`;
        this.applyStyles(messageWarning, {
          marginTop: '8px',
          color: '#d32f2f'
        });
        warningText.appendChild(messageWarning);
      }
      
      warningContainer.appendChild(warningText);
      this.formElement.appendChild(warningContainer);
      
      // Channel information
      const infoContainer = document.createElement('div');
      this.applyStyles(infoContainer, {
        marginBottom: '16px'
      });
      
      // Channel heading
      const channelHeading = document.createElement('h4');
      channelHeading.textContent = 'Channel Information';
      this.applyStyles(channelHeading, {
        margin: '0 0 8px 0',
        fontSize: '14px'
      });
      infoContainer.appendChild(channelHeading);
      
      // Channel details
      const detailsList = document.createElement('ul');
      this.applyStyles(detailsList, {
        margin: '0',
        padding: '0 0 0 20px'
      });
      
      // ID
      const idItem = document.createElement('li');
      idItem.innerHTML = `<strong>ID:</strong> ${this.currentChannel.id}`;
      detailsList.appendChild(idItem);
      
      // Type
      const typeItem = document.createElement('li');
      typeItem.innerHTML = `<strong>Type:</strong> ${this.currentChannel.isPublic ? 'Public' : 'Private'}`;
      detailsList.appendChild(typeItem);
      
      // Created
      const createdItem = document.createElement('li');
      const createdDate = new Date(this.currentChannel.createdAt).toLocaleString();
      createdItem.innerHTML = `<strong>Created:</strong> ${createdDate}`;
      detailsList.appendChild(createdItem);
      
      // Members
      const membersItem = document.createElement('li');
      membersItem.innerHTML = `<strong>Members:</strong> ${this.currentChannel.memberCount || 0}`;
      detailsList.appendChild(membersItem);
      
      // Messages
      const messagesItem = document.createElement('li');
      messagesItem.innerHTML = `<strong>Messages:</strong> ${this.currentChannel.messageCount || 0}`;
      detailsList.appendChild(messagesItem);
      
      infoContainer.appendChild(detailsList);
      this.formElement.appendChild(infoContainer);
      
      // Options
      if (this.currentChannel.messageCount > 0) {
        const optionsContainer = document.createElement('div');
        this.applyStyles(optionsContainer, {
          marginBottom: '16px'
        });
        
        // Delete messages toggle
        const deleteMessagesGroup = document.createElement('div');
        this.applyStyles(deleteMessagesGroup, {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '8px 0'
        });
        
        this.deleteMessagesToggle = document.createElement('input');
        this.deleteMessagesToggle.type = 'checkbox';
        this.deleteMessagesToggle.id = 'delete-messages';
        this.deleteMessagesToggle.checked = this.formState.deleteMessages;
        this.deleteMessagesToggle.addEventListener('change', this.handleDeleteMessagesChange);
        
        const deleteMessagesLabel = document.createElement('label');
        deleteMessagesLabel.htmlFor = 'delete-messages';
        deleteMessagesLabel.textContent = 'Delete all channel messages';
        
        deleteMessagesGroup.appendChild(this.deleteMessagesToggle);
        deleteMessagesGroup.appendChild(deleteMessagesLabel);
        
        // Message about deletion
        const messageNote = document.createElement('div');
        messageNote.innerHTML = 'If unchecked, messages will be archived but will remain accessible through the audit log. HIPAA audit logs must be retained for at least 6 years.';
        this.applyStyles(messageNote, {
          fontSize: '12px',
          color: '#666',
          marginLeft: '24px'
        });
        
        optionsContainer.appendChild(deleteMessagesGroup);
        optionsContainer.appendChild(messageNote);
        this.formElement.appendChild(optionsContainer);
      }
      
      // Confirmation input
      const confirmGroup = document.createElement('div');
      this.applyStyles(confirmGroup, {
        marginBottom: '16px'
      });
      
      const confirmLabel = document.createElement('label');
      confirmLabel.htmlFor = 'confirm-text';
      confirmLabel.textContent = `Type "${this.currentChannel.name}" to confirm deletion:`;
      this.applyStyles(confirmLabel, {
        display: 'block',
        marginBottom: '8px',
        fontWeight: 'bold'
      });
      confirmGroup.appendChild(confirmLabel);
      
      this.confirmInput = document.createElement('input');
      this.confirmInput.type = 'text';
      this.confirmInput.id = 'confirm-text';
      this.confirmInput.className = 'confirm-input';
      this.confirmInput.placeholder = this.currentChannel.name;
      this.confirmInput.value = this.formState.confirmText;
      this.confirmInput.addEventListener('input', this.handleConfirmInputChange);
      this.applyStyles(this.confirmInput, {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box'
      });
      confirmGroup.appendChild(this.confirmInput);
      
      this.formElement.appendChild(confirmGroup);
      
      // HIPAA notice
      const hipaaNotice = document.createElement('div');
      hipaaNotice.className = 'hipaa-notice';
      this.applyStyles(hipaaNotice, {
        backgroundColor: '#e8f5e9',
        color: '#2e7d32',
        padding: '10px',
        borderRadius: '4px',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      });
      
      const noticeIcon = document.createElement('span');
      noticeIcon.textContent = '🔒';
      hipaaNotice.appendChild(noticeIcon);
      
      const noticeText = document.createElement('span');
      noticeText.textContent = 'This action will be logged in the HIPAA audit log with your user information.';
      hipaaNotice.appendChild(noticeText);
      
      this.formElement.appendChild(hipaaNotice);
      
      container.appendChild(this.formElement);
      return container;
    } catch (error) {
      handleError(error, {
        code: ErrorCode.COMPONENT_FAILED,
        category: ErrorCategory.UI,
        source: 'DeleteChannelModal',
        message: 'Failed to render delete channel form'
      });
      
      // Return error message element
      const errorElement = document.createElement('div');
      errorElement.className = 'modal-error';
      errorElement.textContent = 'Error: Could not render the deletion confirmation form.';
      this.applyStyles(errorElement, {
        color: '#f44336',
        padding: '16px',
        textAlign: 'center'
      });
      
      return errorElement;
    }
  }
  
  /**
   * Render modal footer
   * @returns {HTMLElement} Modal footer
   */
  renderFooter() {
    const footerContainer = document.createElement('div');
    footerContainer.className = 'modal-footer-container';
    this.applyStyles(footerContainer, {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '8px'
    });
    
    // Cancel button
    this.cancelButton = document.createElement('button');
    this.cancelButton.type = 'button';
    this.cancelButton.textContent = 'Cancel';
    this.cancelButton.className = 'cancel-button';
    this.applyStyles(this.cancelButton, {
      padding: '8px 16px',
      backgroundColor: '#f5f5f5',
      color: '#333',
      border: '1px solid #ddd',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold'
    });
    
    // Add hover effect
    this.cancelButton.addEventListener('mouseover', () => {
      this.cancelButton.style.backgroundColor = '#e0e0e0';
    });
    
    this.cancelButton.addEventListener('mouseout', () => {
      this.cancelButton.style.backgroundColor = '#f5f5f5';
    });
    
    // Add click event
    this.cancelButton.addEventListener('click', () => {
      this.close();
    });
    
    // Delete button
    this.confirmButton = document.createElement('button');
    this.confirmButton.type = 'submit';
    this.confirmButton.textContent = 'Delete Channel';
    this.confirmButton.className = 'confirm-button';
    this.confirmButton.disabled = true; // Disabled by default until confirmation text matches
    this.applyStyles(this.confirmButton, {
      padding: '8px 16px',
      backgroundColor: '#f44336',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'not-allowed',
      fontWeight: 'bold',
      opacity: '0.6'
    });
    
    // Add hover effect
    this.confirmButton.addEventListener('mouseover', () => {
      if (!this.confirmButton.disabled) {
        this.confirmButton.style.backgroundColor = '#d32f2f';
      }
    });
    
    this.confirmButton.addEventListener('mouseout', () => {
      if (!this.confirmButton.disabled) {
        this.confirmButton.style.backgroundColor = '#f44336';
      }
    });
    
    // Add buttons to footer
    footerContainer.appendChild(this.cancelButton);
    footerContainer.appendChild(this.confirmButton);
    
    return footerContainer;
  }
  
  /**
   * Set the channel to delete
   * @param {Object} channel - Channel object
   */
  setChannel(channel) {
    this.currentChannel = channel;
    
    // Reset form state
    this.formState = {
      confirmText: '',
      deleteMessages: true,
      isSubmitting: false,
      error: null
    };
    
    // Update modal title
    this.setTitle(`Delete Channel: ${channel.name}`);
  }
  
  /**
   * Handle confirm input change
   * @param {Event} e - Input event
   */
  handleConfirmInputChange(e) {
    this.formState.confirmText = e.target.value;
    this.updateConfirmButton();
  }
  
  /**
   * Handle delete messages toggle change
   * @param {Event} e - Change event
   */
  handleDeleteMessagesChange(e) {
    this.formState.deleteMessages = e.target.checked;
  }
  
  /**
   * Update confirm button based on confirmation text
   */
  updateConfirmButton() {
    if (!this.confirmButton || !this.currentChannel) return;
    
    const isConfirmed = this.formState.confirmText === this.currentChannel.name;
    const isDisabled = !isConfirmed || this.formState.isSubmitting;
    
    this.confirmButton.disabled = isDisabled;
    this.confirmButton.style.opacity = isDisabled ? '0.6' : '1';
    this.confirmButton.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
    
    // Update button text based on state
    this.confirmButton.textContent = this.formState.isSubmitting ? 'Deleting...' : 'Delete Channel';
  }
  
  /**
   * Handle form submission
   * @param {Event} e - Submit event
   */
  async handleSubmit(e) {
    e.preventDefault();
    
    try {
      // Verify channel is set
      if (!this.currentChannel) {
        this.showError('No channel selected');
        return;
      }
      
      // Verify confirmation text
      if (this.formState.confirmText !== this.currentChannel.name) {
        this.showError('Confirmation text does not match channel name');
        return;
      }
      
      // Update submitting state
      this.formState.isSubmitting = true;
      this.updateConfirmButton();
      
      // Call onSubmit with channel ID and options
      const result = await this.options.onSubmit(this.currentChannel.id, {
        deleteMessages: this.formState.deleteMessages
      });
      
      if (result) {
        // Log successful deletion
        logChatEvent('admin', 'Channel deleted', {
          channelId: this.currentChannel.id,
          channelName: this.currentChannel.name,
          deleteMessages: this.formState.deleteMessages
        });
        
        // Close modal
        this.close();
      } else {
        // Show generic error
        this.showError('Failed to delete channel. Please try again.');
      }
    } catch (error) {
      handleError(error, {
        code: ErrorCode.API_REQUEST_FAILED,
        category: ErrorCategory.DATA,
        source: 'DeleteChannelModal',
        message: 'Failed to delete channel'
      });
      
      // Show error message
      this.showError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      // Reset submitting state
      this.formState.isSubmitting = false;
      this.updateConfirmButton();
    }
  }
  
  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    if (!this.errorContainer) return;
    
    this.errorContainer.textContent = message;
    this.errorContainer.style.display = 'block';
    
    // Scroll to top to show error
    if (this.formElement) {
      this.formElement.scrollTop = 0;
    }
  }
  
  /**
   * Show the modal
   */
  show() {
    // Verify we have a channel set
    if (!this.currentChannel) {
      console.error('Cannot show delete modal: No channel set');
      return;
    }
    
    // Reset form state
    this.formState = {
      confirmText: '',
      deleteMessages: true,
      isSubmitting: false,
      error: null
    };
    
    // Call parent show method
    super.show();
    
    // Focus confirm input
    if (this.confirmInput) {
      this.confirmInput.focus();
    }
  }
}

export default DeleteChannelModal;