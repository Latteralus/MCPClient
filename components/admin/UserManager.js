// chat/components/admin/UserManager.js
// User management component for HIPAA-compliant chat

import { 
    getAllUsers, 
    getCurrentUser, 
    hasPermission
  } from '../../services/auth';
  import { logChatEvent } from '../../utils/logger.js';
  import UserTable from './users/UserTable.js';
  import UserToolbar from './users/UserToolbar.js';
  import CreateUserModal from './users/CreateUserModal.js';
  import EditUserModal from './users/EditUserModal.js';
  import DeleteUserModal from './users/DeleteUserModal.js';
  import ResetPasswordModal from './users/ResetPasswordModal.js';
  import ImportUsersModal from './users/ImportUsersModal.js';
  
  /**
   * User Manager Component
   * Provides user management functionality for administrators
   */
  class UserManager {
    /**
     * Create a new UserManager
     * @param {HTMLElement} container - The container element
     */
    constructor(container) {
      this.container = container;
      this.userManagerElement = null;
      this.users = [];
      this.isLoading = false;
      
      // Filter state
      this.searchTerm = '';
      this.roleFilter = 'all';
      this.currentPage = 1;
      this.pageSize = 10;
      
      // Sub-components
      this.userTable = null;
      this.userToolbar = null;
      
      // Bind methods
      this.render = this.render.bind(this);
      this.loadUsers = this.loadUsers.bind(this);
      this.handleSearch = this.handleSearch.bind(this);
      this.handleRoleFilter = this.handleRoleFilter.bind(this);
      this.handlePageChange = this.handlePageChange.bind(this);
      this.showCreateUserModal = this.showCreateUserModal.bind(this);
      this.showEditUserModal = this.showEditUserModal.bind(this);
      this.showDeleteUserModal = this.showDeleteUserModal.bind(this);
      this.showResetPasswordModal = this.showResetPasswordModal.bind(this);
      this.showImportUsersModal = this.showImportUsersModal.bind(this);
      
      // Initialize
      this.initialize();
    }
    
    /**
     * Initialize the user manager
     */
    initialize() {
      // Create container element
      this.userManagerElement = document.createElement('div');
      this.userManagerElement.className = 'user-manager';
      this.applyStyles(this.userManagerElement, {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#f8f9fa'
      });
      
      // Add to container
      if (this.container) {
        this.container.appendChild(this.userManagerElement);
      }
      
      // Load users
      this.loadUsers();
      
      // Log initialization
      logChatEvent('admin', 'User manager initialized');
    }
    
    /**
     * Load users from the server
     */
    async loadUsers() {
      try {
        this.isLoading = true;
        this.render(); // Show loading state
        
        const result = await getAllUsers();
        
        if (result.success) {
          this.users = result.users;
          console.log('[CRM Extension] Loaded users:', this.users.length);
        } else {
          console.error('[CRM Extension] Error loading users:', result.error);
          this.users = [];
        }
        
        this.isLoading = false;
        this.render();
      } catch (error) {
        console.error('[CRM Extension] Error loading users:', error);
        this.isLoading = false;
        this.users = [];
        this.render();
      }
    }
    
    /**
     * Render the user manager
     */
    render() {
      if (!this.userManagerElement) return;
      
      // Clear existing content
      this.userManagerElement.innerHTML = '';
      
      // Check permissions
      const currentUser = getCurrentUser();
      const isAdmin = currentUser && currentUser.role === 'admin';
      
      if (!isAdmin) {
        this.renderAccessDenied();
        return;
      }
      
      // Create header
      const header = document.createElement('div');
      header.className = 'user-manager-header';
      this.applyStyles(header, {
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      });
      
      const titleBlock = document.createElement('div');
      
      const title = document.createElement('h3');
      title.textContent = 'User Management';
      this.applyStyles(title, {
        margin: '0 0 8px 0',
        fontSize: '20px',
        fontWeight: 'bold'
      });
      
      const subtitle = document.createElement('p');
      subtitle.textContent = `${this.users.length} users in system`;
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
      
      // Create user button
      const createButton = document.createElement('button');
      createButton.textContent = 'Create User';
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
      
      createButton.addEventListener('click', this.showCreateUserModal);
      
      const createIcon = document.createElement('span');
      createIcon.textContent = '➕';
      this.applyStyles(createIcon, {
        marginRight: '5px'
      });
      
      createButton.prepend(createIcon);
      
      // Import users button
      const importButton = document.createElement('button');
      importButton.textContent = 'Import Users';
      this.applyStyles(importButton, {
        padding: '8px 16px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center'
      });
      
      importButton.addEventListener('click', this.showImportUsersModal);
      
      const importIcon = document.createElement('span');
      importIcon.textContent = '📥';
      this.applyStyles(importIcon, {
        marginRight: '5px'
      });
      
      importButton.prepend(importIcon);
      
      actionButtons.appendChild(createButton);
      actionButtons.appendChild(importButton);
      
      header.appendChild(titleBlock);
      header.appendChild(actionButtons);
      this.userManagerElement.appendChild(header);
      
      // Create and render toolbar (search + filters)
      this.userToolbar = new UserToolbar({
        searchTerm: this.searchTerm,
        roleFilter: this.roleFilter,
        onSearch: this.handleSearch,
        onRoleFilterChange: this.handleRoleFilter,
        onRefresh: this.loadUsers
      });
      
      this.userManagerElement.appendChild(this.userToolbar.render());
      
      // Show loading state or render user table
      if (this.isLoading) {
        const loadingElement = document.createElement('div');
        this.applyStyles(loadingElement, {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '50px',
          color: '#6c757d'
        });
        
        loadingElement.textContent = 'Loading users...';
        this.userManagerElement.appendChild(loadingElement);
      } else {
        // Filter users
        const filteredUsers = this.filterUsers();
        
        // Create and render user table
        this.userTable = new UserTable({
          users: filteredUsers,
          currentPage: this.currentPage,
          pageSize: this.pageSize,
          onPageChange: this.handlePageChange,
          onEditUser: this.showEditUserModal,
          onDeleteUser: this.showDeleteUserModal,
          onResetPassword: this.showResetPasswordModal
        });
        
        this.userManagerElement.appendChild(this.userTable.render());
      }
      
      return this.userManagerElement;
    }
    
    /**
     * Filter users based on search term and role filter
     * @returns {Array} Filtered users
     */
    filterUsers() {
      return this.users.filter(user => {
        // Apply search filter
        const matchesSearch = this.searchTerm === '' || 
          (user.username && user.username.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
          (user.displayName && user.displayName.toLowerCase().includes(this.searchTerm.toLowerCase()));
        
        // Apply role filter
        const matchesRole = this.roleFilter === 'all' || user.role === this.roleFilter;
        
        return matchesSearch && matchesRole;
      });
    }
    
    /**
     * Render access denied message
     */
    renderAccessDenied() {
      this.userManagerElement.innerHTML = '';
      
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
      messageElement.textContent = 'Administrator privileges are required to access User Management.';
      
      accessDenied.appendChild(iconElement);
      accessDenied.appendChild(titleElement);
      accessDenied.appendChild(messageElement);
      
      this.userManagerElement.appendChild(accessDenied);
      
      // Log access attempt
      logChatEvent('admin', 'Access denied to user management');
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
     * Handle role filter change
     * @param {string} role - Role to filter by
     */
    handleRoleFilter(role) {
      this.roleFilter = role;
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
     * Show create user modal
     */
    showCreateUserModal() {
      const modal = new CreateUserModal({
        onSuccess: () => this.loadUsers()
      });
      modal.show();
    }
    
    /**
     * Show edit user modal
     * @param {Object} user - User to edit
     */
    showEditUserModal(user) {
      const modal = new EditUserModal({
        user,
        onSuccess: () => this.loadUsers()
      });
      modal.show();
    }
    
    /**
     * Show delete user modal
     * @param {Object} user - User to delete
     */
    showDeleteUserModal(user) {
      const modal = new DeleteUserModal({
        user,
        onSuccess: () => this.loadUsers()
      });
      modal.show();
    }
    
    /**
     * Show reset password modal
     * @param {Object} user - User to reset password for
     */
    showResetPasswordModal(user) {
      const modal = new ResetPasswordModal({
        user,
        onSuccess: () => this.loadUsers()
      });
      modal.show();
    }
    
    /**
     * Show import users modal
     */
    showImportUsersModal() {
      const modal = new ImportUsersModal({
        onSuccess: () => this.loadUsers()
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
      if (this.userManagerElement && this.userManagerElement.parentNode) {
        this.userManagerElement.parentNode.removeChild(this.userManagerElement);
      }
      
      // Cleanup subcomponents
      if (this.userTable) {
        this.userTable.destroy();
      }
      
      if (this.userToolbar) {
        this.userToolbar.destroy();
      }
      
      // Log destruction
      logChatEvent('admin', 'User manager destroyed');
    }
  }
  
  export default UserManager;