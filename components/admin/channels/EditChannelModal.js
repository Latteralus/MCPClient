// chat/components/admin/channels/EditChannelModal.js
// Edit channel modal component for HIPAA-compliant chat

import ModalBase from '../../common/ModalBase.js';
import authContext from '../../../contexts/AuthContext.js';
import { logChatEvent } from '../../../utils/logger.js';
import { handleError, ErrorCategory, ErrorCode } from '../../../utils/error-handler.js';
import { validateChannelName, validateChannelDescription } from '../../../utils/validation.js';

/**
 * Edit Channel Modal Component
 * Modal dialog for editing existing chat channels
 */
class EditChannelModal extends ModalBase {
  /**
   * Create a new EditChannelModal
   * @param {Object} options - Modal options
   * @param {Function} options.onSubmit - Submit handler function
   */
  constructor(options = {}) {
    // Configure base modal
    super({
      title: 'Edit Channel',
      width: '500px',
      className: 'edit-channel-modal',
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
      name: '',
      description: '',
      isPublic: true,
      isEncrypted: true,
      allowExternalUsers: false,
      errors: {},
      isSubmitting: false,
      hasChanges: false
    };
    
    // Form elements
    this.formElement = null;
    this.nameInput = null;
    this.descriptionInput = null;
    this.publicRadio = null;
    this.privateRadio = null;
    this.encryptedToggle = null;
    this.externalUsersToggle = null;
    this.submitButton = null;
    this.cancelButton = null;
    this.errorContainer = null;
    
    // Bind methods
    this.renderContent = this.renderContent.bind(this);
    this.renderFooter = this.renderFooter.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.validate = this.validate.bind(this);
    this.resetForm = this.resetForm.bind(this);
    this.showError = this.showError.bind(this);
    this.updateFormFromChannel = this.updateFormFromChannel.bind(this);
    this.setChannel = this.setChannel.bind(this);
    this.checkForChanges = this.checkForChanges.bind(this);
  }
  
  /**
   * Render modal content
   * @returns {HTMLElement} Modal content
   */
  renderContent() {
    try {
      // Create form element
      this.formElement = document.createElement('form');
      this.formElement.className = 'edit-channel-form';
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
      
      // Channel ID (hidden field)
      const channelIdField = document.createElement('input');
      channelIdField.type = 'hidden';
      channelIdField.name = 'channel-id';
      channelIdField.value = this.currentChannel ? this.currentChannel.id : '';
      this.formElement.appendChild(channelIdField);
      
      // Channel name field
      const nameGroup = this.createFormGroup({
        id: 'channel-name',
        label: 'Channel Name',
        required: true,
        type: 'text',
        placeholder: 'Enter channel name',
        value: this.formState.name,
        onChange: (e) => this.handleInputChange('name', e.target.value),
        error: this.formState.errors.name
      });
      this.nameInput = nameGroup.querySelector('input');
      this.formElement.appendChild(nameGroup);
      
      // Channel description field
      const descriptionGroup = this.createFormGroup({
        id: 'channel-description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Enter channel description (optional)',
        value: this.formState.description,
        onChange: (e) => this.handleInputChange('description', e.target.value),
        error: this.formState.errors.description
      });
      this.descriptionInput = descriptionGroup.querySelector('textarea');
      this.formElement.appendChild(descriptionGroup);
      
      // Channel access type
      const accessTypeGroup = document.createElement('div');
      accessTypeGroup.className = 'form-group';
      this.applyStyles(accessTypeGroup, {
        marginBottom: '16px'
      });
      
      const accessTypeLabel = document.createElement('label');
      accessTypeLabel.textContent = 'Access Type';
      this.applyStyles(accessTypeLabel, {
        display: 'block',
        marginBottom: '8px',
        fontWeight: 'bold'
      });
      accessTypeGroup.appendChild(accessTypeLabel);
      
      // Access type warning for existing channels
      const accessWarning = document.createElement('div');
      accessWarning.className = 'access-warning';
      this.applyStyles(accessWarning, {
        backgroundColor: '#fff3e0',
        color: '#e65100',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        marginBottom: '8px'
      });
      accessWarning.innerHTML = '⚠️ <strong>Warning:</strong> Changing a channel\'s access type may affect user permissions and message visibility.';
      accessTypeGroup.appendChild(accessWarning);
      
      // Radio button container
      const radioContainer = document.createElement('div');
      this.applyStyles(radioContainer, {
        display: 'flex',
        gap: '16px'
      });
      
      // Public option
      const publicContainer = document.createElement('div');
      this.applyStyles(publicContainer, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      });
      
      this.publicRadio = document.createElement('input');
      this.publicRadio.type = 'radio';
      this.publicRadio.id = 'public-channel';
      this.publicRadio.name = 'access-type';
      this.publicRadio.checked = this.formState.isPublic;
      this.publicRadio.addEventListener('change', () => {
        this.handleInputChange('isPublic', true);
      });
      
      const publicLabel = document.createElement('label');
      publicLabel.htmlFor = 'public-channel';
      publicLabel.textContent = 'Public';
      
      // Public info icon
      const publicInfo = document.createElement('span');
      publicInfo.textContent = 'ⓘ';
      publicInfo.title = 'Accessible to all users';
      this.applyStyles(publicInfo, {
        color: '#2196F3',
        fontSize: '16px',
        cursor: 'help'
      });
      
      publicContainer.appendChild(this.publicRadio);
      publicContainer.appendChild(publicLabel);
      publicContainer.appendChild(publicInfo);
      
      // Private option
      const privateContainer = document.createElement('div');
      this.applyStyles(privateContainer, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      });
      
      this.privateRadio = document.createElement('input');
      this.privateRadio.type = 'radio';
      this.privateRadio.id = 'private-channel';
      this.privateRadio.name = 'access-type';
      this.privateRadio.checked = !this.formState.isPublic;
      this.privateRadio.addEventListener('change', () => {
        this.handleInputChange('isPublic', false);
      });
      
      const privateLabel = document.createElement('label');
      privateLabel.htmlFor = 'private-channel';
      privateLabel.textContent = 'Private';
      
      // Private info icon
      const privateInfo = document.createElement('span');
      privateInfo.textContent = 'ⓘ';
      privateInfo.title = 'Only invited users can access';
      this.applyStyles(privateInfo, {
        color: '#2196F3',
        fontSize: '16px',
        cursor: 'help'
      });
      
      privateContainer.appendChild(this.privateRadio);
      privateContainer.appendChild(privateLabel);
      privateContainer.appendChild(privateInfo);
      
      radioContainer.appendChild(publicContainer);
      radioContainer.appendChild(privateContainer);
      accessTypeGroup.appendChild(radioContainer);
      
      this.formElement.appendChild(accessTypeGroup);
      
      // Security settings section
      const securitySection = document.createElement('div');
      securitySection.className = 'security-section';
      
      const securityTitle = document.createElement('h4');
      securityTitle.textContent = 'Security Settings';
      this.applyStyles(securityTitle, {
        marginBottom: '12px',
        fontWeight: 'bold',
        color: '#333',
        borderBottom: '1px solid #eee',
        paddingBottom: '8px'
      });
      securitySection.appendChild(securityTitle);
      
      // Encryption toggle
      const encryptionGroup = this.createToggleGroup({
        id: 'encryption-toggle',
        label: 'Enable Message Encryption',
        description: 'End-to-end encryption for all messages (recommended for PHI)',
        checked: this.formState.isEncrypted,
        onChange: (checked) => this.handleInputChange('isEncrypted', checked)
      });
      this.encryptedToggle = encryptionGroup.querySelector('input');
      
      // Add encryption warning if changing from encrypted to unencrypted
      const encryptionWarning = document.createElement('div');
      encryptionWarning.className = 'encryption-warning';
      this.applyStyles(encryptionWarning, {
        backgroundColor: '#ffebee',
        color: '#b71c1c',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        marginTop: '8px',
        display: 'none'
      });
      encryptionWarning.innerHTML = '⚠️ <strong>Warning:</strong> Disabling encryption could expose sensitive patient information.';
      encryptionGroup.appendChild(encryptionWarning);
      
      // Show warning when toggling encryption off
      this.encryptedToggle.addEventListener('change', (e) => {
        encryptionWarning.style.display = !e.target.checked ? 'block' : 'none';
      });
      
      securitySection.appendChild(encryptionGroup);
      
      // External users toggle (only for private channels)
      const externalUsersGroup = this.createToggleGroup({
        id: 'external-users-toggle',
        label: 'Allow External Users',
        description: 'Permit guest access with appropriate verification',
        checked: this.formState.allowExternalUsers,
        onChange: (checked) => this.handleInputChange('allowExternalUsers', checked),
        disabled: this.formState.isPublic // Disable for public channels
      });
      this.externalUsersToggle = externalUsersGroup.querySelector('input');
      securitySection.appendChild(externalUsersGroup);
      
      this.formElement.appendChild(securitySection);
      
      // Channel info section
      if (this.currentChannel) {
        const infoSection = document.createElement('div');
        infoSection.className = 'channel-info-section';
        this.applyStyles(infoSection, {
          backgroundColor: '#f5f5f5',
          padding: '12px',
          borderRadius: '4px',
          marginTop: '16px',
          fontSize: '13px'
        });
        
        const infoTitle = document.createElement('h4');
        infoTitle.textContent = 'Channel Information';
        this.applyStyles(infoTitle, {
          margin: '0 0 8px 0',
          fontSize: '14px',
          color: '#333'
        });
        infoSection.appendChild(infoTitle);
        
        // Channel details list
        const infoList = document.createElement('ul');
        this.applyStyles(infoList, {
          margin: '0',
          padding: '0 0 0 20px',
          listStyle: 'disc'
        });
        
        // Created info
        const createdItem = document.createElement('li');
        const createdDate = new Date(this.currentChannel.createdAt).toLocaleString();
        createdItem.textContent = `Created: ${createdDate}`;
        infoList.appendChild(createdItem);
        
        // Members info
        const membersItem = document.createElement('li');
        membersItem.textContent = `Members: ${this.currentChannel.memberCount || 0}`;
        infoList.appendChild(membersItem);
        
        // Message count info
        const messagesItem = document.createElement('li');
        messagesItem.textContent = `Messages: ${this.currentChannel.messageCount || 0}`;
        infoList.appendChild(messagesItem);
        
        infoSection.appendChild(infoList);
        this.formElement.appendChild(infoSection);
      }
      
      // HIPAA compliance notice
      const complianceNotice = document.createElement('div');
      complianceNotice.className = 'compliance-notice';
      this.applyStyles(complianceNotice, {
        backgroundColor: '#e8f5e9',
        color: '#2e7d32',
        padding: '10px',
        borderRadius: '4px',
        marginTop: '16px',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      });
      
      const noticeIcon = document.createElement('span');
      noticeIcon.textContent = '🔒';
      complianceNotice.appendChild(noticeIcon);
      
      const noticeText = document.createElement('span');
      noticeText.textContent = 'This channel complies with HIPAA requirements for secure messaging. All changes are logged for audit purposes.';
      complianceNotice.appendChild(noticeText);
      
      this.formElement.appendChild(complianceNotice);
      
      return this.formElement;
    } catch (error) {
      handleError(error, {
        code: ErrorCode.COMPONENT_FAILED,
        category: ErrorCategory.UI,
        source: 'EditChannelModal',
        message: 'Failed to render channel edit form'
      });
      
      // Return error message element
      const errorElement = document.createElement('div');
      errorElement.className = 'modal-error';
      errorElement.textContent = 'Error: Could not render the channel edit form.';
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
    
    // Submit button
    this.submitButton = document.createElement('button');
    this.submitButton.type = 'submit';
    this.submitButton.textContent = 'Save Changes';
    this.submitButton.className = 'submit-button';
    this.submitButton.disabled = !this.formState.hasChanges;
    this.applyStyles(this.submitButton, {
      padding: '8px 16px',
      backgroundColor: '#2196F3',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: this.formState.hasChanges ? 'pointer' : 'not-allowed',
      fontWeight: 'bold',
      opacity: this.formState.hasChanges ? '1' : '0.6'
    });
    
    // Add hover effect
    this.submitButton.addEventListener('mouseover', () => {
      if (this.formState.hasChanges) {
        this.submitButton.style.backgroundColor = '#1976D2';
      }
    });
    
    this.submitButton.addEventListener('mouseout', () => {
      if (this.formState.hasChanges) {
        this.submitButton.style.backgroundColor = '#2196F3';
      }
    });
    
    // Add buttons to footer
    footerContainer.appendChild(this.cancelButton);
    footerContainer.appendChild(this.submitButton);
    
    return footerContainer;
  }
  
  /**
   * Create a form group with label and input
   * @param {Object} options - Form group options
   * @returns {HTMLElement} Form group element
   */
  createFormGroup(options) {
    const {
      id,
      label,
      type,
      placeholder,
      value,
      onChange,
      error,
      required = false,
      disabled = false,
      min,
      max
    } = options;
    
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    this.applyStyles(formGroup, {
      marginBottom: '16px'
    });
    
    // Create label
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    if (required) {
      const requiredStar = document.createElement('span');
      requiredStar.textContent = ' *';
      requiredStar.style.color = '#f44336';
      labelElement.appendChild(requiredStar);
    }
    this.applyStyles(labelElement, {
      display: 'block',
      marginBottom: '8px',
      fontWeight: 'bold'
    });
    formGroup.appendChild(labelElement);
    
    // Create input
    let inputElement;
    
    if (type === 'textarea') {
      inputElement = document.createElement('textarea');
      this.applyStyles(inputElement, {
        height: '80px',
        resize: 'vertical'
      });
    } else {
      inputElement = document.createElement('input');
      inputElement.type = type;
      
      if (min !== undefined) inputElement.min = min;
      if (max !== undefined) inputElement.max = max;
    }
    
    inputElement.id = id;
    inputElement.name = id;
    inputElement.placeholder = placeholder || '';
    inputElement.value = value || '';
    inputElement.disabled = disabled;
    inputElement.required = required;
    
    this.applyStyles(inputElement, {
      width: '100%',
      padding: '10px',
      border: error ? '1px solid #f44336' : '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box',
      fontSize: '14px'
    });
    
    if (onChange) {
      inputElement.addEventListener('input', onChange);
    }
    
    formGroup.appendChild(inputElement);
    
    // Add error message if present
    if (error) {
      const errorElement = document.createElement('div');
      errorElement.className = 'form-error';
      errorElement.textContent = error;
      this.applyStyles(errorElement, {
        color: '#f44336',
        fontSize: '12px',
        marginTop: '4px'
      });
      formGroup.appendChild(errorElement);
    }
    
    return formGroup;
  }
  
  /**
   * Create a toggle switch form group
   * @param {Object} options - Toggle group options
   * @returns {HTMLElement} Toggle group element
   */
  createToggleGroup(options) {
    const {
      id,
      label,
      description,
      checked,
      onChange,
      disabled = false
    } = options;
    
    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'toggle-group';
    this.applyStyles(toggleGroup, {
      marginBottom: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '8px 0'
    });
    
    // Label and description container
    const labelContainer = document.createElement('div');
    this.applyStyles(labelContainer, {
      flex: '1'
    });
    
    // Label
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    this.applyStyles(labelElement, {
      display: 'block',
      fontWeight: 'bold',
      marginBottom: '4px'
    });
    labelContainer.appendChild(labelElement);
    
    // Description if provided
    if (description) {
      const descElement = document.createElement('div');
      descElement.textContent = description;
      this.applyStyles(descElement, {
        fontSize: '13px',
        color: '#666'
      });
      labelContainer.appendChild(descElement);
    }
    
    // Toggle switch container
    const toggleContainer = document.createElement('div');
    this.applyStyles(toggleContainer, {
      marginLeft: '16px'
    });
    
    // Create toggle switch
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'switch';
    this.applyStyles(toggleLabel, {
      position: 'relative',
      display: 'inline-block',
      width: '48px',
      height: '24px'
    });
    
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.id = id;
    toggleInput.checked = checked;
    toggleInput.disabled = disabled;
    
    if (onChange) {
      toggleInput.addEventListener('change', (e) => {
        onChange(e.target.checked);
      });
    }
    
    this.applyStyles(toggleInput, {
      opacity: '0',
      width: '0',
      height: '0'
    });
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    this.applyStyles(slider, {
      position: 'absolute',
      cursor: disabled ? 'not-allowed' : 'pointer',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: checked ? '#2196F3' : '#ccc',
      opacity: disabled ? '0.6' : '1',
      transition: '.4s',
      borderRadius: '24px'
    });
    
    // Add toggle "thumb"
    this.applyStyles(slider, {
      '&:before': {
        position: 'absolute',
        content: '""',
        height: '16px',
        width: '16px',
        left: '4px',
        bottom: '4px',
        backgroundColor: 'white',
        transition: '.4s',
        borderRadius: '50%',
        transform: checked ? 'translateX(24px)' : 'translateX(0)'
      }
    });
    
    // Add toggle indicator via custom CSS
    const styleId = 'toggle-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .switch input:checked + .slider {
          background-color: #2196F3;
        }
        
        .switch input:checked + .slider:before {
          transform: translateX(24px);
        }
        
        .switch .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
      `;
      document.head.appendChild(style);
    }
    
    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(slider);
    toggleContainer.appendChild(toggleLabel);
    
    // Add to group
    toggleGroup.appendChild(labelContainer);
    toggleGroup.appendChild(toggleContainer);
    
    return toggleGroup;
  }
  
  /**
   * Set the channel to edit
   * @param {Object} channel - Channel object
   */
  setChannel(channel) {
    this.currentChannel = channel;
    
    // Update modal title
    this.setTitle(`Edit Channel: ${channel.name}`);
    
    // Update form state from channel
    this.updateFormFromChannel();
  }
  
  /**
   * Update form fields from channel data
   */
  updateFormFromChannel() {
    if (!this.currentChannel) return;
    
    // Set form state
    this.formState = {
      name: this.currentChannel.name || '',
      description: this.currentChannel.description || '',
      isPublic: this.currentChannel.isPublic !== undefined ? this.currentChannel.isPublic : true,
      isEncrypted: this.currentChannel.isEncrypted !== undefined ? this.currentChannel.isEncrypted : true,
      allowExternalUsers: this.currentChannel.allowExternalUsers || false,
      errors: {},
      isSubmitting: false,
      hasChanges: false
    };
    
    // Update form inputs if already rendered
    if (this.nameInput) {
      this.nameInput.value = this.formState.name;
    }
    
    if (this.descriptionInput) {
      this.descriptionInput.value = this.formState.description;
    }
    
    if (this.publicRadio && this.privateRadio) {
      this.publicRadio.checked = this.formState.isPublic;
      this.privateRadio.checked = !this.formState.isPublic;
    }
    
    if (this.encryptedToggle) {
      this.encryptedToggle.checked = this.formState.isEncrypted;
    }
    
    if (this.externalUsersToggle) {
      this.externalUsersToggle.checked = this.formState.allowExternalUsers;
      this.externalUsersToggle.disabled = this.formState.isPublic;
    }
    
    // Hide error container
    if (this.errorContainer) {
      this.errorContainer.style.display = 'none';
    }
  }
  
  /**
   * Handle form submission
   * @param {Event} e - Submit event
   */
  async handleSubmit(e) {
    e.preventDefault();
    
    try {
      // Check if any changes were made
      if (!this.formState.hasChanges) {
        this.close();
        return;
      }
      
      // Validate form
      const validationResult = this.validate();
      if (!validationResult.valid) {
        return;
      }
      
      // Set submitting state
      this.formState.isSubmitting = true;
      this.updateSubmitButton();
      
      // Create update data object
      const updates = {
        name: this.formState.name.trim(),
        description: this.formState.description.trim(),
        isPublic: this.formState.isPublic,
        isEncrypted: this.formState.isEncrypted,
        allowExternalUsers: this.formState.allowExternalUsers && !this.formState.isPublic
      };
      
      // Remove unchanged fields
      if (updates.name === this.currentChannel.name) {
        delete updates.name;
      }
      
      if (updates.description === this.currentChannel.description) {
        delete updates.description;
      }
      
      if (updates.isPublic === this.currentChannel.isPublic) {
        delete updates.isPublic;
      }
      
      if (updates.isEncrypted === this.currentChannel.isEncrypted) {
        delete updates.isEncrypted;
      }
      
      if (updates.allowExternalUsers === this.currentChannel.allowExternalUsers) {
        delete updates.allowExternalUsers;
      }
      
      // Call onSubmit handler with channel ID and updates
      const success = await this.options.onSubmit(this.currentChannel.id, updates);
      
      if (success) {
        // Log successful update
        logChatEvent('admin', 'Channel updated', {
          channelId: this.currentChannel.id,
          channelName: this.currentChannel.name,
          updates: Object.keys(updates).join(', ')
        });
        
        // Close modal
        this.close();
      } else {
        // Show generic error
        this.showError('Failed to update channel. Please try again.');
      }
    } catch (error) {
      handleError(error, {
        code: ErrorCode.API_REQUEST_FAILED,
        category: ErrorCategory.DATA,
        source: 'EditChannelModal',
        message: 'Failed to update channel'
      });
      
      // Show error message
      this.showError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      // Reset submitting state
      this.formState.isSubmitting = false;
      this.updateSubmitButton();
    }
  }
  
  /**
   * Update submit button state based on form state
   */
  updateSubmitButton() {
    if (!this.submitButton) return;
    
    const disabled = !this.formState.hasChanges || this.formState.isSubmitting;
    
    this.submitButton.disabled = disabled;
    this.submitButton.textContent = this.formState.isSubmitting ? 'Saving...' : 'Save Changes';
    this.submitButton.style.opacity = disabled ? '0.6' : '1';
    this.submitButton.style.cursor = disabled ? 'not-allowed' : 'pointer';
  }
  /**
   * Handle input change
   * @param {string} field - Form field name
   * @param {any} value - New field value
   */
  handleInputChange(field, value) {
    // Store previous value
    const previousValue = this.formState[field];
    
    // Update form state
    this.formState[field] = value;
    
    // Handle special cases
    if (field === 'isPublic') {
      // Disable external users toggle for public channels
      if (value === true && this.externalUsersToggle) {
        this.externalUsersToggle.disabled = true;
        this.externalUsersToggle.checked = false;
        this.formState.allowExternalUsers = false;
      } else if (this.externalUsersToggle) {
        this.externalUsersToggle.disabled = false;
      }
    }
    
    // Clear field error
    if (this.formState.errors[field]) {
      this.formState.errors[field] = null;
      
      // Update field UI
      const input = field === 'name' ? this.nameInput :
                    field === 'description' ? this.descriptionInput : null;
                    
      if (input) {
        input.style.border = '1px solid #ddd';
        
        // Remove error message
        const parent = input.parentElement;
        const errorElement = parent.querySelector('.form-error');
        if (errorElement) {
          parent.removeChild(errorElement);
        }
      }
    }
    
    // Update change tracking only if the value actually changed
    if (previousValue !== value) {
      this.checkForChanges();
    }
  }
  
  /**
   * Check if form has changes compared to original channel
   */
  checkForChanges() {
    if (!this.currentChannel) return;
    
    // Compare current values with original
    const hasChanges = (
      this.formState.name !== this.currentChannel.name ||
      this.formState.description !== this.currentChannel.description ||
      this.formState.isPublic !== this.currentChannel.isPublic ||
      this.formState.isEncrypted !== this.currentChannel.isEncrypted ||
      (this.formState.allowExternalUsers !== this.currentChannel.allowExternalUsers && !this.formState.isPublic)
    );
    
    // Update form state
    this.formState.hasChanges = hasChanges;
    
    // Update submit button
    this.updateSubmitButton();
    
    // Update encryption warning if relevant
    const encryptionWarning = this.formElement?.querySelector('.encryption-warning');
    if (encryptionWarning && this.currentChannel.isEncrypted && !this.formState.isEncrypted) {
      encryptionWarning.style.display = 'block';
    } else if (encryptionWarning) {
      encryptionWarning.style.display = 'none';
    }
  }
  
  /**
   * Validate form fields
   * @returns {Object} Validation result
   */
  validate() {
    const errors = {};
    
    // Validate channel name
    const nameValidation = validateChannelName(this.formState.name);
    if (!nameValidation.valid) {
      errors.name = nameValidation.message;
    }
    
    // Validate description if provided
    if (this.formState.description) {
      const descValidation = validateChannelDescription(this.formState.description);
      if (!descValidation.valid) {
        errors.description = descValidation.message;
      }
    }
    
    // Update form state with errors
    this.formState.errors = errors;
    
    // Update UI for errors
    this.updateErrorUI();
    
    return {
      valid: Object.keys(errors).length === 0
    };
  }
  
  /**
   * Update UI to show validation errors
   */
  updateErrorUI() {
    // Update name input
    if (this.formState.errors.name && this.nameInput) {
      this.nameInput.style.border = '1px solid #f44336';
      
      // Add error message if not already present
      const parent = this.nameInput.parentElement;
      let errorElement = parent.querySelector('.form-error');
      
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        this.applyStyles(errorElement, {
          color: '#f44336',
          fontSize: '12px',
          marginTop: '4px'
        });
        parent.appendChild(errorElement);
      }
      
      errorElement.textContent = this.formState.errors.name;
    }
    
    // Update description input
    if (this.formState.errors.description && this.descriptionInput) {
      this.descriptionInput.style.border = '1px solid #f44336';
      
      // Add error message if not already present
      const parent = this.descriptionInput.parentElement;
      let errorElement = parent.querySelector('.form-error');
      
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        this.applyStyles(errorElement, {
          color: '#f44336',
          fontSize: '12px',
          marginTop: '4px'
        });
        parent.appendChild(errorElement);
      }
      
      errorElement.textContent = this.formState.errors.description;
    }
  }
  
  /**
   * Show form error message
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
   * Reset form to initial state
   */
  resetForm() {
    if (!this.currentChannel) return;
    
    // Reset form state from channel
    this.updateFormFromChannel();
  }
  
  /**
   * Show the modal
   */
  show() {
    // Verify we have a channel set
    if (!this.currentChannel) {
      console.error('Cannot show edit modal: No channel set');
      return;
    }
    
    // Reset form before showing
    this.resetForm();
    
    // Call parent show method
    super.show();
  }
}

export default EditChannelModal;