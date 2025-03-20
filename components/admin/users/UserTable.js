// chat/components/admin/users/UserTable.js
// User table component for displaying and interacting with users

import { getCurrentUser } from '../../../services/auth';

/**
 * User Table Component
 * Displays users in a table with pagination and actions
 */
class UserTable {
  /**
   * Create a new UserTable
   * @param {Object} options - Table options
   * @param {Array} options.users - Users to display
   * @param {number} options.currentPage - Current page number
   * @param {number} options.pageSize - Items per page
   * @param {Function} options.onPageChange - Page change callback
   * @param {Function} options.onEditUser - Edit user callback
   * @param {Function} options.onDeleteUser - Delete user callback
   * @param {Function} options.onResetPassword - Reset password callback
   */
  constructor(options = {}) {
    this.options = {
      users: [],
      currentPage: 1,
      pageSize: 10,
      onPageChange: () => {},
      onEditUser: () => {},
      onDeleteUser: () => {},
      onResetPassword: () => {},
      ...options
    };
    
    this.tableContainer = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.createActionButton = this.createActionButton.bind(this);
    this.formatDateTime = this.formatDateTime.bind(this);
  }
  
  /**
   * Render the user table
   * @returns {HTMLElement} The rendered table container
   */
  render() {
    // Calculate pagination
    const totalUsers = this.options.users.length;
    const totalPages = Math.ceil(totalUsers / this.options.pageSize);
    const startIndex = (this.options.currentPage - 1) * this.options.pageSize;
    const endIndex = Math.min(startIndex + this.options.pageSize, totalUsers);
    const paginatedUsers = this.options.users.slice(startIndex, endIndex);
    
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
    
    const headers = ['Username', 'Display Name', 'Role', 'Status', 'Last Login', 'Actions'];
    
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
    
    if (paginatedUsers.length === 0) {
      // No users found
      const noUsersRow = document.createElement('tr');
      
      const noUsersCell = document.createElement('td');
      noUsersCell.textContent = 'No users found matching the criteria.';
      this.applyStyles(noUsersCell, {
        padding: '20px 15px',
        textAlign: 'center',
        color: '#6c757d'
      });
      noUsersCell.colSpan = headers.length;
      
      noUsersRow.appendChild(noUsersCell);
      tbody.appendChild(noUsersRow);
    } else {
      // Add user rows
      paginatedUsers.forEach(user => {
        const row = document.createElement('tr');
        
        // Add hover effect
        row.addEventListener('mouseover', () => {
          row.style.backgroundColor = '#f8f9fa';
        });
        
        row.addEventListener('mouseout', () => {
          row.style.backgroundColor = '';
        });
        
        // Username cell
        const usernameCell = document.createElement('td');
        usernameCell.textContent = user.username;
        this.applyStyles(usernameCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6'
        });
        
        // Display name cell
        const displayNameCell = document.createElement('td');
        displayNameCell.textContent = user.displayName || '-';
        this.applyStyles(displayNameCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6'
        });
        
        // Role cell
        const roleCell = document.createElement('td');
        
        const roleBadge = document.createElement('span');
        roleBadge.textContent = user.role || 'user';
        
        // Style based on role
        let badgeColor = '#6c757d'; // Default gray
        
        if (user.role === 'admin') {
          badgeColor = '#dc3545'; // Red for admin
        } else if (user.role === 'moderator') {
          badgeColor = '#ffc107'; // Yellow for moderator
        }
        
        this.applyStyles(roleBadge, {
          backgroundColor: badgeColor,
          color: 'white',
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        });
        
        roleCell.appendChild(roleBadge);
        this.applyStyles(roleCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6'
        });
        
        // Status cell
        const statusCell = document.createElement('td');
        
        const statusBadge = document.createElement('span');
        statusBadge.textContent = user.online ? 'Online' : 'Offline';
        
        this.applyStyles(statusBadge, {
          backgroundColor: user.online ? '#28a745' : '#6c757d',
          color: 'white',
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '12px'
        });
        
        statusCell.appendChild(statusBadge);
        this.applyStyles(statusCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6'
        });
        
        // Last login cell
        const lastLoginCell = document.createElement('td');
        lastLoginCell.textContent = user.lastLogin ? this.formatDateTime(user.lastLogin) : 'Never';
        this.applyStyles(lastLoginCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6'
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
          this.options.onEditUser(user);
        });
        
        // Reset password button
        const resetButton = this.createActionButton('Reset Password', '🔑', () => {
          this.options.onResetPassword(user);
        });
        
        // Delete button
        const deleteButton = this.createActionButton('Delete', '🗑️', () => {
          this.options.onDeleteUser(user);
        });
        
        // Only add delete button if not self
        const currentUser = getCurrentUser();
        if (currentUser && user.id !== currentUser.id) {
          actionsContainer.appendChild(editButton);
          actionsContainer.appendChild(resetButton);
          actionsContainer.appendChild(deleteButton);
        } else {
          // Just edit for self
          actionsContainer.appendChild(editButton);
          
          const selfNote = document.createElement('span');
          selfNote.textContent = '(current user)';
          this.applyStyles(selfNote, {
            color: '#6c757d',
            fontSize: '12px',
            marginLeft: '10px'
          });
          
          actionsContainer.appendChild(selfNote);
        }
        
        actionsCell.appendChild(actionsContainer);
        
        // Add cells to row
        row.appendChild(usernameCell);
        row.appendChild(displayNameCell);
        row.appendChild(roleCell);
        row.appendChild(statusCell);
        row.appendChild(lastLoginCell);
        row.appendChild(actionsCell);
        
        tbody.appendChild(row);
      });
    }
    
    table.appendChild(tbody);
    this.tableContainer.appendChild(table);
    
    // Add pagination controls if needed
    if (totalUsers > 0) {
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
      resultsInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalUsers} users`;
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
   * Create an action button for user actions
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

export default UserTable;