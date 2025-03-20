// chat/components/admin/users/EditUserModal.js
// Modal for editing existing users

import { updateUser, updateUserRole, getCurrentUser } from '../../../services/auth';
import { logChatEvent } from '../../../utils/logger.js';
import { validateEmail } from '../../../utils/validation.js';
import ModalBase from '../../common/ModalBase.js';

/**
 * Edit User Modal Component
 * Modal for editing existing users
 */
class EditUserModal extends ModalBase {
  /**
   * Create a new EditUserModal
   * @param {Object} options - Modal options
   * @param {Object} options.user - User to edit
   * @param {Function} options.onSuccess - Success callback
   */
  constructor(options = {}) {
    super({
      title: `Edit User: ${options.user?.username || 'User'}`,
      width: '500px',
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
    
    // Create form
    const form = document.createElement('form');
    form.id = 'edit-user-form';
    
    // Username (readonly)
    const usernameGroup = this.createFormGroup('username', 'Username', 'text', user.username, '');
    const usernameInput = usernameGroup.querySelector('input');
    usernameInput.readOnly = true;
    usernameInput.style.backgroundColor = '#f8f9fa';
    form.appendChild(usernameGroup);
    
    // Display name field
    const displayNameGroup = this.createFormGroup('displayName', 'Display Name', 'text', user.displayName || '', 'Enter display name');
    form.appendChild(displayNameGroup);
    
    // Email field
    const emailGroup = this.createFormGroup('email', 'Email Address', 'email', user.email || '', 'Enter email address');
    form.appendChild(emailGroup);
    
    // Role selection (if not editing self)
    const currentUser = getCurrentUser();
    if (currentUser && user.id !== currentUser.id) {
      const roleGroup = document.createElement('div');
      this.applyStyles(roleGroup, {
        marginBottom: '15px'
      });
      
      const roleLabel = document.createElement('label');
      roleLabel.textContent = 'Role';
      roleLabel.htmlFor = 'user-role';
      this.applyStyles(roleLabel, {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold'
      });
      
      const roleSelect = document.createElement('select');
      roleSelect.id = 'user-role';
      roleSelect.name = 'role';
      this.applyStyles(roleSelect, {
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        boxSizing: 'border-box'
      });
      
      const roleOptions = [
        { value: 'user', label: 'Regular User' },
        { value: 'moderator', label: 'Moderator' },
        { value: 'admin', label: 'Administrator' }
      ];
      
      roleOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        optionElement.selected = user.role === option.value;
        roleSelect.appendChild(optionElement);
      });
      
      roleGroup.appendChild(roleLabel);
      roleGroup.appendChild(roleSelect);
      form.appendChild(roleGroup);
    }
    
    // Error message area
    const errorMessage = document.createElement('div');
    errorMessage.id = 'edit-user-error';
    this.applyStyles(errorMessage, {
      color: '#dc3545',
      marginBottom: '15px',
      display: 'none'
    });
    form.appendChild(errorMessage);
    
    // Form actions
    const formActions = document.createElement('div');
    this.applyStyles(formActions, {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '20px'
    });
    
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
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
    
    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.textContent = 'Save Changes';
    this.applyStyles(saveButton, {
      padding: '8px 16px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    });
    
    formActions.appendChild(cancelButton);
    formActions.appendChild(saveButton);
    form.appendChild(formActions);
    
    // Form submission handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Get form data
      const formData = new FormData(form);
      const userData = {
        displayName: formData.get('displayName'),
        email: formData.get('email'),
        role: formData.get('role') || user.role
      };
      
      // Validate email if provided
      if (userData.email) {
        const emailValidation = validateEmail(userData.email);
        if (!emailValidation.success) {
          this.showFormError(errorMessage, emailValidation.error);
          return;
        }
      }
      
      // Disable form submission
      saveButton.disabled = true;
      saveButton.textContent = 'Saving...';
      
      try {
        // Different handling based on whether editing self or other user
        let result;
        
        if (currentUser && user.id === currentUser.id) {
          // Editing self - use updateUserProfile
          result = await updateUser(user.id, userData);
        } else {
          // Editing another user - use admin update
          result = await updateUser(user.id, userData);
          
          // If role change was requested, also update role
          if (userData.role && userData.role !== user.role) {
            const roleResult = await updateUserRole(user.id, userData.role);
            if (!roleResult.success) {
              this.showFormError(errorMessage, roleResult.error || 'Failed to update user role');
              
              // Re-enable submit button
              saveButton.disabled = false;
              saveButton.textContent = 'Save Changes';
              return;
            }
          }
        }
        
        if (result.success) {
          // Close modal
          this.close();
          
          // Call success callback
          if (this.options.onSuccess && typeof this.options.onSuccess === 'function') {
            this.options.onSuccess(result.user);
          }
          
          // Log user update
          logChatEvent('admin', 'Updated user', { 
            username: user.username
          });
        } else {
          this.showFormError(errorMessage, result.error || 'Failed to update user');
          
          // Re-enable submit button
          saveButton.disabled = false;
          saveButton.textContent = 'Save Changes';
        }
      } catch (error) {
        console.error('[CRM Extension] Error updating user:', error);
        this.showFormError(errorMessage, 'An error occurred while updating the user');
        
        // Re-enable submit button
        saveButton.disabled = false;
        saveButton.textContent = 'Save Changes';
      }
    });
    
    content.appendChild(form);
    return content;
  }
  
  /**
   * Create a form input group
   * @param {string} id - Input ID
   * @param {string} label - Input label
   * @param {string} type - Input type
   * @param {string} value - Input value
   * @param {string} placeholder - Input placeholder
   * @returns {HTMLElement} Form group element
   */
  createFormGroup(id, label, type, value, placeholder) {
    const group = document.createElement('div');
    this.applyStyles(group, {
      marginBottom: '15px'
    });
    
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.htmlFor = id;
    this.applyStyles(labelElement, {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 'bold'
    });
    
    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.name = id;
    input.value = value;
    input.placeholder = placeholder;
    this.applyStyles(input, {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      boxSizing: 'border-box'
    });
    
    group.appendChild(labelElement);
    group.appendChild(input);
    
    return group;
  }
  
  /**
   * Show error message in form
   * @param {HTMLElement} errorElement - Error message element
   * @param {string} message - Error message
   */
  showFormError(errorElement, message) {
    if (!errorElement) return;
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Automatically hide after 5 seconds
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  }
}

export default EditUserModal;