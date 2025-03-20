// chat/components/admin/users/ResetPasswordModal.js
// Modal for resetting user passwords

import { resetUserPassword } from '../../../services/auth';
import { logChatEvent } from '../../../utils/logger.js';
import { validatePassword } from '../../../utils/validation.js';
import ModalBase from '../../common/ModalBase.js';

/**
 * Reset Password Modal Component
 * Modal for resetting user passwords
 */
class ResetPasswordModal extends ModalBase {
  /**
   * Create a new ResetPasswordModal
   * @param {Object} options - Modal options
   * @param {Object} options.user - User to reset password for
   * @param {Function} options.onSuccess - Success callback
   */
  constructor(options = {}) {
    super({
      title: 'Reset User Password',
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
    
    // Update header style
    if (this.modalElement) {
      const header = this.modalElement.querySelector('.modal-container > div:first-child');
      if (header) {
        header.style.backgroundColor = '#e2f3ff';
        header.style.color = '#0c5460';
        
        const closeButton = header.querySelector('button');
        if (closeButton) {
          closeButton.style.color = '#0c5460';
        }
      }
    }
    
    const userInfo = document.createElement('div');
    this.applyStyles(userInfo, {
      marginBottom: '20px'
    });
    
    const userIcon = document.createElement('div');
    userIcon.textContent = '👤';
    this.applyStyles(userIcon, {
      fontSize: '24px',
      marginBottom: '10px',
      textAlign: 'center'
    });
    
    const userName = document.createElement('div');
    userName.textContent = `User: ${user.username}`;
    this.applyStyles(userName, {
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: '5px'
    });
    
    const userRole = document.createElement('div');
    userRole.textContent = `Role: ${user.role || 'User'}`;
    this.applyStyles(userRole, {
      color: '#6c757d',
      textAlign: 'center'
    });
    
    userInfo.appendChild(userIcon);
    userInfo.appendChild(userName);
    userInfo.appendChild(userRole);
    
    // Form
    const form = document.createElement('form');
    
    // New password
    const newPasswordGroup = this.createFormGroup('newPassword', 'New Password', 'password', '', 'Enter new password');
    form.appendChild(newPasswordGroup);
    
    // Password hint
    const passwordHint = document.createElement('div');
    passwordHint.textContent = 'Password must be at least 8 characters with uppercase, lowercase, and numbers.';
    this.applyStyles(passwordHint, {
      fontSize: '12px',
      color: '#6c757d',
      marginTop: '-10px',
      marginBottom: '15px'
    });
    form.appendChild(passwordHint);
    
    // Confirm password
    const confirmPasswordGroup = this.createFormGroup('confirmPassword', 'Confirm Password', 'password', '', 'Confirm new password');
    form.appendChild(confirmPasswordGroup);
    
    // Error message area
    const errorMessage = document.createElement('div');
    errorMessage.id = 'reset-password-error';
    this.applyStyles(errorMessage, {
      color: '#dc3545',
      marginTop: '15px',
      display: 'none'
    });
    form.appendChild(errorMessage);
    
    // Action buttons
    const actionButtons = document.createElement('div');
    this.applyStyles(actionButtons, {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '30px'
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
    
    const resetButton = document.createElement('button');
    resetButton.type = 'submit';
    resetButton.textContent = 'Reset Password';
    this.applyStyles(resetButton, {
      padding: '8px 16px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    });
    
    actionButtons.appendChild(cancelButton);
    actionButtons.appendChild(resetButton);
    
    form.appendChild(actionButtons);
    
    // Form submission handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Get form data
      const newPassword = form.elements.newPassword.value;
      const confirmPassword = form.elements.confirmPassword.value;
      
      // Validate passwords
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.success) {
        this.showFormError(errorMessage, passwordValidation.error);
        return;
      }
      
      if (newPassword !== confirmPassword) {
        this.showFormError(errorMessage, 'Passwords do not match');
        return;
      }
      
      // Disable form submission
      resetButton.disabled = true;
      resetButton.textContent = 'Resetting...';
      
      try {
        // Call API to reset password
        const result = await resetUserPassword(user.id, newPassword);
        
        if (result.success) {
          // Close modal
          this.close();
          
          // Call success callback
          if (this.options.onSuccess && typeof this.options.onSuccess === 'function') {
            this.options.onSuccess();
          }
          
          // Log password reset
          logChatEvent('admin', 'Reset user password', { 
            username: user.username
          });
        } else {
          this.showFormError(errorMessage, result.error || 'Failed to reset password');
          
          // Re-enable submit button
          resetButton.disabled = false;
          resetButton.textContent = 'Reset Password';
        }
      } catch (error) {
        console.error('[CRM Extension] Error resetting password:', error);
        this.showFormError(errorMessage, 'An error occurred while resetting the password');
        
        // Re-enable submit button
        resetButton.disabled = false;
        resetButton.textContent = 'Reset Password';
      }
    });
    
    content.appendChild(userInfo);
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

export default ResetPasswordModal;