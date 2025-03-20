// chat/components/admin/channels/EditChannelModal.js
// Modal for editing existing channels

import { updateChannel } from '../../../services/channelService.js';
import { logChatEvent } from '../../../utils/logger.js';
import { validateChannelDescription } from '../../../utils/validation.js';
import ModalBase from '../../common/ModalBase.js';

/**
 * Edit Channel Modal Component
 * Modal for editing existing channels
 */
class EditChannelModal extends ModalBase {
  /**
   * Create a new EditChannelModal
   * @param {Object} options - Modal options
   * @param {Object} options.channel - Channel to edit
   * @param {Function} options.onSuccess - Success callback
   */
  constructor(options = {}) {
    super({
      title: `Edit Channel: ${options.channel?.name || 'Channel'}`,
      width: '500px',
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
    
    // Create form
    const form = document.createElement('form');
    form.id = 'edit-channel-form';
    
    // Channel name field (readonly if default channel)
    const nameGroup = this.createFormGroup('name', 'Channel Name', 'text', channel.name, 'Enter channel name');
    const nameInput = nameGroup.querySelector('input');
    
    // Make name readonly for default channels
    if (channel.id === 'general' || channel.id === 'announcements') {
      nameInput.readOnly = true;
      nameInput.style.backgroundColor = '#f8f9fa';
    }
    
    form.appendChild(nameGroup);
    
    // Channel description field
    const descriptionGroup = this.createFormGroup('description', 'Description (optional)', 'text', channel.description || '', 'Enter channel description');
    form.appendChild(descriptionGroup);
    
    // Channel type selection (disabled for default channels)
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
    publicRadio.checked = channel.type !== 'private';
    
    // Disable for default channels
    if (channel.id === 'general' || channel.id === 'announcements') {
      publicRadio.disabled = true;
    }
    
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
    privateRadio.checked = channel.type === 'private';
    
    // Disable for default channels
    if (channel.id === 'general' || channel.id === 'announcements') {
      privateRadio.disabled = true;
    }
    
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
    readOnlyCheckbox.checked = !!channel.readonly;
    
    const readOnlyLabel = document.createElement('label');
    readOnlyLabel.htmlFor = 'channel-readonly';
    readOnlyLabel.textContent = 'Read-only (only admins and moderators can post)';
    
    readOnlyGroup.appendChild(readOnlyCheckbox);
    readOnlyGroup.appendChild(readOnlyLabel);
    
    form.appendChild(readOnlyGroup);
    
    // Error message area
    const errorMessage = document.createElement('div');
    errorMessage.id = 'edit-channel-error';
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
      await this.handleEditChannel(form, errorMessage, saveButton);
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
   * Handle edit channel form submission
   * @param {HTMLFormElement} form - Form element
   * @param {HTMLElement} errorElement - Error message element
   * @param {HTMLElement} submitButton - Submit button element
   */
  async handleEditChannel(form, errorElement, submitButton) {
    const channel = this.options.channel;
    
    // Get form data
    const formData = new FormData(form);
    const channelData = {
      id: channel.id,
      name: formData.get('name'),
      description: formData.get('description'),
      type: formData.get('type') || 'public',
      readonly: formData.get('readonly') === 'on'
    };
    
    // Don't allow changing name for default channels
    if (channel.id === 'general' || channel.id === 'announcements') {
      channelData.name = channel.name;
    }
    
    // Validate form data
    if (channelData.description) {
      const descValidation = validateChannelDescription(channelData.description);
      if (!descValidation.success) {
        this.showFormError(errorElement, descValidation.error);
        return;
      }
    }
    
    // Disable form submission
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    
    try {
      // Call API to update channel
      const result = await updateChannel(channel.id, channelData);
      
      if (result.success) {
        // Close modal
        this.close();
        
        // Call success callback
        if (this.options.onSuccess && typeof this.options.onSuccess === 'function') {
          this.options.onSuccess(result.channel);
        }
        
        // Log channel update
        logChatEvent('admin', 'Updated channel', { 
          name: channelData.name,
          id: channel.id
        });
      } else {
        this.showFormError(errorElement, result.error || 'Failed to update channel');
        
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = 'Save Changes';
      }
    } catch (error) {
      console.error('[CRM Extension] Error updating channel:', error);
      this.showFormError(errorElement, 'An error occurred while updating the channel');
      
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = 'Save Changes';
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

export default EditChannelModal;