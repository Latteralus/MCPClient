// chat/components/admin/roles/RoleToolbar.js
// Role search and filtering toolbar for role management

/**
 * Role Toolbar Component
 * Provides search functionality for the role list
 */
class RoleToolbar {
    /**
     * Create a new RoleToolbar
     * @param {Object} options - Toolbar options
     * @param {string} options.searchTerm - Initial search term
     * @param {Function} options.onSearch - Search callback
     * @param {Function} options.onRefresh - Refresh callback
     */
    constructor(options = {}) {
      this.options = {
        searchTerm: '',
        onSearch: () => {},
        onRefresh: () => {},
        ...options
      };
      
      this.toolbarElement = null;
      
      // Bind methods
      this.render = this.render.bind(this);
      this.handleSearch = this.handleSearch.bind(this);
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
      searchInput.placeholder = 'Search roles by name or description...';
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
      
      // Actions container
      const actionsContainer = document.createElement('div');
      this.applyStyles(actionsContainer, {
        display: 'flex',
        alignItems: 'center'
      });
      
      // Add refresh button
      const refreshButton = document.createElement('button');
      refreshButton.textContent = 'Refresh';
      this.applyStyles(refreshButton, {
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
      
      actionsContainer.appendChild(refreshButton);
      
      this.toolbarElement.appendChild(searchContainer);
      this.toolbarElement.appendChild(actionsContainer);
      
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
  
  export default RoleToolbar;