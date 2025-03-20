// chat/components/admin/roles/RoleTable.js
// Role table component for displaying and interacting with roles

import { getCurrentUser } from '../../../services/auth';

/**
 * Role Table Component
 * Displays roles in a table with pagination and actions
 */
class RoleTable {
  /**
   * Create a new RoleTable
   * @param {Object} options - Table options
   * @param {Array} options.roles - Roles to display
   * @param {number} options.currentPage - Current page number
   * @param {number} options.pageSize - Items per page
   * @param {Function} options.onPageChange - Page change callback
   * @param {Function} options.onEditRole - Edit role callback
   * @param {Function} options.onDeleteRole - Delete role callback
   */
  constructor(options = {}) {
    this.options = {
      roles: [],
      currentPage: 1,
      pageSize: 10,
      onPageChange: () => {},
      onEditRole: () => {},
      onDeleteRole: () => {},
      ...options
    };
    
    this.tableContainer = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.createActionButton = this.createActionButton.bind(this);
    this.formatDateTime = this.formatDateTime.bind(this);
  }
  
  /**
   * Render the role table
   * @returns {HTMLElement} The rendered table container
   */
  render() {
    // Calculate pagination
    const totalRoles = this.options.roles.length;
    const totalPages = Math.ceil(totalRoles / this.options.pageSize);
    const startIndex = (this.options.currentPage - 1) * this.options.pageSize;
    const endIndex = Math.min(startIndex + this.options.pageSize, totalRoles);
    const paginatedRoles = this.options.roles.slice(startIndex, endIndex);
    
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
    
    const headers = ['Role Name', 'Description', 'Permissions', 'Users', 'Created', 'Actions'];
    
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
    
    if (paginatedRoles.length === 0) {
      // No roles found
      const noRolesRow = document.createElement('tr');
      
      const noRolesCell = document.createElement('td');
      noRolesCell.textContent = 'No roles found matching the criteria.';
      this.applyStyles(noRolesCell, {
        padding: '20px 15px',
        textAlign: 'center',
        color: '#6c757d'
      });
      noRolesCell.colSpan = headers.length;
      
      noRolesRow.appendChild(noRolesCell);
      tbody.appendChild(noRolesRow);
    } else {
      // Add role rows
      paginatedRoles.forEach(role => {
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
        nameCell.textContent = role.name;
        this.applyStyles(nameCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6',
          fontWeight: 'bold'
        });
        
        // Description cell
        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = role.description || '-';
        this.applyStyles(descriptionCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6'
        });
        
        // Permissions cell
        const permissionsCell = document.createElement('td');
        
        if (role.permissions && role.permissions.length > 0) {
          const permissionsList = document.createElement('div');
          this.applyStyles(permissionsList, {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '5px'
          });
          
          // Show first 3 permissions with badge
          const displayedPermissions = role.permissions.slice(0, 3);
          displayedPermissions.forEach(permission => {
            const badge = document.createElement('span');
            badge.textContent = permission;
            this.applyStyles(badge, {
              backgroundColor: '#e9ecef',
              color: '#495057',
              padding: '2px 6px',
              fontSize: '12px',
              borderRadius: '10px'
            });
            permissionsList.appendChild(badge);
          });
          
          // Add more indicator if there are more permissions
          if (role.permissions.length > 3) {
            const moreIndicator = document.createElement('span');
            moreIndicator.textContent = `+${role.permissions.length - 3} more`;
            this.applyStyles(moreIndicator, {
              color: '#6c757d',
              fontSize: '12px',
              padding: '2px 6px'
            });
            permissionsList.appendChild(moreIndicator);
          }
          
          permissionsCell.appendChild(permissionsList);
        } else {
          permissionsCell.textContent = 'No permissions';
          this.applyStyles(permissionsCell, {
            color: '#6c757d',
            fontStyle: 'italic'
          });
        }
        
        this.applyStyles(permissionsCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6'
        });
        
        // Users cell
        const usersCell = document.createElement('td');
        usersCell.textContent = role.userCount || 0;
        this.applyStyles(usersCell, {
          padding: '12px 15px',
          borderBottom: '1px solid #dee2e6'
        });
        
        // Created cell
        const createdCell = document.createElement('td');
        createdCell.textContent = this.formatDateTime(role.createdAt);
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
          this.options.onEditRole(role);
        });
        
        // Delete button
        const deleteButton = this.createActionButton('Delete', '🗑️', () => {
          this.options.onDeleteRole(role);
        });
        
        // Don't allow deleting default roles
        if (!role.isDefault) {
          actionsContainer.appendChild(editButton);
          actionsContainer.appendChild(deleteButton);
        } else {
          // Just edit for default roles
          actionsContainer.appendChild(editButton);
          
          const defaultNote = document.createElement('span');
          defaultNote.textContent = '(system role)';
          this.applyStyles(defaultNote, {
            color: '#6c757d',
            fontSize: '12px',
            marginLeft: '10px'
          });
          
          actionsContainer.appendChild(defaultNote);
        }
        
        actionsCell.appendChild(actionsContainer);
        
        // Add cells to row
        row.appendChild(nameCell);
        row.appendChild(descriptionCell);
        row.appendChild(permissionsCell);
        row.appendChild(usersCell);
        row.appendChild(createdCell);
        row.appendChild(actionsCell);
        
        tbody.appendChild(row);
      });
    }
    
    table.appendChild(tbody);
    this.tableContainer.appendChild(table);
    
    // Add pagination controls if needed
    if (totalRoles > 0) {
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
      resultsInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalRoles} roles`;
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
   * Create an action button for role actions
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

export default RoleTable;