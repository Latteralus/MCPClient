// chat/components/admin/roles/CreateRoleModal.js
// Modal for creating new roles

import { createRole } from '../../../services/auth';
import { logChatEvent } from '../../../utils/logger.js';
import ModalBase from '../../common/ModalBase.js';
import PermissionSelector from './PermissionSelector.js';

/**
 * Create Role Modal Component
 * Modal for creating new roles
 */
class CreateRoleModal extends ModalBase {
  /**
   * Create a new CreateRoleModal
   * @param {Object} options - Modal options
   * @param {Function} options.onSuccess - Success callback
   */
  constructor(options = {}) {
    super({
      title: 'Create New Role',
      width: '600px',
      ...options
    });
    
    this.options = {
      onSuccess: () => {},
      ...options
    };
    
    this.permissionSelector = null;
  }
  
  /**
   * Render the modal content
   * @returns {HTMLElement} Modal content
   */
  renderContent() {
    const content = document.createElement('div');
    
    // Create form
    const form = document.createElement('form');
    form.id = 'create-role-form';
    
    // Role name field
    const nameGroup = this.createFormGroup('name', 'Role Name', 'text', '', 'Enter role name');
    form.appendChild(nameGroup);
    
    // Role description field
    const descriptionGroup = this.createFormGroup('description', 'Description (optional)', 'text', '', 'Enter role description');
    form.appendChild(descriptionGroup);
    
    // Permissions section
    const permissionsSection = document.createElement('div');
    this.applyStyles(permissionsSection, {
      marginBottom: '20px'
    });
    
    const permissionsLabel = document.createElement('label');
    permissionsLabel.textContent = 'Permissions';
    this.applyStyles(permissionsLabel, {
      display: 'block',
      marginBottom: '10px',
      fontWeight: 'bold'
    });
    
    permissionsSection.appendChild(permissionsLabel);
    
    // Add permission selector
    this.permissionSelector = new PermissionSelector();
    permissionsSection.appendChild(this.permissionSelector.render());
    
    form.appendChild(permissionsSection);
    
    // Error message area
    const errorMessage = document.createElement('div');
    errorMessage.id = 'create-role-error';
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
    
    const createButton = document.createElement('button');
    createButton.type = 'submit';
    createButton.textContent = 'Create Role';
    this.applyStyles(createButton, {
      padding: '8px 16px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    });
    
    formActions.appendChild(cancelButton);
    formActions.appendChild(createButton);
    form.appendChild(formActions);
    
    // Form submission handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleCreateRole(form, errorMessage, createButton);
    });
    
    content.appendChild(form);
    
    // Set focus to role name field on next tick
    setTimeout(() => {
      form.elements.name.focus();
    }, 0);
    
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
   * Handle create role form submission
   * @param {HTMLFormElement} form - Form element
   * @param {HTMLElement} errorElement - Error message element
   * @param {HTMLElement} submitButton - Submit button element
   */
  async handleCreateRole(form, errorElement, submitButton) {
    // Get form data
    const formData = new FormData(form);
    const roleData = {
      name: formData.get('name'),
      description: formData.get('description'),
      permissions: this.permissionSelector.getSelectedPermissions()
    };
    
    // Validate form data
    if (!roleData.name) {
      this.showFormError(errorElement, 'Role name is required');
      return;
    }
    
    if (roleData.name.length < 2) {
      this.showFormError(errorElement, 'Role name must be at least 2 characters');
      return;
    }
    
    if (roleData.permissions.length === 0) {
      this.showFormError(errorElement, 'At least one permission must be selected');
      return;
    }
    
    // Disable form submission
    submitButton.disabled = true;
    submitButton.textContent = 'Creating...';
    
    try {
      // Call API to create role
      const result = await createRole(roleData);
      
      if (result.success) {
        // Close modal
        this.close();
        
        // Call success callback
        if (this.options.onSuccess && typeof this.options.onSuccess === 'function') {
          this.options.onSuccess(result.role);
        }
        
        // Log role creation
        logChatEvent('admin', 'Created new role', { 
          roleName: roleData.name,
          permissionCount: roleData.permissions.length
        });
      } else {
        this.showFormError(errorElement, result.error || 'Failed to create role');
        
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = 'Create Role';
      }
    } catch (error) {
      console.error('[CRM Extension] Error creating role:', error);
      this.showFormError(errorElement, 'An error occurred while creating the role');
      
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = 'Create Role';
    }
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
  
  /**
   * Clean up resources when closing the modal
   */
  close() {
    // Clean up permission selector
    if (this.permissionSelector) {
      this.permissionSelector.destroy();
    }
    
    // Call parent close method
    super.close();
  }
}

export default CreateRoleModal;