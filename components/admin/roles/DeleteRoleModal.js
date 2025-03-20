// chat/components/admin/roles/DeleteRoleModal.js
// Modal for confirming role deletion

import { deleteRole } from '../../../services/auth';
import { logChatEvent } from '../../../utils/logger.js';
import ModalBase from '../../common/ModalBase.js';

/**
 * Delete Role Modal Component
 * Modal for confirming role deletion
 */
class DeleteRoleModal extends ModalBase {
  /**
   * Create a new DeleteRoleModal
   * @param {Object} options - Modal options
   * @param {Object} options.role - Role to delete
   * @param {Function} options.onSuccess - Success callback
   */
  constructor(options = {}) {
    super({
      title: 'Confirm Role Deletion',
      width: '450px',
      ...options
    });
    
    this.options = {
      role: null,
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
    const role = this.options.role;
    
    if (!role) {
      content.textContent = 'Error: No role provided';
      return content;
    }
    
    // Default roles cannot be deleted
    if (role.isDefault) {
      const errorMessage = document.createElement('p');
      errorMessage.textContent = 'System roles cannot be deleted.';
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
    confirmMessage.innerHTML = `Are you sure you want to delete the role <strong>${role.name}</strong>?`;
    this.applyStyles(confirmMessage, {
      marginBottom: '15px',
      textAlign: 'center'
    });
    
    const userWarning = document.createElement('p');
    userWarning.textContent = role.userCount 
      ? `Warning: There are ${role.userCount} users assigned to this role. These users will need to be reassigned to another role.`
      : 'This role is not currently assigned to any users.';
    
    this.applyStyles(userWarning, {
      marginBottom: '15px',
      textAlign: 'center',
      color: role.userCount ? '#721c24' : '#6c757d',
      fontWeight: role.userCount ? 'bold' : 'normal'
    });
    
    const warningMessage = document.createElement('p');
    warningMessage.textContent = 'This action cannot be undone.';
    this.applyStyles(warningMessage, {
      color: '#721c24',
      marginBottom: '20px',
      textAlign: 'center',
      fontWeight: 'bold'
    });
    
    content.appendChild(warningIcon);
    content.appendChild(confirmMessage);
    content.appendChild(userWarning);
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
    deleteButton.textContent = 'Delete Role';
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
        const result = await deleteRole(role.id);
        
        if (result.success) {
          // Close modal
          this.close();
          
          // Call success callback
          if (this.options.onSuccess && typeof this.options.onSuccess === 'function') {
            this.options.onSuccess();
          }
          
          // Log role deletion
          logChatEvent('admin', 'Deleted role', { 
            roleName: role.name,
            roleId: role.id
          });
        } else {
          // Show error
          warningMessage.textContent = result.error || 'Failed to delete role';
          
          // Re-enable button
          deleteButton.disabled = false;
          deleteButton.textContent = 'Delete Role';
        }
      } catch (error) {
        console.error('[CRM Extension] Error deleting role:', error);
        warningMessage.textContent = 'An error occurred while deleting the role';
        
        // Re-enable button
        deleteButton.disabled = false;
        deleteButton.textContent = 'Delete Role';
      }
    });
    
    actionButtons.appendChild(cancelButton);
    actionButtons.appendChild(deleteButton);
    content.appendChild(actionButtons);
    
    return content;
  }
}

export default DeleteRoleModal;