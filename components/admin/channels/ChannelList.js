// chat/components/channels/ChannelList.js
// Channel list component for HIPAA-compliant chat

import {
    getAvailableChannels,
    addChannelListener,
    setActiveChannel,
    getActiveChannel,
    createChannel,
    hasPermission
  } from '../../../services/channelService.js';
  import { getCurrentUser, isAuthenticated } from '../../../services/auth';
  import { logChatEvent } from '../../../utils/logger.js';
  
  class ChannelList {
    constructor(container, onChannelSelect = null) {
      this.container = container;
      this.onChannelSelect = onChannelSelect;
      this.channelListElement = null;
      this.channels = [];
      this.activeChannel = getActiveChannel();
      this.unsubscribeListener = null;
      
      // Bind methods
      this.render = this.render.bind(this);
      this.updateChannelList = this.updateChannelList.bind(this);
      this.handleChannelClick = this.handleChannelClick.bind(this);
      this.showCreateChannelModal = this.showCreateChannelModal.bind(this);
      this.handleCreateChannel = this.handleCreateChannel.bind(this);
      
      // Initialize
      this.initialize();
    }
    
    /**
     * Initialize the channel list
     */
    initialize() {
      // Create container element
      this.channelListElement = document.createElement('div');
      this.channelListElement.className = 'channel-list';
      this.applyStyles(this.channelListElement, {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      });
      
      // Add to container
      if (this.container) {
        this.container.appendChild(this.channelListElement);
      }
      
      // Subscribe to channel updates
      this.unsubscribeListener = addChannelListener(this.updateChannelList);
      
      // Render initial state
      this.render();
      
      // Log initialization
      logChatEvent('ui', 'Channel list component initialized');
    }
    
    /**
     * Update the channel list
     * @param {Array} channels - Updated channel list
     */
    updateChannelList(channels) {
      this.channels = channels;
      this.render();
    }
    
    /**
     * Render the channel list
     */
    render() {
      if (!this.channelListElement) return;
      
      // Clear existing content
      this.channelListElement.innerHTML = '';
      
      // Create header
      const header = document.createElement('div');
      header.className = 'channel-list-header';
      this.applyStyles(header, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f5f5f5'
      });
      
      const headerTitle = document.createElement('h3');
      headerTitle.textContent = 'Channels';
      this.applyStyles(headerTitle, {
        margin: '0',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#333'
      });
      header.appendChild(headerTitle);
      
      // Add create channel button if user has permission
      const canCreateChannel = isAuthenticated() && hasPermission('channel.create');
      if (canCreateChannel) {
        const createButton = document.createElement('button');
        createButton.innerHTML = '&#43;'; // Plus sign
        createButton.title = 'Create Channel';
        this.applyStyles(createButton, {
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          cursor: 'pointer',
          outline: 'none'
        });
        
        createButton.addEventListener('click', this.showCreateChannelModal);
        header.appendChild(createButton);
      }
      
      this.channelListElement.appendChild(header);
      
      // Create scrollable channel container
      const channelContainer = document.createElement('div');
      channelContainer.className = 'channel-list-container';
      this.applyStyles(channelContainer, {
        flex: '1',
        overflowY: 'auto',
        padding: '8px 0'
      });
      
      // Group channels by type
      const publicChannels = this.channels.filter(c => c.type === 'public');
      const privateChannels = this.channels.filter(c => c.type === 'private');
      
      // Add public channels
      if (publicChannels.length > 0) {
        const publicHeader = this.createChannelGroupHeader('Public Channels');
        channelContainer.appendChild(publicHeader);
        
        publicChannels.forEach(channel => {
          const channelItem = this.createChannelItem(channel);
          channelContainer.appendChild(channelItem);
        });
      }
      
      // Add private channels
      if (privateChannels.length > 0) {
        const privateHeader = this.createChannelGroupHeader('Private Channels');
        channelContainer.appendChild(privateHeader);
        
        privateChannels.forEach(channel => {
          const channelItem = this.createChannelItem(channel);
          channelContainer.appendChild(channelItem);
        });
      }
      
      // Add empty state if no channels
      if (this.channels.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        this.applyStyles(emptyState, {
          padding: '20px',
          textAlign: 'center',
          color: '#666'
        });
        
        emptyState.textContent = 'No channels available';
        channelContainer.appendChild(emptyState);
      }
      
      this.channelListElement.appendChild(channelContainer);
    }
    
    /**
     * Create a channel group header
     * @param {string} title - Group title
     * @returns {HTMLElement} Header element
     */
    createChannelGroupHeader(title) {
      const header = document.createElement('div');
      header.className = 'channel-group-header';
      this.applyStyles(header, {
        padding: '6px 16px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      });
      
      header.textContent = title;
      return header;
    }
    
    /**
     * Create a channel item
     * @param {Object} channel - Channel data
     * @returns {HTMLElement} Channel item element
     */
    createChannelItem(channel) {
      const item = document.createElement('div');
      item.className = 'channel-item';
      item.setAttribute('data-channel-id', channel.id);
      
      const isActive = channel.id === this.activeChannel;
      
      this.applyStyles(item, {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        cursor: 'pointer',
        backgroundColor: isActive ? '#e3f2fd' : 'transparent',
        borderLeft: isActive ? '3px solid #2196F3' : '3px solid transparent',
        transition: 'background-color 0.2s'
      });
      
      // Create channel icon
      const icon = document.createElement('span');
      icon.className = 'channel-icon';
      icon.innerHTML = channel.type === 'public' ? '&#127760;' : '&#128274;'; // Globe or Lock
      this.applyStyles(icon, {
        marginRight: '8px',
        fontSize: '14px'
      });
      
      // Create channel name
      const name = document.createElement('span');
      name.className = 'channel-name';
      name.textContent = channel.name;
      this.applyStyles(name, {
        flex: '1',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontWeight: isActive ? 'bold' : 'normal'
      });
      
      // Add unread indicator if needed
      if (channel.unreadCount && channel.unreadCount > 0) {
        const unread = document.createElement('span');
        unread.className = 'unread-indicator';
        unread.textContent = channel.unreadCount > 99 ? '99+' : channel.unreadCount;
        this.applyStyles(unread, {
          backgroundColor: '#f44336',
          color: 'white',
          borderRadius: '10px',
          padding: '2px 6px',
          fontSize: '10px',
          fontWeight: 'bold'
        });
        
        item.appendChild(unread);
      }
      
      // Add event listener
      item.addEventListener('click', () => this.handleChannelClick(channel));
      
      // Append elements
      item.appendChild(icon);
      item.appendChild(name);
      
      return item;
    }
    
    /**
     * Handle channel click
     * @param {Object} channel - Selected channel
     */
    handleChannelClick(channel) {
      // Set active channel
      setActiveChannel(channel.id);
      this.activeChannel = channel.id;
      
      // Call callback if provided
      if (this.onChannelSelect && typeof this.onChannelSelect === 'function') {
        this.onChannelSelect(channel);
      }
      
      // Update UI
      this.render();
      
      // Log channel selection
      logChatEvent('ui', 'Channel selected', { channelId: channel.id, channelName: channel.name });
    }
    
    /**
     * Show create channel modal
     */
    showCreateChannelModal() {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      this.applyStyles(overlay, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '1000'
      });
      
      // Create modal content
      const modal = document.createElement('div');
      modal.className = 'modal-content';
      this.applyStyles(modal, {
        backgroundColor: 'white',
        borderRadius: '4px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden'
      });
      
      // Create modal header
      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';
      this.applyStyles(modalHeader, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f5f5f5'
      });
      
      const modalTitle = document.createElement('h3');
      modalTitle.textContent = 'Create New Channel';
      this.applyStyles(modalTitle, {
        margin: '0',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#333'
      });
      
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      closeButton.title = 'Close';
      this.applyStyles(closeButton, {
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '20px',
        color: '#666',
        cursor: 'pointer',
        padding: '0',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      });
      
      closeButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
      });
      
      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeButton);
      modal.appendChild(modalHeader);
      
      // Create modal body
      const modalBody = document.createElement('div');
      modalBody.className = 'modal-body';
      this.applyStyles(modalBody, {
        padding: '16px'
      });
      
      // Create form
      const form = document.createElement('form');
      form.className = 'channel-form';
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateChannel(form, overlay);
      });
      
      // Channel name field
      const nameGroup = document.createElement('div');
      this.applyStyles(nameGroup, {
        marginBottom: '16px'
      });
      
      const nameLabel = document.createElement('label');
      nameLabel.htmlFor = 'channel-name';
      nameLabel.textContent = 'Channel Name';
      this.applyStyles(nameLabel, {
        display: 'block',
        marginBottom: '8px',
        fontWeight: 'bold'
      });
      
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.id = 'channel-name';
      nameInput.name = 'name';
      nameInput.required = true;
      nameInput.placeholder = 'Enter channel name';
      this.applyStyles(nameInput, {
        display: 'block',
        width: '100%',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box'
      });
      
      nameGroup.appendChild(nameLabel);
      nameGroup.appendChild(nameInput);
      form.appendChild(nameGroup);
      
      // Channel description field
      const descGroup = document.createElement('div');
      this.applyStyles(descGroup, {
        marginBottom: '16px'
      });
      
      const descLabel = document.createElement('label');
      descLabel.htmlFor = 'channel-description';
      descLabel.textContent = 'Description';
      this.applyStyles(descLabel, {
        display: 'block',
        marginBottom: '8px',
        fontWeight: 'bold'
      });
      
      const descInput = document.createElement('textarea');
      descInput.id = 'channel-description';
      descInput.name = 'description';
      descInput.placeholder = 'Enter channel description (optional)';
      this.applyStyles(descInput, {
        display: 'block',
        width: '100%',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
        minHeight: '80px',
        resize: 'vertical'
      });
      
      descGroup.appendChild(descLabel);
      descGroup.appendChild(descInput);
      form.appendChild(descGroup);
      
      // Channel type field
      const typeGroup = document.createElement('div');
      this.applyStyles(typeGroup, {
        marginBottom: '16px'
      });
      
      const typeLabel = document.createElement('label');
      typeLabel.textContent = 'Channel Type';
      this.applyStyles(typeLabel, {
        display: 'block',
        marginBottom: '8px',
        fontWeight: 'bold'
      });
      
      const typeOptions = document.createElement('div');
      this.applyStyles(typeOptions, {
        display: 'flex',
        gap: '16px'
      });
      
      // Public option
      const publicOption = document.createElement('div');
      this.applyStyles(publicOption, {
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      });
      
      const publicInput = document.createElement('input');
      publicInput.type = 'radio';
      publicInput.id = 'channel-type-public';
      publicInput.name = 'type';
      publicInput.value = 'public';
      publicInput.checked = true;
      
      const publicLabel = document.createElement('label');
      publicLabel.htmlFor = 'channel-type-public';
      publicLabel.textContent = 'Public';
      
      publicOption.appendChild(publicInput);
      publicOption.appendChild(publicLabel);
      
      // Private option
      const privateOption = document.createElement('div');
      this.applyStyles(privateOption, {
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      });
      
      const privateInput = document.createElement('input');
      privateInput.type = 'radio';
      privateInput.id = 'channel-type-private';
      privateInput.name = 'type';
      privateInput.value = 'private';
      
      const privateLabel = document.createElement('label');
      privateLabel.htmlFor = 'channel-type-private';
      privateLabel.textContent = 'Private';
      
      privateOption.appendChild(privateInput);
      privateOption.appendChild(privateLabel);
      
      typeOptions.appendChild(publicOption);
      typeOptions.appendChild(privateOption);
      typeGroup.appendChild(typeLabel);
      typeGroup.appendChild(typeOptions);
      form.appendChild(typeGroup);
      
      // Submit button
      const submitBtn = document.createElement('button');
      submitBtn.type = 'submit';
      submitBtn.textContent = 'Create Channel';
      this.applyStyles(submitBtn, {
        backgroundColor: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '10px 16px',
        cursor: 'pointer',
        fontWeight: 'bold',
        marginTop: '8px'
      });
      
      form.appendChild(submitBtn);
      modalBody.appendChild(form);
      modal.appendChild(modalBody);
      
      // Add modal to overlay
      overlay.appendChild(modal);
      
      // Add overlay to body
      document.body.appendChild(overlay);
      
      // Focus name input
      nameInput.focus();
    }
    
    /**
     * Handle create channel form submission
     * @param {HTMLFormElement} form - The form element
     * @param {HTMLElement} overlay - The modal overlay element
     */
    async handleCreateChannel(form, overlay) {
      // Get form data
      const formData = new FormData(form);
      const channelName = formData.get('name');
      const channelDescription = formData.get('description');
      const channelType = formData.get('type');
      
      // Validate
      if (!channelName) {
        alert('Channel name is required');
        return;
      }
      
      try {
        // Prepare channel data
        const channelData = {
          name: channelName,
          description: channelDescription,
          type: channelType || 'public'
        };
        
        // Create channel
        const result = await createChannel(channelData);
        
        if (result.success) {
          // Close modal
          document.body.removeChild(overlay);
          
          // Set as active channel
          setActiveChannel(result.channel.id);
          this.activeChannel = result.channel.id;
          
          // Log creation
          logChatEvent('ui', 'Channel created', { 
            channelId: result.channel.id,
            channelName: result.channel.name,
            channelType: result.channel.type
          });
          
          // Call callback if provided
          if (this.onChannelSelect && typeof this.onChannelSelect === 'function') {
            this.onChannelSelect(result.channel);
          }
        } else {
          alert('Error creating channel: ' + result.error);
        }
      } catch (error) {
        console.error('[CRM Extension] Error creating channel:', error);
        alert('An error occurred while creating the channel');
      }
    }
    
    /**
     * Apply CSS styles to an element
     * @param {HTMLElement} element - Element to style
     * @param {Object} styles - Styles to apply
     */
    applyStyles(element, styles) {
      Object.assign(element.style, styles);
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
      // Unsubscribe from channel updates
      if (this.unsubscribeListener) {
        this.unsubscribeListener();
        this.unsubscribeListener = null;
      }
      
      // Remove from DOM
      if (this.channelListElement && this.channelListElement.parentNode) {
        this.channelListElement.parentNode.removeChild(this.channelListElement);
      }
      
      // Log destruction
      logChatEvent('ui', 'Channel list component destroyed');
    }
  }
  
  export default ChannelList;