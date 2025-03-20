// chat/components/admin/users/UserToolbar.js
// User toolbar component for HIPAA-compliant chat administration

import { logChatEvent } from '../../../utils/logger.js';
import { handleError, ErrorCategory, ErrorCode } from '../../../utils/error-handler.js';
import authContext from '../../../contexts/AuthContext.js';

/**
 * UserToolbar Component
 * Provides search, filter, and action buttons for user management
 */
class UserToolbar {
  /**
   * Create a new UserToolbar
   * @param {HTMLElement} container - Container element
   * @param {Object} props - Component properties
   * @param {Function} props.onCreateUser - Callback for create user action
   * @param {Function} props.onDeleteUser - Callback for delete user action
   * @param {Function} props.onImportUsers - Callback for import users action
   * @param {Function} props.onSearch - Callback for search action
   * @param {Function} props.onFilterChange - Callback for filter change
   * @param {Function} props.onRefresh - Callback for refresh action
   * @param {number} props.selectedCount - Number of selected users
   * @param {boolean} props.isLoading - Whether data is currently loading
   */
  constructor(container, props = {}) {
    this.container = container;
    this.props = {
      onCreateUser: () => {},
      onDeleteUser: () => {},
      onImportUsers: () => {},
      onSearch: () => {},
      onFilterChange: () => {},
      onRefresh: () => {},
      selectedCount: 0,
      isLoading: false,
      ...props
    };
    
    // DOM elements
    this.toolbarElement = null;
    this.searchInput = null;
    this.roleFilter = null;
    this.statusFilter = null;
    
    // State
    this.searchTimer = null;
    this.searchTerm = '';
    this.filters = {
      role: '',
      status: ''
    };
    
    // Bind methods
    this.render = this.render.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleRoleFilterChange = this.handleRoleFilterChange.bind(this);
    this.handleStatusFilterChange = this.handleStatusFilterChange.bind(this);
    this.handleCreateUser = this.handleCreateUser.bind(this);
    this.handleDeleteSelected = this.handleDeleteSelected.bind(this);
    this.handleImportUsers = this.handleImportUsers.bind(this);
    this.handleRefresh = this.handleRefresh.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the user toolbar
   */
  initialize() {
    try {
      // Create toolbar element
      this.toolbarElement = document.createElement('div');
      this.toolbarElement.className = 'user-toolbar';
      
      this.applyStyles(this.toolbarElement, {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 0',
        marginBottom: '16px',
        borderBottom: '1px solid #e0e0e0',
        gap: '16px'
      });
      
      // Add to container
      if (this.container) {
        this.container.appendChild(this.toolbarElement);
      }
      
      // Render initial state
      this.render();
      
      // Log initialization
      logChatEvent('admin', 'User toolbar initialized');
    } catch (error) {
      handleError(error, {
        code: ErrorCode.COMPONENT_FAILED,
        category: ErrorCategory.UI,
        source: 'UserToolbar',
        message: 'Failed to initialize user toolbar'
      });
    }
  }
  
  /**
   * Render the user toolbar
   */
  render() {
    try {
      // Clear existing content
      this.toolbarElement.innerHTML = '';
      
      // Create toolbar sections
      const leftSection = document.createElement('div');
      leftSection.className = 'toolbar-left';
      
      this.applyStyles(leftSection, {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flex: '1'
      });
      
      const rightSection = document.createElement('div');
      rightSection.className = 'toolbar-right';
      
      this.applyStyles(rightSection, {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      });
      
      // Add search and filters to left section
      this.renderSearch(leftSection);
      this.renderFilters(leftSection);
      
      // Add action buttons to right section
      this.renderActionButtons(rightSection);
      
      // Add sections to toolbar
      this.toolbarElement.appendChild(leftSection);
      this.toolbarElement.appendChild(rightSection);
    } catch (error) {
      handleError(error, {
        code: ErrorCode.RENDER_ERROR,
        category: ErrorCategory.UI,
        source: 'UserToolbar',
        message: 'Failed to render user toolbar'
      });
    }
  }
  
  /**
   * Render search input
   * @param {HTMLElement} container - Container element
   */
  renderSearch(container) {
    // Create search container
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    
    this.applyStyles(searchContainer, {
      position: 'relative',
      flex: '1',
      maxWidth: '300px'
    });
    
    // Create search input
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.className = 'search-input';
    this.searchInput.placeholder = 'Search users...';
    this.searchInput.value = this.searchTerm;
    
    this.applyStyles(this.searchInput, {
      width: '100%',
      padding: '8px 32px 8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      boxSizing: 'border-box'
    });
    
    // Create search icon
    const searchIcon = document.createElement('span');
    searchIcon.className = 'search-icon';
    searchIcon.innerHTML = '🔍';
    
    this.applyStyles(searchIcon, {
      position: 'absolute',
      right: '10px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#999',
      pointerEvents: 'none'
    });
    
    // Add input event listener
    this.searchInput.addEventListener('input', this.handleSearch);
    
    // Add elements to container
    searchContainer.appendChild(this.searchInput);
    searchContainer.appendChild(searchIcon);
    container.appendChild(searchContainer);
  }
  
  /**
   * Render filter dropdowns
   * @param {HTMLElement} container - Container element
   */
  renderFilters(container) {
    // Create filters container
    const filtersContainer = document.createElement('div');
    filtersContainer.className = 'filters-container';
    
    this.applyStyles(filtersContainer, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    });
    
    // Create role filter
    const roleContainer = document.createElement('div');
    roleContainer.className = 'filter-container';
    
    this.applyStyles(roleContainer, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });
    
    const roleLabel = document.createElement('label');
    roleLabel.textContent = 'Role:';
    roleLabel.htmlFor = 'role-filter';
    
    this.applyStyles(roleLabel, {
      fontSize: '14px',
      color: '#666'
    });
    
    this.roleFilter = document.createElement('select');
    this.roleFilter.id = 'role-filter';
    this.roleFilter.className = 'role-filter';
    
    this.applyStyles(this.roleFilter, {
      padding: '7px 24px 7px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: '#fff',
      appearance: 'none',
      backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23333\' d=\'M10.3,3.3L6,7.6L1.7,3.3c-0.4-0.4-1-0.4-1.4,0s-0.4,1,0,1.4l5,5c0.2,0.2,0.5,0.3,0.7,0.3s0.5-0.1,0.7-0.3l5-5c0.4-0.4,0.4-1,0-1.4S10.7,2.9,10.3,3.3z\'/%3E%3C/svg%3E")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 8px center'
    });
    
    // Add role options
    const roleOptions = [
      { value: '', label: 'All Roles' },
      { value: 'admin', label: 'Admin' },
      { value: 'moderator', label: 'Moderator' },
      { value: 'user', label: 'User' }
    ];
    
    roleOptions.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      optionElement.selected = this.filters.role === option.value;
      this.roleFilter.appendChild(optionElement);
    });
    
    // Add change event listener
    this.roleFilter.addEventListener('change', this.handleRoleFilterChange);
    
    roleContainer.appendChild(roleLabel);
    roleContainer.appendChild(this.roleFilter);
    
    // Create status filter
    const statusContainer = document.createElement('div');
    statusContainer.className = 'filter-container';
    
    this.applyStyles(statusContainer, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });
    
    const statusLabel = document.createElement('label');
    statusLabel.textContent = 'Status:';
    statusLabel.htmlFor = 'status-filter';
    
    this.applyStyles(statusLabel, {
      fontSize: '14px',
      color: '#666'
    });
    
    this.statusFilter = document.createElement('select');
    this.statusFilter.id = 'status-filter';
    this.statusFilter.className = 'status-filter';
    
    this.applyStyles(this.statusFilter, {
      padding: '7px 24px 7px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: '#fff',
      appearance: 'none',
      backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23333\' d=\'M10.3,3.3L6,7.6L1.7,3.3c-0.4-0.4-1-0.4-1.4,0s-0.4,1,0,1.4l5,5c0.2,0.2,0.5,0.3,0.7,0.3s0.5-0.1,0.7-0.3l5-5c0.4-0.4,0.4-1,0-1.4S10.7,2.9,10.3,3.3z\'/%3E%3C/svg%3E")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 8px center'
    });
    
    // Add status options
    const statusOptions = [
      { value: '', label: 'All Statuses' },
      { value: 'online', label: 'Online' },
      { value: 'away', label: 'Away' },
      { value: 'busy', label: 'Busy' },
      { value: 'offline', label: 'Offline' }
    ];
    
    statusOptions.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      optionElement.selected = this.filters.status === option.value;
      this.statusFilter.appendChild(optionElement);
    });
    
    // Add change event listener
    this.statusFilter.addEventListener('change', this.handleStatusFilterChange);
    
    statusContainer.appendChild(statusLabel);
    statusContainer.appendChild(this.statusFilter);
    
    // Add filters to container
    filtersContainer.appendChild(roleContainer);
    filtersContainer.appendChild(statusContainer);
    container.appendChild(filtersContainer);
  }
  
  /**
   * Render action buttons
   * @param {HTMLElement} container - Container element
   */
  renderActionButtons(container) {
    // Create refresh button
    const refreshButton = document.createElement('button');
    refreshButton.className = 'refresh-button';
    refreshButton.title = 'Refresh';
    refreshButton.innerHTML = '↻';
    refreshButton.disabled = this.props.isLoading;
    
    this.applyStyles(refreshButton, {
      padding: '8px',
      backgroundColor: 'transparent',
      border: '1px solid #ddd',
      borderRadius: '4px',
      cursor: this.props.isLoading ? 'not-allowed' : 'pointer',
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: this.props.isLoading ? '0.6' : '1',
      color: '#666'
    });
    
    refreshButton.addEventListener('click', this.handleRefresh);
    
    // Only show admin buttons if user has permissions
    if (authContext.hasPermission('user.create')) {
      // Create "Create User" button
      const createUserButton = document.createElement('button');
      createUserButton.className = 'create-user-button';
      createUserButton.innerHTML = '<span>➕</span> Add User';
      
      this.applyStyles(createUserButton, {
        padding: '8px 16px',
        backgroundColor: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      });
      
      // Add hover effect
      createUserButton.addEventListener('mouseover', () => {
        createUserButton.style.backgroundColor = '#1976D2';
      });
      
      createUserButton.addEventListener('mouseout', () => {
        createUserButton.style.backgroundColor = '#2196F3';
      });
      
      createUserButton.addEventListener('click', this.handleCreateUser);
      
      container.appendChild(createUserButton);
    }
    
    // Import Users button (if has permission)
    if (authContext.hasPermission('user.create')) {
      const importButton = document.createElement('button');
      importButton.className = 'import-users-button';
      importButton.innerHTML = '<span>📥</span> Import';
      
      this.applyStyles(importButton, {
        padding: '8px 16px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      });
      
      // Add hover effect
      importButton.addEventListener('mouseover', () => {
        importButton.style.backgroundColor = '#388E3C';
      });
      
      importButton.addEventListener('mouseout', () => {
        importButton.style.backgroundColor = '#4CAF50';
      });
      
      importButton.addEventListener('click', this.handleImportUsers);
      
      container.appendChild(importButton);
    }
    
    // Delete Selected button (only show if users are selected)
    if (this.props.selectedCount > 0 && authContext.hasPermission('user.delete')) {
      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-users-button';
      deleteButton.innerHTML = '<span>🗑️</span> Delete Selected';
      
      this.applyStyles(deleteButton, {
        padding: '8px 16px',
        backgroundColor: '#F44336',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      });
      
      // Add selection count badge if multiple
      if (this.props.selectedCount > 1) {
        const countBadge = document.createElement('span');
        countBadge.className = 'count-badge';
        countBadge.textContent = this.props.selectedCount.toString();
        
        this.applyStyles(countBadge, {
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '12px',
          padding: '2px 8px',
          fontSize: '12px',
          marginLeft: '4px'
        });
        
        deleteButton.appendChild(countBadge);
      }
      
      // Add hover effect
      deleteButton.addEventListener('mouseover', () => {
        deleteButton.style.backgroundColor = '#D32F2F';
      });
      
      deleteButton.addEventListener('mouseout', () => {
        deleteButton.style.backgroundColor = '#F44336';
      });
      
      deleteButton.addEventListener('click', this.handleDeleteSelected);
      
      container.appendChild(deleteButton);
    }
    
    container.appendChild(refreshButton);
  }
  
  /**
   * Handle search input
   * @param {Event} event - Input event
   */
  handleSearch(event) {
    // Get search term
    const searchTerm = event.target.value.trim();
    this.searchTerm = searchTerm;
    
    // Clear existing timer
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    
    // Set timer to delay search while typing
    this.searchTimer = setTimeout(() => {
      // Call search callback with term
      this.props.onSearch(searchTerm);
      
      // Clear timer
      this.searchTimer = null;
    }, 300); // 300ms delay for typing
  }
  
  /**
   * Handle role filter change
   * @param {Event} event - Change event
   */
  handleRoleFilterChange(event) {
    const role = event.target.value;
    this.filters.role = role;
    
    this.props.onFilterChange({
      ...this.filters
    });
  }
  
  /**
   * Handle status filter change
   * @param {Event} event - Change event
   */
  handleStatusFilterChange(event) {
    const status = event.target.value;
    this.filters.status = status;
    
    this.props.onFilterChange({
      ...this.filters
    });
  }
  
  /**
   * Handle create user button click
   */
  handleCreateUser() {
    this.props.onCreateUser();
    
    // Log action
    logChatEvent('admin', 'Create user button clicked');
  }
  
  /**
   * Handle delete selected button click
   */
  handleDeleteSelected() {
    this.props.onDeleteUser();
    
    // Log action
    logChatEvent('admin', 'Delete selected users button clicked', {
      count: this.props.selectedCount
    });
  }
  
  /**
   * Handle import users button click
   */
  handleImportUsers() {
    this.props.onImportUsers();
    
    // Log action
    logChatEvent('admin', 'Import users button clicked');
  }
  
  /**
   * Handle refresh button click
   */
  handleRefresh() {
    this.props.onRefresh();
    
    // Log action
    logChatEvent('admin', 'Refresh users button clicked');
  }
  
  /**
   * Update component props
   * @param {Object} newProps - New props to update
   */
  updateProps(newProps) {
    this.props = {
      ...this.props,
      ...newProps
    };
    
    // Re-render with new props
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
   * Clean up resources
   */
  destroy() {
    try {
      // Clear search timer if exists
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
        this.searchTimer = null;
      }
      
      // Remove from DOM
      if (this.toolbarElement && this.toolbarElement.parentNode) {
        this.toolbarElement.parentNode.removeChild(this.toolbarElement);
      }
      
      // Log destruction
      logChatEvent('admin', 'User toolbar destroyed');
    } catch (error) {
      console.error('[UserToolbar] Error destroying user toolbar:', error);
    }
  }
}

export default UserToolbar;