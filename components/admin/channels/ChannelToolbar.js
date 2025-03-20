// chat/components/admin/channels/ChannelToolbar.js
// Channel search and filtering toolbar for channel management

/**
 * Channel Toolbar Component
 * Provides search and filtering functionality for the channel list
 */
class ChannelToolbar {
    /**
     * Create a new ChannelToolbar
     * @param {Object} options - Toolbar options
     * @param {string} options.searchTerm - Initial search term
     * @param {string} options.typeFilter - Initial type filter
     * @param {Function} options.onSearch - Search callback
     * @param {Function} options.onTypeFilterChange - Type filter callback
     * @param {Function} options.onRefresh - Refresh callback
     */
    constructor(options = {}) {
      this.options = {
        searchTerm: '',
        typeFilter: 'all',
        onSearch: () => {},
        onTypeFilterChange: () => {},
        onRefresh: () => {},
        ...options
      };
      
      this.toolbarElement = null;
      
      // Bind methods
      this.render = this.render.bind(this);
      this.handleSearch = this.handleSearch.bind(this);
      this.handleTypeFilter = this.handleTypeFilter.bind(this);
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
      searchInput.placeholder = 'Search channels by name or description...';
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
      
      // Type filter
      const filterContainer = document.createElement('div');
      this.applyStyles(filterContainer, {
        display: 'flex',
        alignItems: 'center'
      });
      
      const filterLabel = document.createElement('label');
      filterLabel.textContent = 'Type:';
      this.applyStyles(filterLabel, {
        marginRight: '8px',
        fontSize: '14px'
      });
      
      const typeSelect = document.createElement('select');
      this.applyStyles(typeSelect, {
        padding: '8px',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        fontSize: '14px'
      });
      
      const typeOptions = [
        { value: 'all', label: 'All Types' },
        { value: 'public', label: 'Public' },
        { value: 'private', label: 'Private' }
      ];
      
      typeOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        optionElement.selected = this.options.typeFilter === option.value;
        
        typeSelect.appendChild(optionElement);
      });
      
      typeSelect.addEventListener('change', (e) => this.handleTypeFilter(e.target.value));
      
      filterContainer.appendChild(filterLabel);
      filterContainer.appendChild(typeSelect);
      
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
     * Handle type filter change
     * @param {string} value - Selected type value
     */
    handleTypeFilter(value) {
      if (this.options.onTypeFilterChange && typeof this.options.onTypeFilterChange === 'function') {
        this.options.onTypeFilterChange(value);
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
  
  export default ChannelToolbar;