// chat/components/admin/users/UserTable.js
// User table component for HIPAA-compliant chat

import { logChatEvent } from '../../../utils/logger.js';
import { handleError, ErrorCategory, ErrorCode } from '../../../utils/error-handler.js';
import authContext from '../../../contexts/AuthContext.js';

/**
 * UserTable Component
 * Displays user data in a tabular format with sorting, selection, and pagination
 */
class UserTable {
  /**
   * Create a new UserTable
   * @param {HTMLElement} container - Container element
   * @param {Object} props - Component properties
   * @param {Array} props.users - User data to display
   * @param {number} props.totalCount - Total number of users (for pagination)
   * @param {number} props.currentPage - Current page number
   * @param {number} props.pageSize - Number of users per page
   * @param {boolean} props.isLoading - Whether data is currently loading
   * @param {string} props.sortField - Field to sort by
   * @param {string} props.sortDirection - Sort direction (asc/desc)
   * @param {Array} props.selectedUsers - Array of selected user IDs
   * @param {Function} props.onUserSelect - Callback for user selection
   * @param {Function} props.onPageChange - Callback for page change
   * @param {Function} props.onSort - Callback for sort change
   * @param {Function} props.onEdit - Callback for edit action
   * @param {Function} props.onDelete - Callback for delete action
   * @param {Function} props.onResetPassword - Callback for reset password action
   */
  constructor(container, props = {}) {
    this.container = container;
    this.props = {
      users: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 10,
      isLoading: false,
      sortField: 'username',
      sortDirection: 'asc',
      selectedUsers: [],
      onUserSelect: () => {},
      onPageChange: () => {},
      onSort: () => {},
      onEdit: () => {},
      onDelete: () => {},
      onResetPassword: () => {},
      ...props
    };
    
    // DOM elements
    this.tableElement = null;
    this.tableBodyElement = null;
    this.paginationElement = null;
    this.loadingOverlayElement = null;
    this.selectAllCheckbox = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.renderTableHeader = this.renderTableHeader.bind(this);
    this.renderTableBody = this.renderTableBody.bind(this);
    this.renderPagination = this.renderPagination.bind(this);
    this.handleSelectAll = this.handleSelectAll.bind(this);
    this.handleSelectUser = this.handleSelectUser.bind(this);
    this.handleSort = this.handleSort.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the user table
   */
  initialize() {
    try {
      // Create table container
      this.tableElement = document.createElement('div');
      this.tableElement.className = 'user-table-container';
      
      this.applyStyles(this.tableElement, {
        width: '100%',
        overflowX: 'auto',
        position: 'relative',
        marginBottom: '20px'
      });
      
      // Add to container
      if (this.container) {
        this.container.appendChild(this.tableElement);
      }
      
      // Render initial state
      this.render();
      
      // Log initialization
      logChatEvent('admin', 'User table initialized');
    } catch (error) {
      handleError(error, {
        code: ErrorCode.COMPONENT_FAILED,
        category: ErrorCategory.UI,
        source: 'UserTable',
        message: 'Failed to initialize user table'
      });
    }
  }
  
  /**
   * Render the user table
   */
  render() {
    try {
      // Clear existing content
      this.tableElement.innerHTML = '';
      
      // Create table element
      const table = document.createElement('table');
      table.className = 'user-table';
      
      this.applyStyles(table, {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px'
      });
      
      // Create table head
      const tableHead = document.createElement('thead');
      tableHead.appendChild(this.renderTableHeader());
      
      // Create table body
      const tableBody = document.createElement('tbody');
      this.tableBodyElement = tableBody;
      
      // Render table body
      this.renderTableBody();
      
      // Add head and body to table
      table.appendChild(tableHead);
      table.appendChild(tableBody);
      
      // Add table to container
      this.tableElement.appendChild(table);
      
      // Create pagination
      this.paginationElement = document.createElement('div');
      this.paginationElement.className = 'pagination';
      this.renderPagination();
      this.tableElement.appendChild(this.paginationElement);
      
      // Create loading overlay
      this.renderLoadingOverlay();
      
      // Show/hide loading overlay
      if (this.loadingOverlayElement) {
        this.loadingOverlayElement.style.display = this.props.isLoading ? 'flex' : 'none';
      }
    } catch (error) {
      handleError(error, {
        code: ErrorCode.RENDER_ERROR,
        category: ErrorCategory.UI,
        source: 'UserTable',
        message: 'Failed to render user table'
      });
    }
  }
  
  /**
   * Render the table header
   * @returns {HTMLElement} Table header row
   */
  renderTableHeader() {
    const headerRow = document.createElement('tr');
    
    // Define table columns
    const columns = [
      { field: 'select', label: '', sortable: false, width: '40px' },
      { field: 'username', label: 'Username', sortable: true },
      { field: 'displayName', label: 'Display Name', sortable: true },
      { field: 'email', label: 'Email', sortable: true },
      { field: 'role', label: 'Role', sortable: true },
      { field: 'status', label: 'Status', sortable: true },
      { field: 'lastActive', label: 'Last Active', sortable: true },
      { field: 'actions', label: 'Actions', sortable: false, width: '120px' }
    ];
    
    // Create header cells
    columns.forEach(column => {
      const headerCell = document.createElement('th');
      headerCell.className = `user-table-header ${column.field}-column`;
      
      // Set width if specified
      if (column.width) {
        headerCell.style.width = column.width;
      }
      
      // Style for header cell
      this.applyStyles(headerCell, {
        padding: '12px 16px',
        textAlign: column.field === 'select' || column.field === 'actions' ? 'center' : 'left',
        fontWeight: 'bold',
        borderBottom: '2px solid #e0e0e0',
        backgroundColor: '#f5f5f5',
        position: 'relative'
      });
      
      // Special handling for select column
      if (column.field === 'select') {
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = 'select-all-checkbox';
        selectAllCheckbox.checked = this.props.users.length > 0 && 
                                   this.props.selectedUsers.length === this.props.users.length;
        selectAllCheckbox.indeterminate = this.props.selectedUsers.length > 0 && 
                                         this.props.selectedUsers.length < this.props.users.length;
        
        selectAllCheckbox.addEventListener('change', this.handleSelectAll);
        
        this.selectAllCheckbox = selectAllCheckbox;
        headerCell.appendChild(selectAllCheckbox);
      } else if (column.sortable) {
        // Add sort functionality for sortable columns
        const headerContent = document.createElement('div');
        headerContent.className = 'header-content';
        
        this.applyStyles(headerContent, {
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer'
        });
        
        // Text label
        const label = document.createElement('span');
        label.textContent = column.label;
        headerContent.appendChild(label);
        
        // Sort indicator
        const sortIndicator = document.createElement('span');
        sortIndicator.className = 'sort-indicator';
        
        // Set appropriate sort indicator
        if (this.props.sortField === column.field) {
          sortIndicator.textContent = this.props.sortDirection === 'asc' ? ' ▲' : ' ▼';
        } else {
          sortIndicator.textContent = ' ⋮';
          sortIndicator.style.opacity = '0.3';
        }
        
        headerContent.appendChild(sortIndicator);
        
        // Add click handler for sorting
        headerContent.addEventListener('click', () => {
          this.handleSort(column.field);
        });
        
        headerCell.appendChild(headerContent);
      } else {
        // Regular header
        headerCell.textContent = column.label;
      }
      
      headerRow.appendChild(headerCell);
    });
    
    return headerRow;
  }
  
  /**
   * Render the table body
   */
  renderTableBody() {
    if (!this.tableBodyElement) return;
    
    // Clear existing rows
    this.tableBodyElement.innerHTML = '';
    
    // If no users, show empty message
    if (this.props.users.length === 0) {
      const noDataRow = document.createElement('tr');
      const noDataCell = document.createElement('td');
      noDataCell.colSpan = 8; // Match the number of columns
      noDataCell.textContent = this.props.isLoading ? 'Loading users...' : 'No users found';
      
      this.applyStyles(noDataCell, {
        padding: '20px',
        textAlign: 'center',
        color: '#666'
      });
      
      noDataRow.appendChild(noDataCell);
      this.tableBodyElement.appendChild(noDataRow);
      return;
    }
    
    // Create a row for each user
    this.props.users.forEach(user => {
      const row = document.createElement('tr');
      row.className = 'user-row';
      row.setAttribute('data-user-id', user.id);
      
      // Add selected state
      const isSelected = this.props.selectedUsers.includes(user.id);
      if (isSelected) {
        row.classList.add('selected');
        this.applyStyles(row, {
          backgroundColor: '#e3f2fd'
        });
      }
      
      // Add hover effect
      row.addEventListener('mouseover', () => {
        if (!isSelected) {
          row.style.backgroundColor = '#f5f5f5';
        }
      });
      
      row.addEventListener('mouseout', () => {
        if (!isSelected) {
          row.style.backgroundColor = '';
        }
      });
      
      // Select column
      const selectCell = document.createElement('td');
      selectCell.className = 'select-cell';
      
      this.applyStyles(selectCell, {
        padding: '12px 16px',
        textAlign: 'center',
        borderBottom: '1px solid #e0e0e0'
      });
      
      const selectCheckbox = document.createElement('input');
      selectCheckbox.type = 'checkbox';
      selectCheckbox.className = 'select-user-checkbox';
      selectCheckbox.checked = isSelected;
      selectCheckbox.setAttribute('data-user-id', user.id);
      
      selectCheckbox.addEventListener('change', () => {
        this.handleSelectUser(user.id);
      });
      
      selectCell.appendChild(selectCheckbox);
      row.appendChild(selectCell);
      
      // Username column
      const usernameCell = document.createElement('td');
      usernameCell.className = 'username-cell';
      usernameCell.textContent = user.username;
      
      this.applyStyles(usernameCell, {
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0'
      });
      
      row.appendChild(usernameCell);
      
      // Display name column
      const displayNameCell = document.createElement('td');
      displayNameCell.className = 'display-name-cell';
      displayNameCell.textContent = user.displayName || '-';
      
      this.applyStyles(displayNameCell, {
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0'
      });
      
      row.appendChild(displayNameCell);
      
      // Email column
      const emailCell = document.createElement('td');
      emailCell.className = 'email-cell';
      emailCell.textContent = user.email || '-';
      
      this.applyStyles(emailCell, {
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0'
      });
      
      row.appendChild(emailCell);
      
      // Role column
      const roleCell = document.createElement('td');
      roleCell.className = 'role-cell';
      
      this.applyStyles(roleCell, {
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0'
      });
      
      // Create role badge
      const roleBadge = document.createElement('span');
      roleBadge.className = `role-badge role-${user.role || 'user'}`;
      roleBadge.textContent = this.formatRoleLabel(user.role || 'user');
      
      this.applyStyles(roleBadge, {
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        backgroundColor: this.getRoleBadgeColor(user.role || 'user'),
        color: 'white',
        display: 'inline-block'
      });
      
      roleCell.appendChild(roleBadge);
      row.appendChild(roleCell);
      
      // Status column
      const statusCell = document.createElement('td');
      statusCell.className = 'status-cell';
      
      this.applyStyles(statusCell, {
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0'
      });
      
      // Create status indicator
      const statusIndicator = document.createElement('span');
      statusIndicator.className = `status-indicator status-${user.status || 'offline'}`;
      
      this.applyStyles(statusIndicator, {
        display: 'flex',
        alignItems: 'center'
      });
      
      // Status dot
      const statusDot = document.createElement('span');
      statusDot.className = 'status-dot';
      
      this.applyStyles(statusDot, {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: this.getStatusColor(user.status || 'offline'),
        display: 'inline-block',
        marginRight: '6px'
      });
      
      // Status text
      const statusText = document.createElement('span');
      statusText.textContent = this.formatStatusLabel(user.status || 'offline');
      
      statusIndicator.appendChild(statusDot);
      statusIndicator.appendChild(statusText);
      statusCell.appendChild(statusIndicator);
      row.appendChild(statusCell);
      
      // Last active column
      const lastActiveCell = document.createElement('td');
      lastActiveCell.className = 'last-active-cell';
      lastActiveCell.textContent = user.lastActive ? this.formatDate(new Date(user.lastActive)) : 'Never';
      
      this.applyStyles(lastActiveCell, {
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0'
      });
      
      row.appendChild(lastActiveCell);
      
      // Actions column
      const actionsCell = document.createElement('td');
      actionsCell.className = 'actions-cell';
      
      this.applyStyles(actionsCell, {
        padding: '12px 16px',
        textAlign: 'center',
        borderBottom: '1px solid #e0e0e0',
        whiteSpace: 'nowrap'
      });
      
      // Edit button
      if (authContext.hasPermission('user.update')) {
        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.title = 'Edit User';
        editButton.innerHTML = '✏️';
        
        this.applyStyles(editButton, {
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          fontSize: '16px',
          marginRight: '8px'
        });
        
        editButton.addEventListener('click', () => {
          this.props.onEdit(user.id);
        });
        
        actionsCell.appendChild(editButton);
      }
      
      // Reset password button
      if (authContext.hasPermission('user.update')) {
        const resetPasswordButton = document.createElement('button');
        resetPasswordButton.className = 'reset-password-button';
        resetPasswordButton.title = 'Reset Password';
        resetPasswordButton.innerHTML = '🔑';
        
        this.applyStyles(resetPasswordButton, {
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          fontSize: '16px',
          marginRight: '8px'
        });
        
        resetPasswordButton.addEventListener('click', () => {
          this.props.onResetPassword(user.id);
        });
        
        actionsCell.appendChild(resetPasswordButton);
      }
      
      // Delete button
      if (authContext.hasPermission('user.delete')) {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.title = 'Delete User';
        deleteButton.innerHTML = '🗑️';
        
        this.applyStyles(deleteButton, {
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          fontSize: '16px'
        });
        
        deleteButton.addEventListener('click', () => {
          this.props.onDelete(user.id);
        });
        
        actionsCell.appendChild(deleteButton);
      }
      
      row.appendChild(actionsCell);
      
      // Add row to table body
      this.tableBodyElement.appendChild(row);
    });
  }
  
  /**
   * Render the pagination controls
   */
  renderPagination() {
    if (!this.paginationElement) return;
    
    // Clear existing content
    this.paginationElement.innerHTML = '';
    
    // Calculate pagination information
    const totalPages = Math.ceil(this.props.totalCount / this.props.pageSize);
    const currentPage = this.props.currentPage;
    
    // If only one page, don't show pagination
    if (totalPages <= 1) {
      return;
    }
    
    // Container styles
    this.applyStyles(this.paginationElement, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 0',
      fontSize: '14px'
    });
    
    // Page info
    const pageInfo = document.createElement('div');
    pageInfo.className = 'page-info';
    
    const start = (currentPage - 1) * this.props.pageSize + 1;
    const end = Math.min(currentPage * this.props.pageSize, this.props.totalCount);
    
    pageInfo.textContent = `Showing ${start}-${end} of ${this.props.totalCount} users`;
    
    // Page controls
    const pageControls = document.createElement('div');
    pageControls.className = 'page-controls';
    
    this.applyStyles(pageControls, {
      display: 'flex',
      alignItems: 'center'
    });
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'page-button prev-button';
    prevButton.textContent = '←';
    prevButton.disabled = currentPage === 1;
    prevButton.title = 'Previous Page';
    
    this.applyStyles(prevButton, {
      padding: '6px 12px',
      marginRight: '8px',
      backgroundColor: currentPage === 1 ? '#f0f0f0' : '#fff',
      border: '1px solid #ddd',
      borderRadius: '4px',
      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
      opacity: currentPage === 1 ? '0.6' : '1'
    });
    
    prevButton.addEventListener('click', () => {
      if (currentPage > 1) {
        this.handlePageChange(currentPage - 1);
      }
    });
    
    // Page buttons
    const maxButtons = 5; // Maximum number of page buttons to show
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    // Adjust if near the end
    if (endPage - startPage + 1 < maxButtons && startPage > 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    // First page button (if not visible in range)
    if (startPage > 1) {
      const firstPageButton = document.createElement('button');
      firstPageButton.className = 'page-button';
      firstPageButton.textContent = '1';
      
      this.applyStyles(firstPageButton, {
        padding: '6px 12px',
        marginRight: '4px',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer'
      });
      
      firstPageButton.addEventListener('click', () => {
        this.handlePageChange(1);
      });
      
      pageControls.appendChild(firstPageButton);
      
      // Ellipsis if needed
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        
        this.applyStyles(ellipsis, {
          margin: '0 8px'
        });
        
        pageControls.appendChild(ellipsis);
      }
    }
    
    // Page buttons
    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.className = `page-button ${i === currentPage ? 'active' : ''}`;
      pageButton.textContent = i.toString();
      
      this.applyStyles(pageButton, {
        padding: '6px 12px',
        marginRight: '4px',
        backgroundColor: i === currentPage ? '#2196F3' : '#fff',
        color: i === currentPage ? '#fff' : '#333',
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: i === currentPage ? 'default' : 'pointer',
        fontWeight: i === currentPage ? 'bold' : 'normal'
      });
      
      // Only add click handler if not current page
      if (i !== currentPage) {
        pageButton.addEventListener('click', () => {
          this.handlePageChange(i);
        });
      }
      
      pageControls.appendChild(pageButton);
    }
    
    // Last page button (if not visible in range)
    if (endPage < totalPages) {
      // Ellipsis if needed
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        
        this.applyStyles(ellipsis, {
          margin: '0 8px'
        });
        
        pageControls.appendChild(ellipsis);
      }
      
      const lastPageButton = document.createElement('button');
      lastPageButton.className = 'page-button';
      lastPageButton.textContent = totalPages.toString();
      
      this.applyStyles(lastPageButton, {
        padding: '6px 12px',
        marginRight: '4px',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer'
      });
      
      lastPageButton.addEventListener('click', () => {
        this.handlePageChange(totalPages);
      });
      
      pageControls.appendChild(lastPageButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'page-button next-button';
    nextButton.textContent = '→';
    nextButton.disabled = currentPage === totalPages;
    nextButton.title = 'Next Page';
    
    this.applyStyles(nextButton, {
      padding: '6px 12px',
      marginLeft: '4px',
      backgroundColor: currentPage === totalPages ? '#f0f0f0' : '#fff',
      border: '1px solid #ddd',
      borderRadius: '4px',
      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
      opacity: currentPage === totalPages ? '0.6' : '1'
    });
    
    nextButton.addEventListener('click', () => {
      if (currentPage < totalPages) {
        this.handlePageChange(currentPage + 1);
      }
    });
    
    // Add components to pagination container
    this.paginationElement.appendChild(pageInfo);
    pageControls.appendChild(prevButton);
    pageControls.appendChild(nextButton);
    this.paginationElement.appendChild(pageControls);
  }
  
  /**
   * Render loading overlay
   */
  renderLoadingOverlay() {
    // Create loading overlay if it doesn't exist
    if (!this.loadingOverlayElement) {
      this.loadingOverlayElement = document.createElement('div');
      this.loadingOverlayElement.className = 'loading-overlay';
      
      this.applyStyles(this.loadingOverlayElement, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '1'
      });
      
      // Create spinner
      const spinner = document.createElement('div');
      spinner.className = 'loading-spinner';
      
      this.applyStyles(spinner, {
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #2196F3',
        borderRadius: '50%',
        width: '30px',
        height: '30px',
        animation: 'spin 1s linear infinite'
      });
      
      // Add animation keyframes
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
      
      this.loadingOverlayElement.appendChild(spinner);
      this.tableElement.appendChild(this.loadingOverlayElement);
    }
  }
  
  /**
   * Format role label for display
   * @param {string} role - Role string
   * @returns {string} Formatted role label
   */
  formatRoleLabel(role) {
    if (!role) return 'User';
    
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Admin';
      case 'moderator':
        return 'Moderator';
      case 'user':
        return 'User';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  }
  
  /**
   * Get badge color for role
   * @param {string} role - Role string
   * @returns {string} CSS color
   */
  getRoleBadgeColor(role) {
    if (!role) return '#6c757d'; // Default gray
    
    switch (role.toLowerCase()) {
      case 'admin':
        return '#dc3545'; // Red
      case 'moderator':
        return '#fd7e14'; // Orange
      case 'user':
        return '#6c757d'; // Gray
      default:
        return '#6c757d'; // Default gray
    }
  }
  
  /**
   * Format status label for display
   * @param {string} status - Status string
   * @returns {string} Formatted status label
   */
  formatStatusLabel(status) {
    if (!status) return 'Offline';
    
    switch (status.toLowerCase()) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'busy':
        return 'Busy';
      case 'offline':
        return 'Offline';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }
  
  /**
   * Get color for status
   * @param {string} status - Status string
   * @returns {string} CSS color
   */
  getStatusColor(status) {
    if (!status) return '#6c757d'; // Default gray
    
    switch (status.toLowerCase()) {
      case 'online':
        return '#28a745'; // Green
      case 'away':
        return '#ffc107'; // Yellow
      case 'busy':
        return '#dc3545'; // Red
      case 'offline':
        return '#6c757d'; // Gray
      default:
        return '#6c757d'; // Default gray
    }
  }
  
  /**
   * Format date for display
   * @param {Date} date - Date object
   * @returns {string} Formatted date string
   */
  /**
   * Format date for display
   * @param {Date} date - Date object
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if date is today
    if (date >= today) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if date is yesterday
    if (date >= yesterday && date < today) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If date is within the last 7 days
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 6);
    
    if (date >= lastWeek) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `${days[date.getDay()]} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If date is within the current year
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
             ` at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise, show full date
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  }
}