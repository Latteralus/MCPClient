// chat/components/admin/users/UserToolbar.js
// User search and filtering toolbar for user management

/**
 * User Toolbar Component
 * Provides search and filtering functionality for the user list
 */
class UserToolbar {
    /**
     * Create a new UserToolbar
     * @param {Object} options - Toolbar options
     * @param {string} options.searchTerm - Initial search term
     * @param {string} options.roleFilter - Initial role filter
     * @param {Function} options.onSearch - Search callback
     * @param {Function} options.onRoleFilterChange - Role filter callback
     * @param {Function} options.onRefresh - Refresh callback
     */
    constructor(options = {}) {
      this.options = {
        searchTerm: '',
        roleFilter: 'all',
        onSearch: () => {},
        onRoleFilterChange: () => {},
        onRefresh: () => {},
        ...options
      };
      
      this.toolbarElement = null;
      
      // Bind methods
      this.render = this.render.bind(this);
      this.handleSearch = this.handleSearch.bind(this);
      this.handleRoleFilter = this.handleRoleFilter.bind(this);
    }
    
    /**
     * Render the toolbar
     * @returns {HTMLElement} The rendered toolbar element
     */
    render() {
      // Create toolbar container
      this.toolbarElement = document.createElement('div');
      this.applyStyles(this.toolbarElement, {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '15px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #dee2e6'
      });
      
      // Search box
      const searchContainer = document.createElement('div');
      this.applyStyles(searchContainer, {
        display: 'flex',
        alignItems: 'center',
        flex: '1',
        marginRight: '15px'
      });
      
      const searchIcon = document.createElement('span');
      searchIcon.textContent = '🔍';
      this.applyStyles(searchIcon, {
        marginRight: '8px'
      });
      
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search users by name or username...';
      searchInput.value = this.options.searchTerm;
      this.applyStyles(searchInput, {
        flex: '1',
        padding: '8px 12px',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        fontSize: '14px'
      });
      
      searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
      
      searchContainer.appendChild(searchIcon);
      searchContainer.appendChild(searchInput);
      
      // Role filter
      const filterContainer = document.createElement('div');
      this.applyStyles(filterContainer, {
        display: 'flex',
        alignItems: 'center'
      });
      
      const filterLabel = document.createElement('label');
      filterLabel.textContent = 'Role:';
      this.applyStyles(filterLabel, {
        marginRight: '8px',
        fontSize: '14px'
      });
      
      const roleSelect = document.createElement('select');
      this.applyStyles(roleSelect, {
        padding: '8px',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        fontSize: '14px'
      });
      
      const roleOptions = [
        { value: 'all', label: 'All Roles' },
        { value: 'admin', label: 'Administrators' },
        { value: 'moderator', label: 'Moderators' },
        { value: 'user', label: 'Regular Users' }
      ];
      
      roleOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        optionElement.selected = this.options.roleFilter === option.value;
        
        roleSelect.appendChild(optionElement);
      });
      
      roleSelect.addEventListener('change', (e) => this.handleRoleFilter(e.target.value));
      
      filterContainer.appendChild(filterLabel);
      filterContainer.appendChild(roleSelect);
      
      // Add refresh button
      const refreshButton = document.createElement('button');
      refreshButton.textContent = 'Refresh';
      this.applyStyles(refreshButton, {
        marginLeft: '15px',
        padding: '8px 12px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center'
      });
      
      refreshButton.addEventListener('click', this.options.onRefresh);
      
      const refreshIcon = document.createElement('span');
      refreshIcon.textContent = '🔄';
      this.applyStyles(refreshIcon, {
        marginRight: '5px'
      });
      
      refreshButton.prepend(refreshIcon);
      
      filterContainer.appendChild(refreshButton);
      
      this.toolbarElement.appendChild(searchContainer);
      this.toolbarElement.appendChild(filterContainer);
      
      return this.toolbarElement;
    }
    
    /**
     * Handle search input
     * @param {string} value - Search input value
     */
    handleSearch(value) {
      if (this.options.onSearch && typeof this.options.onSearch === 'function') {
        this.options.onSearch(value);
      }
    }
    
    /**
     * Handle role filter change
     * @param {string} value - Selected role value
     */
    handleRoleFilter(value) {
      if (this.options.onRoleFilterChange && typeof this.options.onRoleFilterChange === 'function') {
        this.options.onRoleFilterChange(value);
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
      if (this.toolbarElement && this.toolbarElement.parentNode) {
        this.toolbarElement.parentNode.removeChild(this.toolbarElement);
      }
    }
  }
  
  export default UserToolbar;