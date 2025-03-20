// chat/components/admin/channels/ChannelTable.js
// Channel table component for displaying and interacting with channels

import { getCurrentUser } from '../../../services/auth';

/**
 * Channel Table Component
 * Displays channels in a table with pagination and actions
 */
class ChannelTable {
  /**
   * Create a new ChannelTable
   * @param {Object} options - Table options
   * @param {Array} options.channels - Channels to display
   * @param {number} options.currentPage - Current page number
   * @param {number} options.pageSize - Items per page
   * @param {Function} options.onPageChange - Page change callback
   * @param {Function} options.onEditChannel - Edit channel callback
   * @param {Function} options.onDeleteChannel - Delete channel callback
   */
  constructor(options = {}) {
    this.options = {
      channels: [],
      currentPage: 1,
      pageSize: 10,
      onPageChange: () => {},
      onEditChannel: () => {},
      onDeleteChannel: () => {},
      ...options
    };
    
    this.tableContainer = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.createActionButton = this.createActionButton.bind(this);
    this.formatDateTime = this.formatDateTime.bind(this);
  }
  
  /**
   * Render the channel table
   * @returns {HTMLElement} The rendered table container
   */
  render() {
    // Calculate pagination
    const totalChannels = this.options.channels.length;
    const totalPages = Math.ceil(totalChannels / this.options.pageSize);
    const startIndex = (this.options.currentPage - 1) * this.options.pageSize;
    const endIndex = Math.min(startIndex + this.options.pageSize, totalChannels);
    const paginatedChannels = this.options.channels.slice(startIndex, endIndex);
    
    // Create table container
    this.tableContainer = document.createElement('div');
    this.applyStyles(this.tableContainer, {
      backgroundColor: '#ffffff',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      overflow: 'hidden',
      marginBottom: '15px'
    });
    
    // Create table
    const table = document.createElement('table');
    this.applyStyles(table, {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px'
    });
    
    // Table header
    const thead = document.createElement('thead');
    this.applyStyles(thead, {
      backgroundColor: '#f8f9fa',
      fontWeight: 'bold'
    });
    
    const headerRow = document.createElement('tr');
    
    const headers = ['Name', 'Description', 'Type', 'Members', 'Created', 'Actions'];
    
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      this.applyStyles(th, {
        padding: '12px 15px',
        textAlign: 'left',
        borderBottom: '2px solid #dee2e6'
      });
      
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Table body
    const tbody = document.createElement('tbody');
    
    if (paginatedChannels.length === 0) {
      // No channels found
      const noChannelsRow = document.createElement('tr');
      
      const noChannelsCell = document.createElement('td');
      noChannelsCell.textContent = 'No channels found matching the criteria.';
      this.applyStyles(noChannelsCell, {
        padding: '20px 15px',
        textAlign: 'center',
        color: '#6c757d'
      });
      noChannelsCell.colSpan = headers.length;
      
      noChannelsRow.appendChild(noChannelsCell);
      tbody.appendChild(noChannelsRow);
    } else {
      // Add channel rows
      paginatedChannels.forEach(channel => {
        const row = document.createElement('tr');
        
        // Add hover effect
        row.addEventListener('mouseover', () => {
          row.style.backgroundColor = '#f8f9fa';
        });
        
        row.addEventListener('mouseout', () => {
          row.style.backgroundColor = '';
        });
        
        // Name cell
        const nameCell = document.createElement('td');
        nameCell.textContent = channel.name;
        this.applyStyles(nameCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6',
          fontWeight: 'bold'
        });
        
        // Description cell
        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = channel.description || '-';
        this.applyStyles(descriptionCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6'
        });
        
        // Type cell
        const typeCell = document.createElement('td');
        
        const typeBadge = document.createElement('span');
        typeBadge.textContent = channel.type || 'public';
        
        // Style based on type
        let badgeColor = '#28a745'; // Green for public
        
        if (channel.type === 'private') {
          badgeColor = '#ffc107'; // Yellow for private
        }
        
        this.applyStyles(typeBadge, {
          backgroundColor: badgeColor,
          color: 'white',
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        });
        
        typeCell.appendChild(typeBadge);
        this.applyStyles(typeCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6'
        });
        
        // Members cell
        const membersCell = document.createElement('td');
        const memberCount = (channel.members && Array.isArray(channel.members)) ? channel.members.length : 0;
        membersCell.textContent = memberCount;
        this.applyStyles(membersCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6'
        });
        
        // Created cell
        const createdCell = document.createElement('td');
        createdCell.textContent = this.formatDateTime(channel.createdAt);
        this.applyStyles(createdCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6',
          fontSize: '12px',
          color: '#6c757d'
        });
        
        // Actions cell
        const actionsCell = document.createElement('td');
        this.applyStyles(actionsCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6'
        });
        
        const actionsContainer = document.createElement('div');
        this.applyStyles(actionsContainer, {
          display: 'flex',
          gap: '5px'
        });
        
        // Edit button
        const editButton = this.createActionButton('Edit', '✏️', () => {
          this.options.onEditChannel(channel);
        });
        
        // Delete button
        const deleteButton = this.createActionButton('Delete', '🗑️', () => {
          this.options.onDeleteChannel(channel);
        });
        
        // Don't allow deleting default channels
        if (channel.id !== 'general' && channel.id !== 'announcements') {
          actionsContainer.appendChild(editButton);
          actionsContainer.appendChild(deleteButton);
        } else {
          // Just edit for default channels
          actionsContainer.appendChild(editButton);
          
          const systemNote = document.createElement('span');
          systemNote.textContent = '(system channel)';
          this.applyStyles(systemNote, {
            color: '#6c757d',
            fontSize: '12px',
            marginLeft: '10px'
          });
          
          actionsContainer.appendChild(systemNote);
        }
        
        actionsCell.appendChild(actionsContainer);
        
        // Add cells to row
        row.appendChild(nameCell);
        row.appendChild(descriptionCell);
        row.appendChild(typeCell);
        row.appendChild(membersCell);
        row.appendChild(createdCell);
        row.appendChild(actionsCell);
        
        tbody.appendChild(row);
      });
    }
    
    table.appendChild(tbody);
    this.tableContainer.appendChild(table);
    
    // Add pagination controls if needed
    if (totalChannels > 0) {
      const paginationControls = document.createElement('div');
      this.applyStyles(paginationControls, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 15px',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #dee2e6'
      });
      
      // Results info
      const resultsInfo = document.createElement('div');
      resultsInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalChannels} channels`;
      this.applyStyles(resultsInfo, {
        fontSize: '14px',
        color: '#6c757d'
      });
      
      // Page controls
      const pageControls = document.createElement('div');
      this.applyStyles(pageControls, {
        display: 'flex',
        gap: '5px',
        alignItems: 'center'
      });
      
      // First page button
      const firstButton = document.createElement('button');
      firstButton.textContent = '⟨⟨';
      firstButton.title = 'First Page';
      this.applyStyles(firstButton, {
        padding: '5px 10px',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        backgroundColor: 'white',
        cursor: this.options.currentPage > 1 ? 'pointer' : 'default',
        opacity: this.options.currentPage > 1 ? '1' : '0.5'
      });
      
      firstButton.disabled = this.options.currentPage <= 1;
      firstButton.addEventListener('click', () => {
        if (this.options.currentPage > 1) {
          this.options.onPageChange(1);
        }
      });
      
      // Previous page button
      const prevButton = document.createElement('button');
      prevButton.textContent = '⟨';
      prevButton.title = 'Previous Page';
      this.applyStyles(prevButton, {
        padding: '5px 10px',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        backgroundColor: 'white',
        cursor: this.options.currentPage > 1 ? 'pointer' : 'default',
        opacity: this.options.currentPage > 1 ? '1' : '0.5'
      });
      
      prevButton.disabled = this.options.currentPage <= 1;
      prevButton.addEventListener('click', () => {
        if (this.options.currentPage > 1) {
          this.options.onPageChange(this.options.currentPage - 1);
        }
      });
      
      // Page indicator
      const pageIndicator = document.createElement('span');
      pageIndicator.textContent = `Page ${this.options.currentPage} of ${totalPages || 1}`;
      this.applyStyles(pageIndicator, {
        padding: '0 10px',
        fontSize: '14px'
      });
      
      // Next page button
      const nextButton = document.createElement('button');
      nextButton.textContent = '⟩';
      nextButton.title = 'Next Page';
      this.applyStyles(nextButton, {
        padding: '5px 10px',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        backgroundColor: 'white',
        cursor: this.options.currentPage < totalPages ? 'pointer' : 'default',
        opacity: this.options.currentPage < totalPages ? '1' : '0.5'
      });
      
      nextButton.disabled = this.options.currentPage >= totalPages;
      nextButton.addEventListener('click', () => {
        if (this.options.currentPage < totalPages) {
          this.options.onPageChange(this.options.currentPage + 1);
        }
      });
      
      // Last page button
      const lastButton = document.createElement('button');
      lastButton.textContent = '⟩⟩';
      lastButton.title = 'Last Page';
      this.applyStyles(lastButton, {
        padding: '5px 10px',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        backgroundColor: 'white',
        cursor: this.options.currentPage < totalPages ? 'pointer' : 'default',
        opacity: this.options.currentPage < totalPages ? '1' : '0.5'
      });
      
      lastButton.disabled = this.options.currentPage >= totalPages;
      lastButton.addEventListener('click', () => {
        if (this.options.currentPage < totalPages) {
          this.options.onPageChange(totalPages);
        }
      });
      
      // Add all controls
      pageControls.appendChild(firstButton);
      pageControls.appendChild(prevButton);
      pageControls.appendChild(pageIndicator);
      pageControls.appendChild(nextButton);
      pageControls.appendChild(lastButton);
      
      paginationControls.appendChild(resultsInfo);
      paginationControls.appendChild(pageControls);
      
      this.tableContainer.appendChild(paginationControls);
    }
    
    return this.tableContainer;
  }
  
  /**
   * Create an action button for channel actions
   * @param {string} title - Button title
   * @param {string} icon - Button icon
   * @param {Function} onClick - Click handler
   * @returns {HTMLElement} Button element
   */
  createActionButton(title, icon, onClick) {
    const button = document.createElement('button');
    button.title = title;
    button.innerHTML = icon;
    
    this.applyStyles(button, {
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '12px'
    });
    
    button.addEventListener('click', onClick);
    
    return button;
  }
  
  /**
   * Format a date and time for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date and time
   */
  formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    } catch (error) {
      return dateString;
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
   * Destroy the component
   */
  destroy() {
    // Remove event listeners
    
    // Remove from DOM
    if (this.tableContainer && this.tableContainer.parentNode) {
      this.tableContainer.parentNode.removeChild(this.tableContainer);
    }
  }
}

export default ChannelTable;