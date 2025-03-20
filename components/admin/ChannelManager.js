// chat/components/admin/ChannelManager.js
// Channel management component for HIPAA-compliant chat

import { 
    getCurrentUser, 
    hasPermission 
  } from '../../services/auth';
  import { getAvailableChannels } from '../../services/channelService.js';
  import { logChatEvent } from '../../utils/logger.js';
  import ChannelTable from './channels/ChannelTable.js';
  import ChannelToolbar from './channels/ChannelToolbar.js';
  import CreateChannelModal from './channels/CreateChannelModal.js';
  import EditChannelModal from './channels/EditChannelModal.js';
  import DeleteChannelModal from './channels/DeleteChannelModal.js';
  
  /**
   * Channel Manager Component
   * Provides channel management functionality for administrators
   */
  class ChannelManager {
    /**
     * Create a new ChannelManager
     * @param {HTMLElement} container - The container element
     */
    constructor(container) {
      this.container = container;
      this.channelManagerElement = null;
      this.channels = [];
      this.isLoading = false;
      
      // Filter state
      this.searchTerm = '';
      this.typeFilter = 'all';
      this.currentPage = 1;
      this.pageSize = 10;
      
      // Sub-components
      this.channelTable = null;
      this.channelToolbar = null;
      
      // Bind methods
      this.render = this.render.bind(this);
      this.loadChannels = this.loadChannels.bind(this);
      this.handleSearch = this.handleSearch.bind(this);
      this.handleTypeFilter = this.handleTypeFilter.bind(this);
      this.handlePageChange = this.handlePageChange.bind(this);
      this.showCreateChannelModal = this.showCreateChannelModal.bind(this);
      this.showEditChannelModal = this.showEditChannelModal.bind(this);
      this.showDeleteChannelModal = this.showDeleteChannelModal.bind(this);
      
      // Initialize
      this.initialize();
    }
    
    /**
     * Initialize the channel manager
     */
    initialize() {
      // Create container element
      this.channelManagerElement = document.createElement('div');
      this.channelManagerElement.className = 'channel-manager';
      this.applyStyles(this.channelManagerElement, {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#f8f9fa'
      });
      
      // Add to container
      if (this.container) {
        this.container.appendChild(this.channelManagerElement);
      }
      
      // Load channels
      this.loadChannels();
      
      // Log initialization
      logChatEvent('admin', 'Channel manager initialized');
    }
    
    /**
     * Load channels from the server
     */
    async loadChannels() {
      try {
        this.isLoading = true;
        this.render(); // Show loading state
        
        // Get channels from service
        this.channels = getAvailableChannels();
        console.log('[CRM Extension] Loaded channels:', this.channels.length);
        
        this.isLoading = false;
        this.render();
      } catch (error) {
        console.error('[CRM Extension] Error loading channels:', error);
        this.isLoading = false;
        this.channels = [];
        this.render();
      }
    }
    
    /**
     * Render the channel manager
     */
    render() {
      if (!this.channelManagerElement) return;
      
      // Clear existing content
      this.channelManagerElement.innerHTML = '';
      
      // Check permissions
      const currentUser = getCurrentUser();
      const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
      
      if (!isAdmin) {
        this.renderAccessDenied();
        return;
      }
      
      // Create header
      const header = document.createElement('div');
      header.className = 'channel-manager-header';
      this.applyStyles(header, {
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      });
      
      const titleBlock = document.createElement('div');
      
      const title = document.createElement('h3');
      title.textContent = 'Channel Management';
      this.applyStyles(title, {
        margin: '0 0 8px 0',
        fontSize: '20px',
        fontWeight: 'bold'
      });
      
      const subtitle = document.createElement('p');
      subtitle.textContent = `${this.channels.length} channels available`;
      this.applyStyles(subtitle, {
        margin: '0',
        color: '#6c757d',
        fontSize: '14px'
      });
      
      titleBlock.appendChild(title);
      titleBlock.appendChild(subtitle);
      
      // Action buttons
      const actionButtons = document.createElement('div');
      this.applyStyles(actionButtons, {
        display: 'flex',
        gap: '10px'
      });
      
      // Create channel button
      const createButton = document.createElement('button');
      createButton.textContent = 'Create Channel';
      this.applyStyles(createButton, {
        padding: '8px 16px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center'
      });
      
      createButton.addEventListener('click', this.showCreateChannelModal);
      
      const createIcon = document.createElement('span');
      createIcon.textContent = '➕';
      this.applyStyles(createIcon, {
        marginRight: '5px'
      });
      
      createButton.prepend(createIcon);
      actionButtons.appendChild(createButton);
      
      header.appendChild(titleBlock);
      header.appendChild(actionButtons);
      this.channelManagerElement.appendChild(header);
      
      // Create and render toolbar (search + filters)
      this.channelToolbar = new ChannelToolbar({
        searchTerm: this.searchTerm,
        typeFilter: this.typeFilter,
        onSearch: this.handleSearch,
        onTypeFilterChange: this.handleTypeFilter,
        onRefresh: this.loadChannels
      });
      
      this.channelManagerElement.appendChild(this.channelToolbar.render());
      
      // Show loading state or render channel table
      if (this.isLoading) {
        const loadingElement = document.createElement('div');
        this.applyStyles(loadingElement, {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '50px',
          color: '#6c757d'
        });
        
        loadingElement.textContent = 'Loading channels...';
        this.channelManagerElement.appendChild(loadingElement);
      } else {
        // Filter channels
        const filteredChannels = this.filterChannels();
        
        // Create and render channel table
        this.channelTable = new ChannelTable({
          channels: filteredChannels,
          currentPage: this.currentPage,
          pageSize: this.pageSize,
          onPageChange: this.handlePageChange,
          onEditChannel: this.showEditChannelModal,
          onDeleteChannel: this.showDeleteChannelModal
        });
        
        this.channelManagerElement.appendChild(this.channelTable.render());
      }
      
      return this.channelManagerElement;
    }
    
    /**
     * Filter channels based on search term and type filter
     * @returns {Array} Filtered channels
     */
    filterChannels() {
      return this.channels.filter(channel => {
        // Apply search filter
        const matchesSearch = this.searchTerm === '' || 
          (channel.name && channel.name.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
          (channel.description && channel.description.toLowerCase().includes(this.searchTerm.toLowerCase()));
        
        // Apply type filter
        const matchesType = this.typeFilter === 'all' || channel.type === this.typeFilter;
        
        return matchesSearch && matchesType;
      });
    }
    
    /**
     * Render access denied message
     */
    renderAccessDenied() {
      this.channelManagerElement.innerHTML = '';
      
      const accessDenied = document.createElement('div');
      this.applyStyles(accessDenied, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '20px',
        textAlign: 'center',
        color: '#721c24',
        backgroundColor: '#f8d7da'
      });
      
      const iconElement = document.createElement('div');
      iconElement.innerHTML = '⛔';
      this.applyStyles(iconElement, {
        fontSize: '48px',
        marginBottom: '16px'
      });
      
      const titleElement = document.createElement('h3');
      titleElement.textContent = 'Access Denied';
      this.applyStyles(titleElement, {
        margin: '0 0 10px 0',
        fontSize: '24px'
      });
      
      const messageElement = document.createElement('p');
      messageElement.textContent = 'Administrator or moderator privileges are required to access Channel Management.';
      
      accessDenied.appendChild(iconElement);
      accessDenied.appendChild(titleElement);
      accessDenied.appendChild(messageElement);
      
      this.channelManagerElement.appendChild(accessDenied);
      
      // Log access attempt
      logChatEvent('admin', 'Access denied to channel management');
    }
    
    /**
     * Handle search input
     * @param {string} searchTerm - Search term
     */
    handleSearch(searchTerm) {
      this.searchTerm = searchTerm;
      this.currentPage = 1; // Reset to first page
      this.render();
    }
    
    /**
     * Handle type filter change
     * @param {string} type - Type to filter by
     */
    handleTypeFilter(type) {
      this.typeFilter = type;
      this.currentPage = 1; // Reset to first page
      this.render();
    }
    
    /**
     * Handle page change
     * @param {number} page - New page number
     */
    handlePageChange(page) {
      this.currentPage = page;
      this.render();
    }
    
    /**
     * Show create channel modal
     */
    showCreateChannelModal() {
      const modal = new CreateChannelModal({
        onSuccess: () => this.loadChannels()
      });
      modal.show();
    }
    
    /**
     * Show edit channel modal
     * @param {Object} channel - Channel to edit
     */
    showEditChannelModal(channel) {
      const modal = new EditChannelModal({
        channel,
        onSuccess: () => this.loadChannels()
      });
      modal.show();
    }
    
    /**
     * Show delete channel modal
     * @param {Object} channel - Channel to delete
     */
    showDeleteChannelModal(channel) {
      const modal = new DeleteChannelModal({
        channel,
        onSuccess: () => this.loadChannels()
      });
      modal.show();
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
     * Destroy the component
     */
    destroy() {
      // Remove from DOM
      if (this.channelManagerElement && this.channelManagerElement.parentNode) {
        this.channelManagerElement.parentNode.removeChild(this.channelManagerElement);
      }
      
      // Cleanup subcomponents
      if (this.channelTable) {
        this.channelTable.destroy();
      }
      
      if (this.channelToolbar) {
        this.channelToolbar.destroy();
      }
      
      // Log destruction
      logChatEvent('admin', 'Channel manager destroyed');
    }
  }
  
  export default ChannelManager;