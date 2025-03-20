// chat/components/admin/ChannelManager.js
// Channel management component for HIPAA-compliant chat

import ChannelTable from './channels/ChannelTable.js';
import ChannelToolbar from './channels/ChannelToolbar.js';
import CreateChannelModal from './channels/CreateChannelModal.js';
import EditChannelModal from './channels/EditChannelModal.js';
import DeleteChannelModal from './channels/DeleteChannelModal.js';
import authContext from '../../contexts/AuthContext.js';
import { logChatEvent } from '../../utils/logger.js';
import { handleError, ErrorCategory, ErrorCode } from '../../utils/error-handler.js';
import { getAllChannels, createChannel, updateChannel, deleteChannel } from '../../services/api/channels.js';

/**
 * Channel Management Component
 * Administrative interface for managing chat channels
 */
class ChannelManager {
  /**
   * Create a new ChannelManager
   * @param {HTMLElement} container - Container element
   */
  constructor(container) {
    this.container = container;
    this.state = {
      channels: [],
      loading: true,
      error: null,
      selectedChannel: null,
      filter: '',
      page: 1,
      pageSize: 10,
      sortField: 'name',
      sortDirection: 'asc'
    };
    
    // Component references
    this.managerElement = null;
    this.toolbarElement = null;
    this.tableElement = null;
    
    // Sub-component instances
    this.channelTable = null;
    this.channelToolbar = null;
    this.createChannelModal = null;
    this.editChannelModal = null;
    this.deleteChannelModal = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.loadChannels = this.loadChannels.bind(this);
    this.handleCreateChannel = this.handleCreateChannel.bind(this);
    this.handleEditChannel = this.handleEditChannel.bind(this);
    this.handleDeleteChannel = this.handleDeleteChannel.bind(this);
    this.handleChannelSelect = this.handleChannelSelect.bind(this);
    this.handleFilter = this.handleFilter.bind(this);
    this.handleSort = this.handleSort.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the component
   */
  initialize() {
    try {
      // Check permissions
      if (!authContext.hasPermission('channel.read')) {
        throw new Error('Permission denied: Cannot access channel management');
      }
      
      // Create container element
      this.managerElement = document.createElement('div');
      this.managerElement.className = 'channel-manager';
      this.applyStyles(this.managerElement, {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px',
        boxSizing: 'border-box'
      });
      
      // Create toolbar container
      this.toolbarElement = document.createElement('div');
      this.toolbarElement.className = 'channel-manager-toolbar-container';
      
      // Create table container
      this.tableElement = document.createElement('div');
      this.tableElement.className = 'channel-manager-table-container';
      this.applyStyles(this.tableElement, {
        flex: '1',
        overflowY: 'auto',
        marginTop: '16px'
      });
      
      // Add elements to container
      this.managerElement.appendChild(this.toolbarElement);
      this.managerElement.appendChild(this.tableElement);
      
      if (this.container) {
        this.container.appendChild(this.managerElement);
      }
      
      // Create toolbar component
      this.channelToolbar = new ChannelToolbar(this.toolbarElement, {
        onCreateChannel: this.handleCreateChannel,
        onEditChannel: () => {
          if (this.state.selectedChannel) {
            this.handleEditChannel(this.state.selectedChannel);
          } else {
            alert('Please select a channel to edit');
          }
        },
        onDeleteChannel: () => {
          if (this.state.selectedChannel) {
            this.handleDeleteChannel(this.state.selectedChannel);
          } else {
            alert('Please select a channel to delete');
          }
        },
        onFilter: this.handleFilter,
        canCreate: authContext.hasPermission('channel.create'),
        canEdit: authContext.hasPermission('channel.update'),
        canDelete: authContext.hasPermission('channel.delete')
      });
      
      // Create table component
      this.channelTable = new ChannelTable(this.tableElement, {
        channels: [],
        loading: true,
        onSelect: this.handleChannelSelect,
        onSort: this.handleSort,
        onPageChange: this.handlePageChange,
        pageSize: this.state.pageSize,
        currentPage: this.state.page,
        totalItems: 0,
        sortField: this.state.sortField,
        sortDirection: this.state.sortDirection
      });
      
      // Create modals
      this.createChannelModal = new CreateChannelModal({
        onSubmit: async (channelData) => {
          try {
            const result = await createChannel(channelData);
            
            if (result.success) {
              logChatEvent('admin', 'Channel created', {
                channelName: channelData.name
              });
              
              this.loadChannels();
              return true;
            } else {
              throw new Error(result.error || 'Failed to create channel');
            }
          } catch (error) {
            handleError(error, {
              code: ErrorCode.API_REQUEST_FAILED,
              category: ErrorCategory.DATA,
              source: 'ChannelManager',
              message: 'Failed to create channel'
            });
            
            return false;
          }
        }
      });
      
      this.editChannelModal = new EditChannelModal({
        onSubmit: async (channelId, updates) => {
          try {
            const result = await updateChannel(channelId, updates);
            
            if (result.success) {
              logChatEvent('admin', 'Channel updated', {
                channelId,
                channelName: updates.name
              });
              
              this.loadChannels();
              return true;
            } else {
              throw new Error(result.error || 'Failed to update channel');
            }
          } catch (error) {
            handleError(error, {
              code: ErrorCode.API_REQUEST_FAILED,
              category: ErrorCategory.DATA,
              source: 'ChannelManager',
              message: 'Failed to update channel'
            });
            
            return false;
          }
        }
      });
      
      this.deleteChannelModal = new DeleteChannelModal({
        onSubmit: async (channelId) => {
          try {
            const result = await deleteChannel(channelId);
            
            if (result.success) {
              logChatEvent('admin', 'Channel deleted', {
                channelId
              });
              
              // Reset selected channel if it was deleted
              if (this.state.selectedChannel && this.state.selectedChannel.id === channelId) {
                this.setState({ selectedChannel: null });
              }
              
              this.loadChannels();
              return true;
            } else {
              throw new Error(result.error || 'Failed to delete channel');
            }
          } catch (error) {
            handleError(error, {
              code: ErrorCode.API_REQUEST_FAILED,
              category: ErrorCategory.DATA,
              source: 'ChannelManager',
              message: 'Failed to delete channel'
            });
            
            return false;
          }
        }
      });
      
      // Load channels
      this.loadChannels();
      
      // Log initialization
      logChatEvent('admin', 'Channel manager initialized');
    } catch (error) {
      handleError(error, {
        code: ErrorCode.INITIALIZATION_FAILED,
        category: ErrorCategory.SYSTEM,
        source: 'ChannelManager',
        message: 'Failed to initialize channel manager'
      });
      
      // Display error in container
      if (this.container) {
        this.container.innerHTML = '';
        
        const errorElement = document.createElement('div');
        errorElement.className = 'channel-manager-error';
        this.applyStyles(errorElement, {
          padding: '16px',
          color: '#f44336',
          textAlign: 'center'
        });
        
        errorElement.textContent = 'Error: ' + (error.message || 'Failed to initialize channel manager');
        
        this.container.appendChild(errorElement);
      }
    }
  }
  
  /**
   * Update component state
   * @param {Object} newState - New state to merge
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }
  
  /**
   * Load channels from API
   */
  async loadChannels() {
    try {
      this.setState({ loading: true, error: null });
      
      // Calculate pagination
      const start = (this.state.page - 1) * this.state.pageSize;
      const end = start + this.state.pageSize;
      
      // Get all channels
      const result = await getAllChannels({
        filter: this.state.filter,
        sort: this.state.sortField,
        direction: this.state.sortDirection
      });
      
      if (result.success) {
        // Apply filter if present
        let filteredChannels = result.data.channels;
        if (this.state.filter) {
          const filterLower = this.state.filter.toLowerCase();
          filteredChannels = filteredChannels.filter(channel => 
            channel.name.toLowerCase().includes(filterLower) ||
            (channel.description && channel.description.toLowerCase().includes(filterLower))
          );
        }
        
        // Get total count and paginated subset
        const totalItems = filteredChannels.length;
        const paginatedChannels = filteredChannels.slice(start, end);
        
        this.setState({
          channels: paginatedChannels,
          loading: false,
          totalItems
        });
      } else {
        throw new Error(result.message || 'Failed to load channels');
      }
    } catch (error) {
      handleError(error, {
        code: ErrorCode.DATA_NOT_FOUND,
        category: ErrorCategory.DATA,
        source: 'ChannelManager',
        message: 'Failed to load channels'
      });
      
      this.setState({
        loading: false,
        error: error.message || 'Failed to load channels'
      });
    }
  }
  
  /**
   * Handle channel creation
   */
  handleCreateChannel() {
    if (this.createChannelModal) {
      this.createChannelModal.show();
    }
  }
  
  /**
   * Handle channel editing
   * @param {Object} channel - Channel to edit
   */
  handleEditChannel(channel) {
    if (this.editChannelModal) {
      this.editChannelModal.setChannel(channel);
      this.editChannelModal.show();
    }
  }
  
  /**
   * Handle channel deletion
   * @param {Object} channel - Channel to delete
   */
  handleDeleteChannel(channel) {
    if (this.deleteChannelModal) {
      this.deleteChannelModal.setChannel(channel);
      this.deleteChannelModal.show();
    }
  }
  
  /**
   * Handle channel selection
   * @param {Object} channel - Selected channel
   */
  handleChannelSelect(channel) {
    this.setState({ selectedChannel: channel });
    
    // Update toolbar state
    if (this.channelToolbar) {
      this.channelToolbar.updateChannelSelection(channel);
    }
  }
  
  /**
   * Handle filter change
   * @param {string} filter - New filter value
   */
  handleFilter(filter) {
    this.setState({ filter, page: 1 }, () => {
      this.loadChannels();
    });
  }
  
  /**
   * Handle sort change
   * @param {string} field - Field to sort by
   */
  handleSort(field) {
    // Toggle direction if same field, otherwise default to ascending
    const sortDirection = field === this.state.sortField && this.state.sortDirection === 'asc' ? 
      'desc' : 'asc';
    
    this.setState({ sortField: field, sortDirection }, () => {
      this.loadChannels();
    });
  }
  
  /**
   * Handle page change
   * @param {number} page - New page number
   */
  handlePageChange(page) {
    this.setState({ page }, () => {
      this.loadChannels();
    });
  }
  
  /**
   * Render the component
   */
  render() {
    // Update table with new data
    if (this.channelTable) {
      this.channelTable.update({
        channels: this.state.channels,
        loading: this.state.loading,
        pageSize: this.state.pageSize,
        currentPage: this.state.page,
        totalItems: this.state.totalItems,
        sortField: this.state.sortField,
        sortDirection: this.state.sortDirection,
        selectedChannelId: this.state.selectedChannel ? this.state.selectedChannel.id : null
      });
    }
    
    // Show error if present
    if (this.state.error && this.tableElement) {
      // Clear existing error
      const existingError = this.tableElement.querySelector('.channel-manager-error');
      if (existingError) {
        existingError.remove();
      }
      
      // Create error element
      const errorElement = document.createElement('div');
      errorElement.className = 'channel-manager-error';
      this.applyStyles(errorElement, {
        padding: '16px',
        marginTop: '16px',
        backgroundColor: '#ffebee',
        color: '#f44336',
        borderRadius: '4px',
        textAlign: 'center'
      });
      
      errorElement.textContent = 'Error: ' + this.state.error;
      
      // Add refresh button
      const refreshButton = document.createElement('button');
      refreshButton.textContent = 'Try Again';
      this.applyStyles(refreshButton, {
        marginLeft: '16px',
        padding: '4px 8px',
        backgroundColor: '#f44336',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      });
      
      refreshButton.addEventListener('click', () => {
        this.loadChannels();
      });
      
      errorElement.appendChild(refreshButton);
      this.tableElement.appendChild(errorElement);
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
   * Refresh channels
   */
  refresh() {
    this.loadChannels();
  }
  
  /**
   * Set filter value
   * @param {string} filter - Filter value
   */
  setFilter(filter) {
    this.setState({ filter, page: 1 }, () => {
      this.loadChannels();
    });
  }
  
  /**
   * Get currently selected channel
   * @returns {Object|null} Selected channel
   */
  getSelectedChannel() {
    return this.state.selectedChannel;
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    try {
      // Destroy modals
      if (this.createChannelModal) {
        this.createChannelModal.destroy();
      }
      
      if (this.editChannelModal) {
        this.editChannelModal.destroy();
      }
      
      if (this.deleteChannelModal) {
        this.deleteChannelModal.destroy();
      }
      
      // Destroy table
      if (this.channelTable) {
        this.channelTable.destroy();
      }
      
      // Destroy toolbar
      if (this.channelToolbar) {
        this.channelToolbar.destroy();
      }
      
      // Remove from DOM
      if (this.managerElement && this.managerElement.parentNode) {
        this.managerElement.parentNode.removeChild(this.managerElement);
      }
      
      // Log destruction
      logChatEvent('admin', 'Channel manager destroyed');
    } catch (error) {
      console.error('[ChannelManager] Error during destruction:', error);
    }
  }
}

export default ChannelManager;