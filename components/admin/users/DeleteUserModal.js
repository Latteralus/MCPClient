// chat/components/admin/users/DeleteUserModal.js
// Modal for confirming user deletion

import { deleteUser } from '../../../services/auth';
import { logChatEvent } from '../../../utils/logger.js';
import ModalBase from '../../common/ModalBase.js';

/**
 * Delete User Modal Component
 * Modal for confirming user deletion
 */
class DeleteUserModal extends ModalBase {
  /**
   * Create a new DeleteUserModal
   * @param {Object} options - Modal options
   * @param {Object} options.user - User to delete
   * @param {Function} options.onSuccess - Success callback
   */
  constructor(options = {}) {
    super({
      title: 'Confirm User Deletion',
      width: '450px',
      ...options
    });
    
    this.options = {
      user: null,
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
    const user = this.options.user;
    
    if (!user) {
      content.textContent = 'Error: No user provided';
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
    confirmMessage.innerHTML = `Are you sure you want to delete the user <strong>${user.username}</strong>?`;
    this.applyStyles(confirmMessage, {
      marginBottom: '15px',
      textAlign: 'center'
    });
    
    const warningMessage = document.createElement('p');
    warningMessage.textContent = 'This action cannot be undone. All user data will be permanently removed.';
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
    deleteButton.textContent = 'Delete User';
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
        const result = await deleteUser(user.id);
        
        if (result.success) {
          // Close modal
          this.close();
          
          // Call success callback
          if (this.options.onSuccess && typeof this.options.onSuccess === 'function') {
            this.options.onSuccess();
          }
          
          // Log user deletion
          logChatEvent('admin', 'Deleted user', { username: user.username });
        } else {
          // Show error
          warningMessage.textContent = result.error || 'Failed to delete user';
          
          // Re-enable button
          deleteButton.disabled = false;
          deleteButton.textContent = 'Delete User';
        }
      } catch (error) {
        console.error('[CRM Extension] Error deleting user:', error);
        warningMessage.textContent = 'An error occurred while deleting the user';
        
        // Re-enable button
        deleteButton.disabled = false;
        deleteButton.textContent = 'Delete User';
      }
    });
    
    actionButtons.appendChild(cancelButton);
    actionButtons.appendChild(deleteButton);
    content.appendChild(actionButtons);
    
    return content;
  }
}

export default DeleteUserModal;