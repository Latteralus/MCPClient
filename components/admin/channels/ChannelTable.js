// chat/components/admin/channels/ChannelTable.js
// Channel table component for HIPAA-compliant chat administration

import authContext from '../../../contexts/AuthContext.js';
import { logChatEvent } from '../../../utils/logger.js';
import { handleError, ErrorCategory, ErrorCode } from '../../../utils/error-handler.js';

/**
 * Channel Table Component
 * Displays a table of channels with sorting and pagination
 */
class ChannelTable {
  /**
   * Create a new ChannelTable
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Table options
   * @param {Array} options.channels - Channel data
   * @param {boolean} options.loading - Loading state
   * @param {Function} options.onSelect - Selection handler
   * @param {Function} options.onSort - Sort handler
   * @param {Function} options.onPageChange - Page change handler
   * @param {number} options.pageSize - Items per page
   * @param {number} options.currentPage - Current page
   * @param {number} options.totalItems - Total number of items
   * @param {string} options.sortField - Current sort field
   * @param {string} options.sortDirection - Current sort direction
   * @param {string} options.selectedChannelId - Currently selected channel ID
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      channels: [],
      loading: false,
      onSelect: () => {},
      onSort: () => {},
      onPageChange: () => {},
      pageSize: 10,
      currentPage: 1,
      totalItems: 0,
      sortField: 'name',
      sortDirection: 'asc',
      selectedChannelId: null,
      ...options
    };
    
    // DOM elements
    this.tableElement = null;
    this.tableBodyElement = null;
    this.loadingElement = null;
    this.paginationElement = null;
    
    // State
    this.lastSelectedRow = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.renderTable = this.renderTable.bind(this);
    this.renderTableHeader = this.renderTableHeader.bind(this);
    this.renderTableBody = this.renderTableBody.bind(this);
    this.renderPagination = this.renderPagination.bind(this);
    this.handleHeaderClick = this.handleHeaderClick.bind(this);
    this.handleRowClick = this.handleRowClick.bind(this);
    this.handlePageClick = this.handlePageClick.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the component
   */
  initialize() {
    try {
      // Create table container
      this.tableElement = document.createElement('div');
      this.tableElement.className = 'channel-table-container';
      this.applyStyles(this.tableElement, {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      });
      
      // Add to container
      if (this.container) {
        this.container.appendChild(this.tableElement);
      }
      
      // Create loading element
      this.loadingElement = document.createElement('div');
      this.loadingElement.className = 'channel-table-loading';
      this.applyStyles(this.loadingElement, {
        padding: '32px',
        textAlign: 'center',
        color: '#666',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        zIndex: '1',
        display: this.options.loading ? 'flex' : 'none'
      });
      
      // Create loading spinner
      const spinner = document.createElement('div');
      spinner.className = 'loading-spinner';
      this.applyStyles(spinner, {
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        border: '3px solid rgba(0, 0, 0, 0.1)',
        borderTopColor: '#2196F3',
        animation: 'spin 1s linear infinite',
        marginRight: '12px'
      });
      
      // Add keyframes for animation
      if (!document.getElementById('spinner-style')) {
        const style = document.createElement('style');
        style.id = 'spinner-style';
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
      
      this.loadingElement.appendChild(spinner);
      this.loadingElement.appendChild(document.createTextNode('Loading channels...'));
      
      // Create pagination container
      this.paginationElement = document.createElement('div');
      this.paginationElement.className = 'channel-table-pagination';
      this.applyStyles(this.paginationElement, {
        padding: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderTop: '1px solid #e0e0e0'
      });
      
      // Render initial state
      this.render();
      
      // Log initialization
      logChatEvent('ui', 'Channel table initialized');
    } catch (error) {
      handleError(error, {
        code: ErrorCode.COMPONENT_FAILED,
        category: ErrorCategory.UI,
        source: 'ChannelTable',
        message: 'Failed to initialize channel table'
      });
      
      // Show error in container
      if (this.container) {
        this.container.innerHTML = `
          <div style="padding: 16px; color: #f44336; text-align: center;">
            Error initializing channel table: ${error.message || 'Unknown error'}
          </div>
        `;
      }
    }
  }
  
  /**
   * Render the component
   */
  render() {
    if (!this.tableElement) return;
    
    // Clear table
    this.tableElement.innerHTML = '';
    
    // Update loading state
    this.loadingElement.style.display = this.options.loading ? 'flex' : 'none';
    
    // Render table or empty state
    if (this.options.channels.length === 0 && !this.options.loading) {
      this.renderEmptyState();
    } else {
      this.renderTable();
    }
    
    // Add loading overlay
    this.tableElement.appendChild(this.loadingElement);
  }
  
  /**
   * Render the table
   */
  renderTable() {
    const table = document.createElement('table');
    table.className = 'channel-table';
    this.applyStyles(table, {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: 'white'
    });
    
    // Create table header
    const thead = document.createElement('thead');
    thead.appendChild(this.renderTableHeader());
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    this.tableBodyElement = tbody;
    this.renderTableBody();
    table.appendChild(tbody);
    
    // Add table
    this.tableElement.appendChild(table);
    
    // Render pagination
    this.renderPagination();
    this.tableElement.appendChild(this.paginationElement);
  }
  
  /**
   * Render table header
   * @returns {HTMLElement} Header row element
   */
  renderTableHeader() {
    const headerRow = document.createElement('tr');
    this.applyStyles(headerRow, {
      backgroundColor: '#f9f9f9',
      borderBottom: '1px solid #e0e0e0'
    });
    
    // Define header columns with sort fields
    const columns = [
      { label: 'Name', field: 'name', width: '25%' },
      { label: 'Description', field: 'description', width: '35%' },
      { label: 'Members', field: 'memberCount', width: '10%' },
      { label: 'Created', field: 'createdAt', width: '15%' },
      { label: 'Public', field: 'isPublic', width: '15%' }
    ];
    
    // Create header cells
    columns.forEach(column => {
      const th = document.createElement('th');
      this.applyStyles(th, {
        textAlign: 'left',
        padding: '12px 16px',
        fontWeight: 'bold',
        color: '#333',
        fontSize: '14px',
        cursor: 'pointer',
        userSelect: 'none',
        width: column.width
      });
      
      // Create sort indicator
      const isSorted = this.options.sortField === column.field;
      
      // Cell content wrapper for flex layout
      const contentWrapper = document.createElement('div');
      this.applyStyles(contentWrapper, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      });
      
      contentWrapper.textContent = column.label;
      
      if (isSorted) {
        const sortIndicator = document.createElement('span');
        sortIndicator.textContent = this.options.sortDirection === 'asc' ? '↑' : '↓';
        this.applyStyles(sortIndicator, {
          marginLeft: '4px',
          fontSize: '12px'
        });
        
        contentWrapper.appendChild(sortIndicator);
        
        // Highlight sorted column
        th.style.backgroundColor = '#e3f2fd';
      }
      
      th.appendChild(contentWrapper);
      
      // Add click handler for sorting
      th.addEventListener('click', () => this.handleHeaderClick(column.field));
      
      headerRow.appendChild(th);
    });
    
    return headerRow;
  }
  
  /**
   * Render table body rows
   */
  renderTableBody() {
    if (!this.tableBodyElement) return;
    
    // Clear existing rows
    this.tableBodyElement.innerHTML = '';
    
    // Add rows for each channel
    this.options.channels.forEach(channel => {
      const row = this.createChannelRow(channel);
      this.tableBodyElement.appendChild(row);
    });
  }
  
  /**
   * Create a row for a channel
   * @param {Object} channel - Channel data
   * @returns {HTMLElement} Row element
   */
  createChannelRow(channel) {
    const row = document.createElement('tr');
    row.className = 'channel-table-row';
    row.setAttribute('data-channel-id', channel.id);
    
    // Check if selected
    const isSelected = channel.id === this.options.selectedChannelId;
    
    // Base styles
    this.applyStyles(row, {
      borderBottom: '1px solid #e0e0e0',
      cursor: 'pointer',
      backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
      transition: 'background-color 0.2s'
    });
    
    // Hover effect
    row.addEventListener('mouseover', () => {
      if (!isSelected) {
        row.style.backgroundColor = '#f5f5f5';
      }
    });
    
    row.addEventListener('mouseout', () => {
      if (!isSelected) {
        row.style.backgroundColor = 'transparent';
      }
    });
    
    // Add cells
    
    // Name cell
    const nameCell = document.createElement('td');
    this.applyStyles(nameCell, {
      padding: '12px 16px',
      fontSize: '14px'
    });
    
    // Create name wrapper with icon
    const nameWrapper = document.createElement('div');
    this.applyStyles(nameWrapper, {
      display: 'flex',
      alignItems: 'center'
    });
    
    // Channel icon (locked or public)
    const iconSpan = document.createElement('span');
    iconSpan.textContent = channel.isPublic ? '🌐' : '🔒';
    this.applyStyles(iconSpan, {
      marginRight: '8px',
      fontSize: '16px'
    });
    
    // Channel name
    const nameSpan = document.createElement('span');
    nameSpan.textContent = channel.name;
    this.applyStyles(nameSpan, {
      fontWeight: isSelected ? 'bold' : 'normal'
    });
    
    nameWrapper.appendChild(iconSpan);
    nameWrapper.appendChild(nameSpan);
    nameCell.appendChild(nameWrapper);
    
    // Description cell
    const descriptionCell = document.createElement('td');
    this.applyStyles(descriptionCell, {
      padding: '12px 16px',
      fontSize: '14px',
      color: channel.description ? '#333' : '#999',
      fontStyle: channel.description ? 'normal' : 'italic'
    });
    descriptionCell.textContent = channel.description || 'No description';
    
    // Members cell
    const membersCell = document.createElement('td');
    this.applyStyles(membersCell, {
      padding: '12px 16px',
      fontSize: '14px',
      textAlign: 'center'
    });
    membersCell.textContent = channel.memberCount || '0';
    
    // Created date cell
    const createdCell = document.createElement('td');
    this.applyStyles(createdCell, {
      padding: '12px 16px',
      fontSize: '14px'
    });
    
    // Format date
    const createdDate = new Date(channel.createdAt);
    createdCell.textContent = createdDate.toLocaleDateString();
    
    // Public status cell
    const publicCell = document.createElement('td');
    this.applyStyles(publicCell, {
      padding: '12px 16px',
      fontSize: '14px'
    });
    
    // Create status badge
    const statusBadge = document.createElement('span');
    statusBadge.textContent = channel.isPublic ? 'Public' : 'Private';
    this.applyStyles(statusBadge, {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      backgroundColor: channel.isPublic ? '#e8f5e9' : '#fff3e0',
      color: channel.isPublic ? '#2e7d32' : '#e65100'
    });
    
    publicCell.appendChild(statusBadge);
    
    // Add cells to row
    row.appendChild(nameCell);
    row.appendChild(descriptionCell);
    row.appendChild(membersCell);
    row.appendChild(createdCell);
    row.appendChild(publicCell);
    
    // Add click handler
    row.addEventListener('click', () => this.handleRowClick(channel));
    
    return row;
  }
  
  /**
   * Render pagination controls
   */
  renderPagination() {
    if (!this.paginationElement) return;
    
    // Clear existing content
    this.paginationElement.innerHTML = '';
    
    // Create info text
    const infoText = document.createElement('div');
    infoText.className = 'pagination-info';
    
    // Calculate page info
    const totalPages = Math.ceil(this.options.totalItems / this.options.pageSize);
    const start = (this.options.currentPage - 1) * this.options.pageSize + 1;
    const end = Math.min(start + this.options.pageSize - 1, this.options.totalItems);
    
    infoText.textContent = `Showing ${start}-${end} of ${this.options.totalItems} channels`;
    
    // Create pagination controls
    const controls = document.createElement('div');
    controls.className = 'pagination-controls';
    this.applyStyles(controls, {
      display: 'flex',
      alignItems: 'center'
    });
    
    // Previous page button
    const prevButton = document.createElement('button');
    prevButton.textContent = '← Previous';
    prevButton.disabled = this.options.currentPage <= 1;
    this.applyStyles(prevButton, {
      padding: '6px 12px',
      border: '1px solid #ddd',
      backgroundColor: 'white',
      borderRadius: '4px',
      marginRight: '8px',
      cursor: this.options.currentPage <= 1 ? 'not-allowed' : 'pointer',
      opacity: this.options.currentPage <= 1 ? '0.6' : '1'
    });
    
    if (!prevButton.disabled) {
      prevButton.addEventListener('click', () => this.handlePageClick(this.options.currentPage - 1));
    }
    
    // Next page button
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next →';
    nextButton.disabled = this.options.currentPage >= totalPages;
    this.applyStyles(nextButton, {
      padding: '6px 12px',
      border: '1px solid #ddd',
      backgroundColor: 'white',
      borderRadius: '4px',
      cursor: this.options.currentPage >= totalPages ? 'not-allowed' : 'pointer',
      opacity: this.options.currentPage >= totalPages ? '0.6' : '1'
    });
    
    if (!nextButton.disabled) {
      nextButton.addEventListener('click', () => this.handlePageClick(this.options.currentPage + 1));
    }
    
    // Page indicator
    const pageIndicator = document.createElement('span');
    pageIndicator.textContent = `Page ${this.options.currentPage} of ${totalPages || 1}`;
    this.applyStyles(pageIndicator, {
      margin: '0 12px',
      fontSize: '14px'
    });
    
    // Add controls
    controls.appendChild(prevButton);
    controls.appendChild(pageIndicator);
    controls.appendChild(nextButton);
    
    // Add to pagination element
    this.paginationElement.appendChild(infoText);
    this.paginationElement.appendChild(controls);
  }
  
  /**
   * Render empty state when no channels
   */
  renderEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.className = 'channel-table-empty';
    this.applyStyles(emptyState, {
      padding: '32px',
      textAlign: 'center',
      color: '#666',
      backgroundColor: 'white'
    });
    
    // Icon
    const icon = document.createElement('div');
    icon.textContent = '💬';
    this.applyStyles(icon, {
      fontSize: '32px',
      marginBottom: '16px'
    });
    
    // Message
    const message = document.createElement('div');
    message.textContent = 'No channels found';
    this.applyStyles(message, {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '8px'
    });
    
    // Submessage
    const submessage = document.createElement('div');
    
    // Check if user can create channels
    if (authContext.hasPermission('channel.create')) {
      submessage.textContent = 'Create a new channel to get started';
      
      // Create button
      const createButton = document.createElement('button');
      createButton.textContent = 'Create Channel';
      this.applyStyles(createButton, {
        marginTop: '16px',
        padding: '8px 16px',
        backgroundColor: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold'
      });
      
      createButton.addEventListener('click', () => {
        // Trigger the create channel event
        const createEvent = new CustomEvent('channel-create');
        document.dispatchEvent(createEvent);
      });
      
      emptyState.appendChild(icon);
      emptyState.appendChild(message);
      emptyState.appendChild(submessage);
      emptyState.appendChild(createButton);
    } else {
      // User cannot create channels
      submessage.textContent = 'No channels are available.';
      
      emptyState.appendChild(icon);
      emptyState.appendChild(message);
      emptyState.appendChild(submessage);
    }
    
    this.tableElement.appendChild(emptyState);
  }
  
  /**
   * Handle header click for sorting
   * @param {string} field - Field to sort by
   */
  handleHeaderClick(field) {
    if (typeof this.options.onSort === 'function') {
      this.options.onSort(field);
    }
  }
  
  /**
   * Handle row click for selection
   * @param {Object} channel - Selected channel
   */
  handleRowClick(channel) {
    // Update last selected row
    if (this.lastSelectedRow) {
      this.lastSelectedRow.style.backgroundColor = 'transparent';
    }
    
    // Get the clicked row
    const row = this.tableBodyElement.querySelector(`[data-channel-id="${channel.id}"]`);
    if (row) {
      row.style.backgroundColor = '#e3f2fd';
      this.lastSelectedRow = row;
    }
    
    if (typeof this.options.onSelect === 'function') {
      this.options.onSelect(channel);
    }
  }
  
  /**
   * Handle pagination click
   * @param {number} page - Page number
   */
  handlePageClick(page) {
    if (typeof this.options.onPageChange === 'function') {
      this.options.onPageChange(page);
    }
  }
  
  /**
   * Update table options and re-render
   * @param {Object} newOptions - New options
   */
  update(newOptions) {
    this.options = { ...this.options, ...newOptions };
    this.render();
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
   * Refresh the table
   */
  refresh() {
    this.render();
  }
  
  /**
   * Get selected channel ID
   * @returns {string|null} Selected channel ID
   */
  getSelectedChannelId() {
    return this.options.selectedChannelId;
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    try {
      // Clean up elements
      if (this.tableElement && this.tableElement.parentNode) {
        this.tableElement.parentNode.removeChild(this.tableElement);
      }
      
      // Log destruction
      logChatEvent('ui', 'Channel table destroyed');
    } catch (error) {
      console.error('[ChannelTable] Error during destruction:', error);
    }
  }
}

export default ChannelTable;