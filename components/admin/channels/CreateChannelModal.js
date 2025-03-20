// chat/components/admin/channels/CreateChannelModal.js
// Modal for creating new channels

import { createChannel } from '../../../services/channelService.js';
import { logChatEvent } from '../../../utils/logger.js';
import { validateChannelName, validateChannelDescription } from '../../../utils/validation.js';
import ModalBase from '../../common/ModalBase.js';

/**
 * Create Channel Modal Component
 * Modal for creating new channels
 */
class CreateChannelModal extends ModalBase {
  /**
   * Create a new CreateChannelModal
   * @param {Object} options - Modal options
   * @param {Function} options.onSuccess - Success callback
   */
  constructor(options = {}) {
    super({
      title: 'Create New Channel',
      width: '500px',
      ...options
    });
    
    this.options = {
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
    
    // Create form
    const form = document.createElement('form');
    form.id = 'create-channel-form';
    
    // Channel name field
    const nameGroup = this.createFormGroup('name', 'Channel Name', 'text', '', 'Enter channel name');
    form.appendChild(nameGroup);
    
    // Channel description field
    const descriptionGroup = this.createFormGroup('description', 'Description (optional)', 'text', '', 'Enter channel description');
    form.appendChild(descriptionGroup);
    
    // Channel type selection
    const typeGroup = document.createElement('div');
    this.applyStyles(typeGroup, {
      marginBottom: '15px'
    });
    
    const typeLabel = document.createElement('div');
    typeLabel.textContent = 'Channel Type';
    this.applyStyles(typeLabel, {
      display: 'block',
      marginBottom: '8px',
      fontWeight: 'bold'
    });
    
    const typeOptions = document.createElement('div');
    this.applyStyles(typeOptions, {
      display: 'flex',
      gap: '20px'
    });
    
    // Public option
    const publicOption = document.createElement('div');
    this.applyStyles(publicOption, {
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    });
    
    const publicRadio = document.createElement('input');
    publicRadio.type = 'radio';
    publicRadio.id = 'channel-type-public';
    publicRadio.name = 'type';
    publicRadio.value = 'public';
    publicRadio.checked = true;
    
    const publicLabel = document.createElement('label');
    publicLabel.htmlFor = 'channel-type-public';
    publicLabel.textContent = 'Public';
    
    publicOption.appendChild(publicRadio);
    publicOption.appendChild(publicLabel);
    
    // Private option
    const privateOption = document.createElement('div');
    this.applyStyles(privateOption, {
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    });
    
    const privateRadio = document.createElement('input');
    privateRadio.type = 'radio';
    privateRadio.id = 'channel-type-private';
    privateRadio.name = 'type';
    privateRadio.value = 'private';
    
    const privateLabel = document.createElement('label');
    privateLabel.htmlFor = 'channel-type-private';
    privateLabel.textContent = 'Private';
    
    privateOption.appendChild(privateRadio);
    privateOption.appendChild(privateLabel);
    
    // Type description
    const typeDescription = document.createElement('div');
    this.applyStyles(typeDescription, {
      marginTop: '10px',
      fontSize: '12px',
      color: '#6c757d'
    });
    
    // Update description based on selected type
    const updateTypeDescription = () => {
      if (privateRadio.checked) {
        typeDescription.textContent = 'Private channels are only visible to invited members.';
      } else {
        typeDescription.textContent = 'Public channels are visible to all users.';
      }
    };
    
    // Add event listeners
    publicRadio.addEventListener('change', updateTypeDescription);
    privateRadio.addEventListener('change', updateTypeDescription);
    
    // Set initial description
    updateTypeDescription();
    
    typeOptions.appendChild(publicOption);
    typeOptions.appendChild(privateOption);
    
    typeGroup.appendChild(typeLabel);
    typeGroup.appendChild(typeOptions);
    typeGroup.appendChild(typeDescription);
    
    form.appendChild(typeGroup);
    
    // Read-only option
    const readOnlyGroup = document.createElement('div');
    this.applyStyles(readOnlyGroup, {
      marginBottom: '15px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });
    
    const readOnlyCheckbox = document.createElement('input');
    readOnlyCheckbox.type = 'checkbox';
    readOnlyCheckbox.id = 'channel-readonly';
    readOnlyCheckbox.name = 'readonly';
    
    const readOnlyLabel = document.createElement('label');
    readOnlyLabel.htmlFor = 'channel-readonly';
    readOnlyLabel.textContent = 'Read-only (only admins and moderators can post)';
    
    readOnlyGroup.appendChild(readOnlyCheckbox);
    readOnlyGroup.appendChild(readOnlyLabel);
    
    form.appendChild(readOnlyGroup);
    
    // Error message area
    const errorMessage = document.createElement('div');
    errorMessage.id = 'create-channel-error';
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
    createButton.textContent = 'Create Channel';
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
      await this.handleCreateChannel(form, errorMessage, createButton);
    });
    
    content.appendChild(form);
    
    // Set focus to channel name field on next tick
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
   * Handle create channel form submission
   * @param {HTMLFormElement} form - Form element
   * @param {HTMLElement} errorElement - Error message element
   * @param {HTMLElement} submitButton - Submit button element
   */
  async handleCreateChannel(form, errorElement, submitButton) {
    // Get form data
    const formData = new FormData(form);
    const channelData = {
      name: formData.get('name'),
      description: formData.get('description'),
      type: formData.get('type') || 'public',
      readonly: formData.get('readonly') === 'on'
    };
    
    // Validate form data
    const nameValidation = validateChannelName(channelData.name);
    if (!nameValidation.success) {
      this.showFormError(errorElement, nameValidation.error);
      return;
    }
    
    if (channelData.description) {
      const descValidation = validateChannelDescription(channelData.description);
      if (!descValidation.success) {
        this.showFormError(errorElement, descValidation.error);
        return;
      }
    }
    
    // Disable form submission
    submitButton.disabled = true;
    submitButton.textContent = 'Creating...';
    
    try {
      // Call API to create channel
      const result = await createChannel(channelData);
      
      if (result.success) {
        // Close modal
        this.close();
        
        // Call success callback
        if (this.options.onSuccess && typeof this.options.onSuccess === 'function') {
          this.options.onSuccess(result.channel);
        }
        
        // Log channel creation
        logChatEvent('admin', 'Created new channel', { 
          name: channelData.name,
          type: channelData.type
        });
      } else {
        this.showFormError(errorElement, result.error || 'Failed to create channel');
        
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = 'Create Channel';
      }
    } catch (error) {
      console.error('[CRM Extension] Error creating channel:', error);
      this.showFormError(errorElement, 'An error occurred while creating the channel');
      
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = 'Create Channel';
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
}

export default CreateChannelModal;