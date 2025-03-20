// chat/components/admin/channels/DeleteChannelModal.js
// Modal for confirming channel deletion

import { deleteChannel } from '../../../services/channelService.js';
import { logChatEvent } from '../../../utils/logger.js';
import ModalBase from '../../common/ModalBase.js';

/**
 * Delete Channel Modal Component
 * Modal for confirming channel deletion
 */
class DeleteChannelModal extends ModalBase {
  /**
   * Create a new DeleteChannelModal
   * @param {Object} options - Modal options
   * @param {Object} options.channel - Channel to delete
   * @param {Function} options.onSuccess - Success callback
   */
  constructor(options = {}) {
    super({
      title: 'Confirm Channel Deletion',
      width: '450px',
      ...options
    });
    
    this.options = {
      channel: null,
      onSuccess: () => {},
      ...options
    };
  }
  
  /**
   * Render the modal content
   * @returns {HTMLElement} Modal content
   */
  renderContent() {
    const content = document.createElement('div');
    const channel = this.options.channel;
    
    if (!channel) {
      content.textContent = 'Error: No channel provided';
      return content;
    }
    
    // Default channels cannot be deleted
    if (channel.id === 'general' || channel.id === 'announcements') {
      const errorMessage = document.createElement('p');
      errorMessage.textContent = 'System channels cannot be deleted.';
      this.applyStyles(errorMessage, {
        color: '#721c24',
        padding: '10px',
        backgroundColor: '#f8d7da',
        borderRadius: '4px',
        textAlign: 'center'
      });
      
      content.appendChild(errorMessage);
      
      // Add close button
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Close';
      this.applyStyles(closeButton, {
        marginTop: '15px',
        padding: '8px 16px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'block',
        margin: '20px auto 0'
      });
      
      closeButton.addEventListener('click', () => {
        this.close();
      });
      
      content.appendChild(closeButton);
      return content;
    }
    
    // Update header style to danger
    if (this.modalElement) {
      const header = this.modalElement.querySelector('.modal-container > div:first-child');
      if (header) {
        header.style.backgroundColor = '#f8d7da';
        header.style.color = '#721c24';
        
        const closeButton = header.querySelector('button');
        if (closeButton) {
          closeButton.style.color = '#721c24';
        }
      }
    }
    
    const warningIcon = document.createElement('div');
    warningIcon.textContent = '⚠️';
    this.applyStyles(warningIcon, {
      fontSize: '48px',
      textAlign: 'center',
      marginBottom: '20px'
    });
    
    const confirmMessage = document.createElement('p');
    confirmMessage.innerHTML = `Are you sure you want to delete the channel <strong>${channel.name}</strong>?`;
    this.applyStyles(confirmMessage, {
      marginBottom: '15px',
      textAlign: 'center'
    });
    
    const warningMessage = document.createElement('p');
    warningMessage.textContent = 'This action cannot be undone. All channel messages will be permanently removed.';
    this.applyStyles(warningMessage, {
      color: '#721c24',
      marginBottom: '20px',
      textAlign: 'center',
      fontWeight: 'bold'
    });
    
    content.appendChild(warningIcon);
    content.appendChild(confirmMessage);
    content.appendChild(warningMessage);
    
    // Action buttons
    const actionButtons = document.createElement('div');
    this.applyStyles(actionButtons, {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '30px'
    });
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    this.applyStyles(cancelButton, {
      padding: '8px 16px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      cursor: 'pointer'
    });
    
    cancelButton.addEventListener('click', () => {
      this.close();
    });
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete Channel';
    this.applyStyles(deleteButton, {
      padding: '8px 16px',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    });
    
    deleteButton.addEventListener('click', async () => {
      // Disable button
      deleteButton.disabled = true;
      deleteButton.textContent = 'Deleting...';
      
      try {
        const result = await deleteChannel(channel.id);
        
        if (result.success) {
          // Close modal
          this.close();
          
          // Call success callback
          if (this.options.onSuccess && typeof this.options.onSuccess === 'function') {
            this.options.onSuccess();
          }
          
          // Log channel deletion
          logChatEvent('admin', 'Deleted channel', { 
            name: channel.name,
            id: channel.id
          });
        } else {
          // Show error
          warningMessage.textContent = result.error || 'Failed to delete channel';
          
          // Re-enable button
          deleteButton.disabled = false;
          deleteButton.textContent = 'Delete Channel';
        }
      } catch (error) {
        console.error('[CRM Extension] Error deleting channel:', error);
        warningMessage.textContent = 'An error occurred while deleting the channel';
        
        // Re-enable button
        deleteButton.disabled = false;
        deleteButton.textContent = 'Delete Channel';
      }
    });
    
    actionButtons.appendChild(cancelButton);
    actionButtons.appendChild(deleteButton);
    content.appendChild(actionButtons);
    
    return content;
  }
}

export default DeleteChannelModal;