// chat/components/admin/users/EditUserModal.js
// Edit user modal component for HIPAA-compliant chat

import { logChatEvent } from '../../../utils/logger.js';
import { handleError, ErrorCategory, ErrorCode } from '../../../utils/error-handler.js';
import { validateUsername, validateEmail } from '../../../utils/validation.js';
import ModalBase from '../../common/ModalBase.js';
import authContext from '../../../contexts/AuthContext.js';

/**
 * EditUserModal Component
 * Modal for editing existing user accounts
 * @extends ModalBase
 */
class EditUserModal extends ModalBase {
  /**
   * Create a new EditUserModal
   * @param {Object} options - Modal options
   * @param {Function} options.onUserUpdated - Callback for when a user is updated
   */
  constructor(options = {}) {
    super({
      title: 'Edit User',
      width: '500px',
      closeOnOverlayClick: false,
      closeOnEscape: true,
      onClose: options.onClose,
      ...options
    });
    
    this.options = {
      onUserUpdated: () => {},
      ...options
    };
    
    // User data
    this.userId = null;
    this.originalData = null;
    
    // Form data
    this.formData = {
      username: '',
      displayName: '',
      email: '',
      role: 'user',
      status: 'active'
    };
    
    // Form errors
    this.formErrors = {};
    
    // DOM elements
    this.form = null;
    this.submitButton = null;
    this.cancelButton = null;
    this.errorContainer = null;
    
    // Form fields
    this.fields = {};
    
    // State
    this.isSubmitting = false;
    
    // Available roles
    this.availableRoles = [
      { value: 'user', label: 'User' },
      { value: 'moderator', label: 'Moderator' }
    ];
    
    // Add admin role if user has admin permissions
    if (authContext.hasPermission('admin.grant')) {
      this.availableRoles.unshift({ value: 'admin', label: 'Administrator' });
    }
    
    // Available statuses
    this.availableStatuses = [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'suspended', label: 'Suspended' }
    ];
    
    // Bind methods
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.validateForm = this.validateForm.bind(this);
    this.updateUser = this.updateUser.bind(this);
    this.showFieldError = this.showFieldError.bind(this);
    this.clearFieldError = this.clearFieldError.bind(this);
    this.resetForm = this.resetForm.bind(this);
    this.setUser = this.setUser.bind(this);
  }
  
  /**
   * Set user data for editing
   * @param {Object} user - User data
   */
  setUser(user) {
    if (!user || !user.id) {
      console.error('[EditUserModal] Invalid user data');
      return;
    }
    
    // Store user ID and original data
    this.userId = user.id;
    this.originalData = { ...user };
    
    // Update form data
    this.formData = {
      username: user.username || '',
      displayName: user.displayName || '',
      email: user.email || '',
      role: user.role || 'user',
      status: user.status || 'active'
    };
    
    // Update modal title
    this.setTitle(`Edit User: ${user.username}`);
    
    // Update form fields if form is already rendered
    this.updateFormFields();
  }
  
  /**
   * Update form fields with current data
   */
  updateFormFields() {
    if (!this.fields) return;
    
    // Update each field with current value
    Object.keys(this.formData).forEach(fieldName => {
      const field = this.fields[fieldName];
      if (field && field.input) {
        field.input.value = this.formData[fieldName];
      }
    });
  }
  
  /**
   * Render the modal content
   * @returns {HTMLElement} Modal content
   */
  renderContent() {
    try {
      // Create container
      const container = document.createElement('div');
      container.className = 'edit-user-container';
      
      // Create error container
      this.errorContainer = document.createElement('div');
      this.errorContainer.className = 'form-error-container';
      this.errorContainer.style.display = 'none';
      
      this.applyStyles(this.errorContainer, {
        backgroundColor: '#ffebee',
        color: '#c62828',
        padding: '12px 16px',
        borderRadius: '4px',
        marginBottom: '16px',
        fontSize: '14px',
        display: 'none'
      });
      
      container.appendChild(this.errorContainer);
      
      // Create form
      this.form = document.createElement('form');
      this.form.className = 'edit-user-form';
      this.form.id = 'edit-user-form';
      
      this.form.addEventListener('submit', this.handleSubmit);
      
      // Username field
      const usernameField = this.createFormField({
        name: 'username',
        label: 'Username',
        type: 'text',
        placeholder: 'Enter username',
        required: true,
        defaultValue: this.formData.username,
        description: 'Username must be 3-20 characters, containing only letters, numbers, underscores, and hyphens.'
      });
      
      // Display name field
      const displayNameField = this.createFormField({
        name: 'displayName',
        label: 'Display Name',
        type: 'text',
        placeholder: 'Enter display name',
        required: false,
        defaultValue: this.formData.displayName,
        description: 'Optional name to display instead of username'
      });
      
      // Email field
      const emailField = this.createFormField({
        name: 'email',
        label: 'Email',
        type: 'email',
        placeholder: 'Enter email address',
        required: true,
        defaultValue: this.formData.email,
        description: 'User\'s email address for notifications and password recovery'
      });
      
      // Role field
      const roleField = this.createSelectField({
        name: 'role',
        label: 'User Role',
        options: this.availableRoles,
        defaultValue: this.formData.role,
        description: 'Role determines the user\'s permissions in the system'
      });
      
      // Status field
      const statusField = this.createSelectField({
        name: 'status',
        label: 'Account Status',
        options: this.availableStatuses,
        defaultValue: this.formData.status,
        description: 'Sets the account status. Inactive users cannot log in.'
      });
      
      // Add fields to form
      this.form.appendChild(usernameField);
      this.form.appendChild(displayNameField);
      this.form.appendChild(emailField);
      this.form.appendChild(roleField);
      this.form.appendChild(statusField);
      
      // Add form to container
      container.appendChild(this.form);
      
      return container;
    } catch (error) {
      handleError(error, {
        code: ErrorCode.RENDER_ERROR,
        category: ErrorCategory.UI,
        source: 'EditUserModal',
        message: 'Failed to render edit user modal content'
      });
      
      // Return basic error content
      const errorContent = document.createElement('div');
      errorContent.textContent = 'Error rendering form. Please try again.';
      return errorContent;
    }
  }
  
  /**
   * Render the modal footer
   * @returns {HTMLElement} Modal footer
   */
  renderFooter() {
    // Create footer container
    const footerContainer = document.createElement('div');
    footerContainer.className = 'modal-footer-buttons';
    
    this.applyStyles(footerContainer, {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px'
    });
    
    // Cancel button
    this.cancelButton = document.createElement('button');
    this.cancelButton.type = 'button';
    this.cancelButton.className = 'cancel-button';
    this.cancelButton.textContent = 'Cancel';
    
    this.applyStyles(this.cancelButton, {
      padding: '8px 16px',
      backgroundColor: '#f5f5f5',
      color: '#333',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      cursor: 'pointer'
    });
    
    this.cancelButton.addEventListener('click', () => {
      this.close();
    });
    
    // Submit button
    this.submitButton = document.createElement('button');
    this.submitButton.type = 'submit';
    this.submitButton.className = 'submit-button';
    this.submitButton.textContent = 'Save Changes';
    this.submitButton.form = 'edit-user-form';
    
    this.applyStyles(this.submitButton, {
      padding: '8px 16px',
      backgroundColor: '#2196F3',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer'
    });
    
    // Add buttons to footer
    footerContainer.appendChild(this.cancelButton);
    footerContainer.appendChild(this.submitButton);
    
    return footerContainer;
  }
  
  /**
   * Create a form field
   * @param {Object} options - Field options
   * @returns {HTMLElement} Form field container
   */
  createFormField(options) {
    const {
      name,
      label,
      type,
      placeholder,
      required,
      description,
      defaultValue
    } = options;
    
    // Create field container
    const fieldContainer = document.createElement('div');
    fieldContainer.className = 'form-field';
    
    this.applyStyles(fieldContainer, {
      marginBottom: '16px'
    });
    
    // Create label
    const fieldLabel = document.createElement('label');
    fieldLabel.htmlFor = `${name}-input`;
    fieldLabel.textContent = label;
    
    if (required) {
      const requiredMark = document.createElement('span');
      requiredMark.textContent = ' *';
      requiredMark.style.color = '#f44336';
      fieldLabel.appendChild(requiredMark);
    }
    
    this.applyStyles(fieldLabel, {
      display: 'block',
      marginBottom: '6px',
      fontSize: '14px',
      fontWeight: 'bold'
    });
    
    // Create input
    const input = document.createElement('input');
    input.type = type;
    input.id = `${name}-input`;
    input.name = name;
    input.placeholder = placeholder;
    input.required = required;
    input.value = defaultValue || '';
    
    this.applyStyles(input, {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      boxSizing: 'border-box'
    });
    
    input.addEventListener('input', (e) => {
      this.handleInputChange(e);
    });
    
    // Create error message
    const errorMessage = document.createElement('div');
    errorMessage.className = 'field-error';
    errorMessage.id = `${name}-error`;
    
    this.applyStyles(errorMessage, {
      color: '#f44336',
      fontSize: '12px',
      marginTop: '4px',
      display: 'none'
    });
    
    // Create description
    const fieldDescription = document.createElement('div');
    fieldDescription.className = 'field-description';
    fieldDescription.textContent = description || '';
    
    this.applyStyles(fieldDescription, {
      fontSize: '12px',
      color: '#666',
      marginTop: '4px'
    });
    
    // Add elements to container
    fieldContainer.appendChild(fieldLabel);
    fieldContainer.appendChild(input);
    fieldContainer.appendChild(errorMessage);
    fieldContainer.appendChild(fieldDescription);
    
    // Store field references
    this.fields[name] = {
      input,
      errorMessage
    };
    
    return fieldContainer;
  }
  
  /**
   * Create a select field
   * @param {Object} options - Field options
   * @returns {HTMLElement} Form field container
   */
  createSelectField(options) {
    const {
      name,
      label,
      options: selectOptions,
      defaultValue,
      description,
      required
    } = options;
    
    // Create field container
    const fieldContainer = document.createElement('div');
    fieldContainer.className = 'form-field';
    
    this.applyStyles(fieldContainer, {
      marginBottom: '16px'
    });
    
    // Create label
    const fieldLabel = document.createElement('label');
    fieldLabel.htmlFor = `${name}-input`;
    fieldLabel.textContent = label;
    
    if (required) {
      const requiredMark = document.createElement('span');
      requiredMark.textContent = ' *';
      requiredMark.style.color = '#f44336';
      fieldLabel.appendChild(requiredMark);
    }
    
    this.applyStyles(fieldLabel, {
      display: 'block',
      marginBottom: '6px',
      fontSize: '14px',
      fontWeight: 'bold'
    });
    
    // Create select
    const select = document.createElement('select');
    select.id = `${name}-input`;
    select.name = name;
    select.required = required;
    
    this.applyStyles(select, {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      boxSizing: 'border-box',
      backgroundColor: '#fff',
      appearance: 'none',
      backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23333\' d=\'M10.3,3.3L6,7.6L1.7,3.3c-0.4-0.4-1-0.4-1.4,0s-0.4,1,0,1.4l5,5c0.2,0.2,0.5,0.3,0.7,0.3s0.5-0.1,0.7-0.3l5-5c0.4-0.4,0.4-1,0-1.4S10.7,2.9,10.3,3.3z\'/%3E%3C/svg%3E")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 12px center'
    });
    
    // Add options
    selectOptions.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      optionElement.selected = option.value === defaultValue;
      select.appendChild(optionElement);
    });
    
    select.addEventListener('change', (e) => {
      this.handleInputChange(e);
    });
    
    // Create error message
    const errorMessage = document.createElement('div');
    errorMessage.className = 'field-error';
    errorMessage.id = `${name}-error`;
    
    this.applyStyles(errorMessage, {
      color: '#f44336',
      fontSize: '12px',
      marginTop: '4px',
      display: 'none'
    });
    
    // Create description
    const fieldDescription = document.createElement('div');
    fieldDescription.className = 'field-description';
    fieldDescription.textContent = description || '';
    
    this.applyStyles(fieldDescription, {
      fontSize: '12px',
      color: '#666',
      marginTop: '4px'
    });
    
    // Add elements to container
    fieldContainer.appendChild(fieldLabel);
    fieldContainer.appendChild(select);
    fieldContainer.appendChild(errorMessage);
    fieldContainer.appendChild(fieldDescription);
    
    // Store field references
    this.fields[name] = {
      input: select,
      errorMessage
    };
    
    return fieldContainer;
  }
  
  /**
   * Handle input change
   * @param {Event} event - Input event
   */
  handleInputChange(event) {
    const { name, value } = event.target;
    
    // Update form data
    this.formData[name] = value;
    
    // Clear field error if it exists
    this.clearFieldError(name);
  }
  
  /**
   * Handle form submit
   * @param {Event} event - Submit event
   */
  async handleSubmit(event) {
    event.preventDefault();
    
    // Prevent multiple submissions
    if (this.isSubmitting) {
      return;
    }
    
    try {
      // Set submitting state
      this.isSubmitting = true;
      this.updateSubmitButton(true);
      
      // Validate form
      const isValid = this.validateForm();
      
      if (!isValid) {
        // Stop if validation failed
        this.isSubmitting = false;
        this.updateSubmitButton(false);
        return;
      }
      
      // Update user
      const result = await this.updateUser();
      
      // Handle result
      if (result.success) {
        // Call onUserUpdated callback
        this.options.onUserUpdated(result.user);
        
        // Close modal
        this.close();
        
        // Log success
        logChatEvent('admin', 'User updated successfully', {
          userId: this.userId,
          username: this.formData.username
        });
      } else {
        // Show error
        this.showFormError(result.error || 'Failed to update user');
        
        // Log error
        logChatEvent('admin', 'User update failed', {
          userId: this.userId,
          error: result.error
        });
      }
    } catch (error) {
      // Show error
      this.showFormError('An unexpected error occurred');
      
      // Log error
      handleError(error, {
        code: ErrorCode.API_REQUEST_FAILED,
        category: ErrorCategory.DATA,
        source: 'EditUserModal',
        message: 'Failed to update user'
      });
    } finally {
      // Reset submitting state
      this.isSubmitting = false;
      this.updateSubmitButton(false);
    }
  }
  
  /**
   * Validate form data
   * @returns {boolean} Whether form is valid
   */
  validateForm() {
    // Reset form errors
    this.formErrors = {};
    
    // Hide any existing form error
    this.hideFormError();
    
    // Validate username
    const usernameResult = validateUsername(this.formData.username);
    if (!usernameResult.success) {
      this.formErrors.username = usernameResult.error;
      this.showFieldError('username', usernameResult.error);
    }
    
    // Validate email if provided
    if (this.formData.email) {
      const emailResult = validateEmail(this.formData.email);
      if (!emailResult.success) {
        this.formErrors.email = emailResult.error;
        this.showFieldError('email', emailResult.error);
      }
    }
    
    // Return whether form is valid
    return Object.keys(this.formErrors).length === 0;
  }
  
  /**
   * Update user
   * @returns {Promise<Object>} Update result
   */
  async updateUser() {
    // Prepare update data - only include changed fields
    const updates = {};
    
    Object.keys(this.formData).forEach(key => {
      // Only include fields that have changed
      if (this.formData[key] !== this.originalData[key]) {
        updates[key] = this.formData[key];
      }
    });
    
    // If no changes, return success
    if (Object.keys(updates).length === 0) {
      return {
        success: true,
        user: this.originalData,
        message: 'No changes to save'
      };
    }
    
    // Update user through auth context
    const result = await authContext.updateUser(this.userId, updates);
    
    return result;
  }
  
  /**
   * Show field error
   * @param {string} fieldName - Field name
   * @param {string} error - Error message
   */
  showFieldError(fieldName, error) {
    const field = this.fields[fieldName];
    
    if (field) {
      // Show error message
      field.errorMessage.textContent = error;
      field.errorMessage.style.display = 'block';
      
      // Add error class to input
      field.input.classList.add('error');
      field.input.style.borderColor = '#f44336';
    }
  }
  
  /**
   * Clear field error
   * @param {string} fieldName - Field name
   */
  clearFieldError(fieldName) {
    const field = this.fields[fieldName];
    
    if (field) {
      // Hide error message
      field.errorMessage.textContent = '';
      field.errorMessage.style.display = 'none';
      
      // Remove error class from input
      field.input.classList.remove('error');
      field.input.style.borderColor = '#ddd';
    }
  }
  
  /**
   * Show form error
   * @param {string} error - Error message
   */
  showFormError(error) {
    if (this.errorContainer) {
      this.errorContainer.textContent = error;
      this.errorContainer.style.display = 'block';
    }
  }
  
  /**
   * Hide form error
   */
  hideFormError() {
    if (this.errorContainer) {
      this.errorContainer.textContent = '';
      this.errorContainer.style.display = 'none';
    }
  }
  
  /**
   * Update submit button state
   * @param {boolean} isLoading - Whether button is in loading state
   */
  updateSubmitButton(isLoading) {
    if (this.submitButton) {
      this.submitButton.disabled = isLoading;
      this.submitButton.textContent = isLoading ? 'Saving...' : 'Save Changes';
      this.submitButton.style.opacity = isLoading ? '0.7' : '1';
    }
    
    if (this.cancelButton) {
      this.cancelButton.disabled = isLoading;
    }
  }
  
  /**
   * Reset form data and UI
   */
  resetForm() {
    // Reset form errors
    this.formErrors = {};
    
    // Reset form UI
    if (this.form) {
      this.form.reset();
    }
    
    // Hide form error
    this.hideFormError();
    
    // Clear field errors
    Object.keys(this.fields).forEach(fieldName => {
      this.clearFieldError(fieldName);
    });
  }
  
  /**
   * Show the modal
   */
  show() {
    // Call parent show method
    super.show();
    
    // Focus username input
    if (this.fields.username && this.fields.username.input) {
      this.fields.username.input.focus();
    }
    
    // Log modal shown
    logChatEvent('admin', 'Edit user modal opened', {
      userId: this.userId
    });
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    try {
      // Clean up form event listeners
      if (this.form) {
        this.form.removeEventListener('submit', this.handleSubmit);
      }
      
      // Clean up field event listeners
      Object.values(this.fields).forEach(field => {
        if (field.input) {
          field.input.removeEventListener('input', this.handleInputChange);
          field.input.removeEventListener('change', this.handleInputChange);
        }
      });
      
      // Call parent destroy
      super.destroy();
      
      // Log destruction
      logChatEvent('admin', 'Edit user modal destroyed');
    } catch (error) {
      console.error('[EditUserModal] Error destroying modal:', error);
    }
  }
}

export default EditUserModal;