// chat/components/admin/channels/ChannelToolbar.js
// Channel toolbar component for HIPAA-compliant chat administration

import authContext from '../../../contexts/AuthContext.js';
import { logChatEvent } from '../../../utils/logger.js';
import { handleError, ErrorCategory, ErrorCode } from '../../../utils/error-handler.js';

/**
 * Channel Toolbar Component
 * Provides controls for channel management
 */
class ChannelToolbar {
  /**
   * Create a new ChannelToolbar
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Toolbar options
   * @param {Function} options.onCreateChannel - Create channel handler
   * @param {Function} options.onEditChannel - Edit channel handler
   * @param {Function} options.onDeleteChannel - Delete channel handler
   * @param {Function} options.onFilter - Filter change handler
   * @param {boolean} options.canCreate - Whether user can create channels
   * @param {boolean} options.canEdit - Whether user can edit channels
   * @param {boolean} options.canDelete - Whether user can delete channels
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      onCreateChannel: () => {},
      onEditChannel: () => {},
      onDeleteChannel: () => {},
      onFilter: () => {},
      canCreate: authContext.hasPermission('channel.create'),
      canEdit: authContext.hasPermission('channel.update'),
      canDelete: authContext.hasPermission('channel.delete'),
      ...options
    };
    
    // DOM elements
    this.toolbarElement = null;
    this.searchInput = null;
    this.createButton = null;
    this.editButton = null;
    this.deleteButton = null;
    
    // State
    this.selectedChannel = null;
    this.searchTimeout = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleCreateClick = this.handleCreateClick.bind(this);
    this.handleEditClick = this.handleEditClick.bind(this);
    this.handleDeleteClick = this.handleDeleteClick.bind(this);
    this.updateChannelSelection = this.updateChannelSelection.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the component
   */
  initialize() {
    try {
      // Create toolbar element
      this.toolbarElement = document.createElement('div');
      this.toolbarElement.className = 'channel-toolbar';
      this.applyStyles(this.toolbarElement, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '16px'
      });
      
      // Create search section
      const searchSection = document.createElement('div');
      searchSection.className = 'search-section';
      this.applyStyles(searchSection, {
        display: 'flex',
        alignItems: 'center',
        flex: '1',
        marginRight: '16px'
      });
      
      // Create search input
      const searchWrapper = document.createElement('div');
      searchWrapper.className = 'search-wrapper';
      this.applyStyles(searchWrapper, {
        position: 'relative',
        width: '100%',
        maxWidth: '400px'
      });
      
      // Search icon
      const searchIcon = document.createElement('span');
      searchIcon.innerHTML = '🔍';
      this.applyStyles(searchIcon, {
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '14px',
        color: '#666'
      });
      
      // Search input
      this.searchInput = document.createElement('input');
      this.searchInput.type = 'text';
      this.searchInput.placeholder = 'Search channels...';
      this.searchInput.className = 'search-input';
      this.applyStyles(this.searchInput, {
        width: '100%',
        padding: '10px 10px 10px 36px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px',
        boxSizing: 'border-box'
      });
      
      // Clear button (hidden initially)
      const clearButton = document.createElement('span');
      clearButton.innerHTML = '✕';
      clearButton.className = 'clear-button';
      this.applyStyles(clearButton, {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '14px',
        color: '#666',
        cursor: 'pointer',
        display: 'none'
      });
      
      // Add search event listener
      this.searchInput.addEventListener('input', this.handleSearch);
      
      // Add clear button event listener
      clearButton.addEventListener('click', () => {
        this.searchInput.value = '';
        clearButton.style.display = 'none';
        this.handleSearch({ target: this.searchInput });
      });
      
      // Add input events to show/hide clear button
      this.searchInput.addEventListener('input', () => {
        clearButton.style.display = this.searchInput.value ? 'block' : 'none';
      });
      
      // Add elements to search wrapper
      searchWrapper.appendChild(searchIcon);
      searchWrapper.appendChild(this.searchInput);
      searchWrapper.appendChild(clearButton);
      searchSection.appendChild(searchWrapper);
      
      // Create action section
      const actionSection = document.createElement('div');
      actionSection.className = 'action-section';
      this.applyStyles(actionSection, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      });
      
      // Create buttons
      
      // Create channel button
      if (this.options.canCreate) {
        this.createButton = this.createButton('Create Channel', 'primary', this.handleCreateClick);
        actionSection.appendChild(this.createButton);
      }
      
      // Edit channel button (disabled initially)
      if (this.options.canEdit) {
        this.editButton = this.createButton('Edit', 'secondary', this.handleEditClick);
        this.editButton.disabled = true;
        this.applyStyles(this.editButton, {
          opacity: '0.6',
          cursor: 'not-allowed'
        });
        actionSection.appendChild(this.editButton);
      }
      
      // Delete channel button (disabled initially)
      if (this.options.canDelete) {
        this.deleteButton = this.createButton('Delete', 'danger', this.handleDeleteClick);
        this.deleteButton.disabled = true;
        this.applyStyles(this.deleteButton, {
          opacity: '0.6',
          cursor: 'not-allowed'
        });
        actionSection.appendChild(this.deleteButton);
      }
      
      // Add sections to toolbar
      this.toolbarElement.appendChild(searchSection);
      this.toolbarElement.appendChild(actionSection);
      
      // Add to container
      if (this.container) {
        this.container.appendChild(this.toolbarElement);
      }
      
      // Listen for channel-create events (from ChannelTable empty state)
      document.addEventListener('channel-create', this.handleCreateClick);
      
      // Log initialization
      logChatEvent('ui', 'Channel toolbar initialized');
    } catch (error) {
      handleError(error, {
        code: ErrorCode.COMPONENT_FAILED,
        category: ErrorCategory.UI,
        source: 'ChannelToolbar',
        message: 'Failed to initialize channel toolbar'
      });
      
      // Show error in container
      if (this.container) {
        this.container.innerHTML = `
          <div style="padding: 16px; color: #f44336; text-align: center;">
            Error initializing channel toolbar: ${error.message || 'Unknown error'}
          </div>
        `;
      }
    }
  }
  
  /**
   * Create a button element
   * @param {string} text - Button text
   * @param {string} variant - Button variant (primary, secondary, danger)
   * @param {Function} onClick - Click handler
   * @returns {HTMLElement} Button element
   */
  createButton(text, variant, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.className = `channel-button channel-button-${variant}`;
    
    // Base styles
    this.applyStyles(button, {
      padding: '10px 16px',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      border: 'none',
      transition: 'background-color 0.2s, opacity 0.2s'
    });
    
    // Variant-specific styles
    switch (variant) {
      case 'primary':
        this.applyStyles(button, {
          backgroundColor: '#2196F3',
          color: 'white'
        });
        
        // Hover effect
        button.addEventListener('mouseover', () => {
          if (!button.disabled) {
            button.style.backgroundColor = '#1976D2';
          }
        });
        
        button.addEventListener('mouseout', () => {
          if (!button.disabled) {
            button.style.backgroundColor = '#2196F3';
          }
        });
        break;
        
      case 'secondary':
        this.applyStyles(button, {
          backgroundColor: '#f5f5f5',
          color: '#333',
          border: '1px solid #ddd'
        });
        
        // Hover effect
        button.addEventListener('mouseover', () => {
          if (!button.disabled) {
            button.style.backgroundColor = '#e0e0e0';
          }
        });
        
        button.addEventListener('mouseout', () => {
          if (!button.disabled) {
            button.style.backgroundColor = '#f5f5f5';
          }
        });
        break;
        
      case 'danger':
        this.applyStyles(button, {
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb'
        });
        
        // Hover effect
        button.addEventListener('mouseover', () => {
          if (!button.disabled) {
            button.style.backgroundColor = '#f5c6cb';
          }
        });
        
        button.addEventListener('mouseout', () => {
          if (!button.disabled) {
            button.style.backgroundColor = '#f8d7da';
          }
        });
        break;
    }
    
    // Add click handler
    button.addEventListener('click', onClick);
    
    return button;
  }
  
  /**
   * Handle search input
   * @param {Event} e - Input event
   */
  handleSearch(e) {
    const value = e.target.value.trim();
    
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Debounce search to prevent too many requests
    this.searchTimeout = setTimeout(() => {
      if (typeof this.options.onFilter === 'function') {
        this.options.onFilter(value);
      }
    }, 300);
  }
  
  /**
   * Handle create channel button click
   */
  handleCreateClick() {
    if (typeof this.options.onCreateChannel === 'function') {
      this.options.onCreateChannel();
    }
  }
  
  /**
   * Handle edit channel button click
   */
  handleEditClick() {
    if (this.selectedChannel && typeof this.options.onEditChannel === 'function') {
      this.options.onEditChannel(this.selectedChannel);
    }
  }
  
  /**
   * Handle delete channel button click
   */
  handleDeleteClick() {
    if (this.selectedChannel && typeof this.options.onDeleteChannel === 'function') {
      this.options.onDeleteChannel(this.selectedChannel);
    }
  }
  
  /**
   * Update channel selection state
   * @param {Object} channel - Selected channel or null
   */
  updateChannelSelection(channel) {
    this.selectedChannel = channel;
    
    // Update button states
    if (this.editButton) {
      this.editButton.disabled = !channel;
      this.applyStyles(this.editButton, {
        opacity: channel ? '1' : '0.6',
        cursor: channel ? 'pointer' : 'not-allowed'
      });
    }
    
    if (this.deleteButton) {
      this.deleteButton.disabled = !channel;
      this.applyStyles(this.deleteButton, {
        opacity: channel ? '1' : '0.6',
        cursor: channel ? 'pointer' : 'not-allowed'
      });
    }
  }
  
  /**
   * Set filter value
   * @param {string} value - Filter value
   */
  setFilter(value) {
    if (this.searchInput) {
      this.searchInput.value = value;
      
      // Trigger filter
      if (typeof this.options.onFilter === 'function') {
        this.options.onFilter(value);
      }
      
      // Update clear button
      const clearButton = this.toolbarElement.querySelector('.clear-button');
      if (clearButton) {
        clearButton.style.display = value ? 'block' : 'none';
      }
    }
  }
  
  /**
   * Get current filter value
   * @returns {string} Current filter value
   */
  getFilter() {
    return this.searchInput ? this.searchInput.value.trim() : '';
  }
  
  /**
   * Render the component (updates not needed for this simple component)
   */
  render() {
    // This component doesn't need complex rendering logic
    // It's updated through direct DOM manipulation
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
    try {
      // Clear timeout
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = null;
      }
      
      // Remove event listeners
      document.removeEventListener('channel-create', this.handleCreateClick);
      
      // Remove from DOM
      if (this.toolbarElement && this.toolbarElement.parentNode) {
        this.toolbarElement.parentNode.removeChild(this.toolbarElement);
      }
      
      // Log destruction
      logChatEvent('ui', 'Channel toolbar destroyed');
    } catch (error) {
      console.error('[ChannelToolbar] Error during destruction:', error);
    }
  }
}

export default ChannelToolbar;