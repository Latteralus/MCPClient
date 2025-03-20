// chat/components/admin/UserManager.js
// User management component for HIPAA-compliant chat

import { logChatEvent } from '../../utils/logger.js';
import { handleError, ErrorCategory, ErrorCode } from '../../utils/error-handler.js';
import { getConfig } from '../../config/index.js';
import authContext from '../../contexts/AuthContext.js';
import UserTable from './users/UserTable.js';
import UserToolbar from './users/UserToolbar.js';
import CreateUserModal from './users/CreateUserModal.js';
import EditUserModal from './users/EditUserModal.js';
import DeleteUserModal from './users/DeleteUserModal.js';
import ResetPasswordModal from './users/ResetPasswordModal.js';
import ImportUsersModal from './users/ImportUsersModal.js';

/**
 * UserManager Component
 * Provides user management functionality for administrators
 */
class UserManager {
  /**
   * Create a new UserManager
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      pageSize: 10,
      ...options
    };
    
    // DOM elements
    this.managerElement = null;
    
    // State
    this.users = [];
    this.selectedUsers = [];
    this.totalUsers = 0;
    this.currentPage = 1;
    this.isLoading = false;
    this.searchTerm = '';
    this.sortField = 'username';
    this.sortDirection = 'asc';
    this.filters = {
      role: '',
      status: ''
    };
    
    // Child components
    this.userTable = null;
    this.userToolbar = null;
    
    // Modals
    this.createUserModal = null;
    this.editUserModal = null;
    this.deleteUserModal = null;
    this.resetPasswordModal = null;
    this.importUsersModal = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.loadUsers = this.loadUsers.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleSort = this.handleSort.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleUserSelection = this.handleUserSelection.bind(this);
    this.handleCreateUser = this.handleCreateUser.bind(this);
    this.handleEditUser = this.handleEditUser.bind(this);
    this.handleDeleteUser = this.handleDeleteUser.bind(this);
    this.handleResetPassword = this.handleResetPassword.bind(this);
    this.handleImportUsers = this.handleImportUsers.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the user manager
   */
  initialize() {
    try {
      // Check if user has user management permissions
      if (!this.checkPermissions()) {
        console.error('[UserManager] User does not have user management permissions');
        this.renderPermissionError();
        return;
      }
      
      // Create manager element
      this.managerElement = document.createElement('div');
      this.managerElement.className = 'user-manager';
      
      this.applyStyles(this.managerElement, {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%'
      });
      
      // Add to container
      if (this.container) {
        this.container.appendChild(this.managerElement);
      }
      
      // Create layout
      this.createLayout();
      
      // Load initial users
      this.loadUsers();
      
      // Log initialization
      logChatEvent('admin', 'User manager initialized');
    } catch (error) {
      handleError(error, {
        code: ErrorCode.COMPONENT_FAILED,
        category: ErrorCategory.UI,
        source: 'UserManager',
        message: 'Failed to initialize user manager'
      });
      
      this.renderError('Failed to initialize user manager');
    }
  }
  
  /**
   * Check if user has necessary permissions
   * @returns {boolean} True if user has permissions
   */
  checkPermissions() {
    return authContext.hasPermission('user.read');
  }
  
  /**
   * Create user manager layout
   */
  createLayout() {
    // Create toolbar
    this.userToolbar = new UserToolbar(this.managerElement, {
      onCreateUser: this.handleCreateUser,
      onDeleteUser: this.handleDeleteUser,
      onImportUsers: this.handleImportUsers,
      onSearch: this.handleSearch,
      onFilterChange: this.handleFilterChange,
      onRefresh: () => this.loadUsers(true)
    });
    
    // Create table
    this.userTable = new UserTable(this.managerElement, {
      users: this.users,
      totalCount: this.totalUsers,
      currentPage: this.currentPage,
      pageSize: this.options.pageSize,
      isLoading: this.isLoading,
      sortField: this.sortField,
      sortDirection: this.sortDirection,
      selectedUsers: this.selectedUsers,
      onUserSelect: this.handleUserSelection,
      onPageChange: this.handlePageChange,
      onSort: this.handleSort,
      onEdit: this.handleEditUser,
      onDelete: this.handleDeleteUser,
      onResetPassword: this.handleResetPassword
    });
    
    // Create modals
    this.createCreateUserModal();
    this.createEditUserModal();
    this.createDeleteUserModal();
    this.createResetPasswordModal();
    this.createImportUsersModal();
  }
  
  /**
   * Create the create user modal
   */
  createCreateUserModal() {
    this.createUserModal = new CreateUserModal({
      onUserCreated: (user) => {
        // Add user to table if needed and reload
        this.loadUsers();
        
        // Log event
        logChatEvent('admin', 'User created', {
          username: user.username
        });
      }
    });
  }
  
  /**
   * Create the edit user modal
   */
  createEditUserModal() {
    this.editUserModal = new EditUserModal({
      onUserUpdated: (user) => {
        // Update user in table and reload
        this.loadUsers();
        
        // Log event
        logChatEvent('admin', 'User updated', {
          userId: user.id,
          username: user.username
        });
      }
    });
  }
  
  /**
   * Create the delete user modal
   */
  createDeleteUserModal() {
    this.deleteUserModal = new DeleteUserModal({
      onUserDeleted: (userId) => {
        // Remove user from selected users
        this.selectedUsers = this.selectedUsers.filter(id => id !== userId);
        
        // Reload users
        this.loadUsers();
        
        // Log event
        logChatEvent('admin', 'User deleted', {
          userId
        });
      }
    });
  }
  
  /**
   * Create the reset password modal
   */
  createResetPasswordModal() {
    this.resetPasswordModal = new ResetPasswordModal({
      onPasswordReset: (userId) => {
        // Log event
        logChatEvent('admin', 'User password reset', {
          userId
        });
      }
    });
  }
  
  /**
   * Create the import users modal
   */
  createImportUsersModal() {
    this.importUsersModal = new ImportUsersModal({
      onUsersImported: (result) => {
        // Reload users
        this.loadUsers();
        
        // Log event
        logChatEvent('admin', 'Users imported', {
          count: result.imported
        });
      }
    });
  }
  
  /**
   * Load users from service
   * @param {boolean} forceRefresh - Whether to force a refresh
   */
  async loadUsers(forceRefresh = false) {
    try {
      // Set loading state
      this.isLoading = true;
      this.updateTable();
      
      // Calculate pagination params
      const offset = (this.currentPage - 1) * this.options.pageSize;
      const limit = this.options.pageSize;
      
      // Prepare params
      const params = {
        offset,
        limit,
        sort: this.sortField,
        order: this.sortDirection,
        search: this.searchTerm || undefined,
        role: this.filters.role || undefined,
        status: this.filters.status || undefined,
        forceRefresh
      };
      
      // Get users from auth context
      const result = await authContext.getAllUsers(params);
      
      // Update state with results
      if (result.success) {
        this.users = result.data.users || [];
        this.totalUsers = result.data.total || this.users.length;
        
        // If current page is now invalid, go to last page
        const totalPages = Math.ceil(this.totalUsers / this.options.pageSize);
        if (this.currentPage > totalPages && totalPages > 0) {
          this.currentPage = totalPages;
          // Load again with correct page
          this.loadUsers();
          return;
        }
      } else {
        // Handle error
        throw new Error(result.message || 'Failed to load users');
      }
    } catch (error) {
      handleError(error, {
        code: ErrorCode.DATA_NOT_FOUND,
        category: ErrorCategory.DATA,
        source: 'UserManager',
        message: 'Failed to load users'
      });
      
      // Keep any existing users in case of error
      if (!this.users.length) {
        this.users = [];
      }
    } finally {
      // Set loading state
      this.isLoading = false;
      this.updateTable();
    }
  }
  
  /**
   * Update the user table
   */
  updateTable() {
    if (this.userTable) {
      this.userTable.updateProps({
        users: this.users,
        totalCount: this.totalUsers,
        currentPage: this.currentPage,
        isLoading: this.isLoading,
        sortField: this.sortField,
        sortDirection: this.sortDirection,
        selectedUsers: this.selectedUsers
      });
    }
    
    if (this.userToolbar) {
      this.userToolbar.updateProps({
        selectedCount: this.selectedUsers.length,
        isLoading: this.isLoading
      });
    }
  }
  
  /**
   * Handle search
   * @param {string} searchTerm - Search term
   */
  handleSearch(searchTerm) {
    this.searchTerm = searchTerm;
    this.currentPage = 1; // Reset to first page
    this.loadUsers();
    
    // Log search
    logChatEvent('admin', 'User search', {
      searchTerm
    });
  }
  
  /**
   * Handle sort
   * @param {string} field - Field to sort by
   * @param {string} direction - Sort direction (asc/desc)
   */
  handleSort(field, direction) {
    this.sortField = field;
    this.sortDirection = direction;
    this.loadUsers();
    
    // Log sort
    logChatEvent('admin', 'User list sorted', {
      field,
      direction
    });
  }
  
  /**
   * Handle page change
   * @param {number} page - New page number
   */
  handlePageChange(page) {
    this.currentPage = page;
    this.loadUsers();
    
    // Log page change
    logChatEvent('admin', 'User list page changed', {
      page
    });
  }
  
  /**
   * Handle filter change
   * @param {Object} filters - New filters
   */
  handleFilterChange(filters) {
    this.filters = filters;
    this.currentPage = 1; // Reset to first page
    this.loadUsers();
    
    // Log filter change
    logChatEvent('admin', 'User list filters changed', {
      filters
    });
  }
  
  /**
   * Handle user selection
   * @param {Array} selectedUsers - Selected user IDs
   */
  handleUserSelection(selectedUsers) {
    this.selectedUsers = selectedUsers;
    this.updateTable();
  }
  
  /**
   * Handle create user action
   */
  handleCreateUser() {
    if (this.createUserModal) {
      this.createUserModal.show();
    }
  }
  
  /**
   * Handle edit user action
   * @param {string} userId - User ID to edit
   */
  handleEditUser(userId) {
    if (this.editUserModal) {
      // Find user in current list
      const user = this.users.find(u => u.id === userId);
      
      if (user) {
        this.editUserModal.setUser(user);
        this.editUserModal.show();
      } else {
        console.error(`[UserManager] User not found: ${userId}`);
      }
    }
  }
  
  /**
   * Handle delete user action
   * @param {string} userId - User ID to delete
   */
  handleDeleteUser(userId) {
    if (this.deleteUserModal) {
      // If userId is provided, use that, otherwise use selected users
      const userIds = userId ? [userId] : this.selectedUsers;
      
      if (userIds.length === 0) {
        console.warn('[UserManager] No users selected for deletion');
        return;
      }
      
      this.deleteUserModal.setUserIds(userIds);
      this.deleteUserModal.show();
    }
  }
  
  /**
   * Handle reset password action
   * @param {string} userId - User ID to reset password for
   */
  handleResetPassword(userId) {
    if (this.resetPasswordModal) {
      // Find user in current list
      const user = this.users.find(u => u.id === userId);
      
      if (user) {
        this.resetPasswordModal.setUser(user);
        this.resetPasswordModal.show();
      } else {
        console.error(`[UserManager] User not found: ${userId}`);
      }
    }
  }
  
  /**
   * Handle import users action
   */
  handleImportUsers() {
    if (this.importUsersModal) {
      this.importUsersModal.show();
    }
  }
  
  /**
   * Render permission error
   */
  renderPermissionError() {
    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    // Create error message
    const errorElement = document.createElement('div');
    errorElement.className = 'permission-error';
    
    this.applyStyles(errorElement, {
      padding: '20px',
      textAlign: 'center',
      color: '#721c24',
      backgroundColor: '#f8d7da',
      border: '1px solid #f5c6cb',
      borderRadius: '4px',
      margin: '20px'
    });
    
    const errorTitle = document.createElement('h3');
    errorTitle.textContent = 'Permission Denied';
    
    const errorMessage = document.createElement('p');
    errorMessage.textContent = 'You do not have permission to manage users.';
    
    errorElement.appendChild(errorTitle);
    errorElement.appendChild(errorMessage);
    
    this.container.appendChild(errorElement);
  }
  
  /**
   * Render general error
   * @param {string} message - Error message
   */
  renderError(message) {
    // Clear container
    if (this.managerElement) {
      this.managerElement.innerHTML = '';
    }
    
    // Create error message
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    
    this.applyStyles(errorElement, {
      padding: '20px',
      textAlign: 'center',
      color: '#721c24',
      backgroundColor: '#f8d7da',
      border: '1px solid #f5c6cb',
      borderRadius: '4px',
      margin: '20px'
    });
    
    const errorText = document.createElement('p');
    errorText.textContent = message || 'An error occurred.';
    
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Retry';
    
    this.applyStyles(retryButton, {
      padding: '8px 16px',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginTop: '10px'
    });
    
    retryButton.addEventListener('click', () => {
      this.loadUsers(true);
    });
    
    errorElement.appendChild(errorText);
    errorElement.appendChild(retryButton);
    
    this.managerElement.appendChild(errorElement);
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
   * Render the user manager
   */
  render() {
    // Initial render happens in initialize
    // Updates happen through component update methods
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    try {
      // Clean up child components
      if (this.userTable) {
        this.userTable.destroy();
        this.userTable = null;
      }
      
      if (this.userToolbar) {
        this.userToolbar.destroy();
        this.userToolbar = null;
      }
      
      // Clean up modals
      if (this.createUserModal) {
        this.createUserModal.destroy();
        this.createUserModal = null;
      }
      
      if (this.editUserModal) {
        this.editUserModal.destroy();
        this.editUserModal = null;
      }
      
      if (this.deleteUserModal) {
        this.deleteUserModal.destroy();
        this.deleteUserModal = null;
      }
      
      if (this.resetPasswordModal) {
        this.resetPasswordModal.destroy();
        this.resetPasswordModal = null;
      }
      
      if (this.importUsersModal) {
        this.importUsersModal.destroy();
        this.importUsersModal = null;
      }
      
      // Remove from DOM
      if (this.managerElement && this.managerElement.parentNode) {
        this.managerElement.parentNode.removeChild(this.managerElement);
      }
      
      // Log destruction
      logChatEvent('admin', 'User manager destroyed');
    } catch (error) {
      console.error('[UserManager] Error destroying user manager:', error);
    }
  }
}

export default UserManager;