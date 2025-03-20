// chat/components/admin/roles/PermissionSelector.js
// Permission selection component for role management

import { getAvailablePermissions } from '../../../services/auth';

/**
 * Permission Selector Component
 * Allows selection of multiple permissions for roles
 */
class PermissionSelector {
  /**
   * Create a new PermissionSelector
   * @param {Object} options - Selector options
   * @param {Array} options.selectedPermissions - Initially selected permissions
   */
  constructor(options = {}) {
    this.options = {
      selectedPermissions: [],
      ...options
    };
    
    this.availablePermissions = [];
    this.selectedPermissions = [...this.options.selectedPermissions];
    this.selectorElement = null;
    this.permissionListElement = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.renderPermissionList = this.renderPermissionList.bind(this);
    this.togglePermission = this.togglePermission.bind(this);
    this.getSelectedPermissions = this.getSelectedPermissions.bind(this);
    this.setSelectedPermissions = this.setSelectedPermissions.bind(this);
  }
  
  /**
   * Initialize permission data
   */
  async initialize() {
    try {
      // Get available permissions from the auth service
      const result = await getAvailablePermissions();
      if (result.success) {
        this.availablePermissions = result.permissions;
      } else {
        console.error('[CRM Extension] Error loading permissions:', result.error);
        this.availablePermissions = [];
      }
    } catch (error) {
      console.error('[CRM Extension] Error initializing permissions:', error);
      this.availablePermissions = [];
    }
    
    // If no permissions loaded, use default permission list
    if (this.availablePermissions.length === 0) {
      this.availablePermissions = this.getDefaultPermissions();
    }
    
    // Validate selected permissions against available permissions
    this.selectedPermissions = this.selectedPermissions.filter(
      permission => this.availablePermissions.some(p => p.id === permission)
    );
    
    // Render permission list if already mounted
    if (this.permissionListElement) {
      this.renderPermissionList();
    }
  }
  
  /**
   * Get default permissions if server doesn't provide them
   * @returns {Array} Default permission list
   */
  getDefaultPermissions() {
    return [
      { id: 'user.create', name: 'Create users', category: 'Users' },
      { id: 'user.read', name: 'View users', category: 'Users' },
      { id: 'user.update', name: 'Edit users', category: 'Users' },
      { id: 'user.delete', name: 'Delete users', category: 'Users' },
      
      { id: 'channel.create', name: 'Create channels', category: 'Channels' },
      { id: 'channel.read', name: 'View channels', category: 'Channels' },
      { id: 'channel.update', name: 'Edit channels', category: 'Channels' },
      { id: 'channel.delete', name: 'Delete channels', category: 'Channels' },
      { id: 'channel.invite', name: 'Invite to channels', category: 'Channels' },
      
      { id: 'message.create', name: 'Send messages', category: 'Messages' },
      { id: 'message.read', name: 'Read messages', category: 'Messages' },
      { id: 'message.update.own', name: 'Edit own messages', category: 'Messages' },
      { id: 'message.delete.own', name: 'Delete own messages', category: 'Messages' },
      { id: 'message.delete', name: 'Delete any message', category: 'Messages' },
      
      { id: 'role.create', name: 'Create roles', category: 'Roles' },
      { id: 'role.read', name: 'View roles', category: 'Roles' },
      { id: 'role.update', name: 'Edit roles', category: 'Roles' },
      { id: 'role.delete', name: 'Delete roles', category: 'Roles' },
      
      { id: 'audit.read', name: 'View audit logs', category: 'Administration' },
      { id: 'audit.export', name: 'Export audit logs', category: 'Administration' },
      { id: 'settings.read', name: 'View settings', category: 'Administration' },
      { id: 'settings.update', name: 'Edit settings', category: 'Administration' }
    ];
  }
  
  /**
   * Render the permission selector
   * @returns {HTMLElement} The rendered selector
   */
  render() {
    // Create selector container
    this.selectorElement = document.createElement('div');
    this.selectorElement.className = 'permission-selector';
    this.applyStyles(this.selectorElement, {
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      maxHeight: '300px',
      overflow: 'auto'
    });
    
    // Create permission list container
    this.permissionListElement = document.createElement('div');
    this.selectorElement.appendChild(this.permissionListElement);
    
    // Initialize permissions (if not already done)
    if (this.availablePermissions.length === 0) {
      // Add loading indicator
      const loadingElement = document.createElement('div');
      loadingElement.textContent = 'Loading permissions...';
      this.applyStyles(loadingElement, {
        padding: '10px',
        textAlign: 'center',
        color: '#6c757d'
      });
      this.permissionListElement.appendChild(loadingElement);
      
      // Initialize and then render
      this.initialize().then(() => {
        this.renderPermissionList();
      });
    } else {
      // Render permission list immediately
      this.renderPermissionList();
    }
    
    return this.selectorElement;
  }
  
  /**
   * Render the permission list
   */
  renderPermissionList() {
    if (!this.permissionListElement) return;
    
    // Clear existing content
    this.permissionListElement.innerHTML = '';
    
    // Group permissions by category
    const permissionsByCategory = this.groupPermissionsByCategory();
    
    // Create permission groups by category
    Object.keys(permissionsByCategory).sort().forEach(category => {
      const categoryPermissions = permissionsByCategory[category];
      
      // Create category header
      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'permission-category';
      this.applyStyles(categoryHeader, {
        backgroundColor: '#f8f9fa',
        padding: '8px 12px',
        fontWeight: 'bold',
        borderBottom: '1px solid #dee2e6'
      });
      categoryHeader.textContent = category;
      this.permissionListElement.appendChild(categoryHeader);
      
      // Create permissions for this category
      categoryPermissions.forEach(permission => {
        const permissionItem = this.createPermissionItem(permission);
        this.permissionListElement.appendChild(permissionItem);
      });
    });
    
    // If no permissions are available, show message
    if (Object.keys(permissionsByCategory).length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.textContent = 'No permissions available';
      this.applyStyles(emptyMessage, {
        padding: '10px',
        textAlign: 'center',
        color: '#6c757d'
      });
      this.permissionListElement.appendChild(emptyMessage);
    }
  }
  
  /**
   * Group permissions by category
   * @returns {Object} Permissions grouped by category
   */
  groupPermissionsByCategory() {
    const groups = {};
    
    this.availablePermissions.forEach(permission => {
      const category = permission.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(permission);
    });
    
    return groups;
  }
  
  /**
   * Create a permission item element
   * @param {Object} permission - Permission data
   * @returns {HTMLElement} Permission item element
   */
  createPermissionItem(permission) {
    const item = document.createElement('div');
    item.className = 'permission-item';
    item.setAttribute('data-permission-id', permission.id);
    
    this.applyStyles(item, {
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      borderBottom: '1px solid #f0f0f0',
      cursor: 'pointer'
    });
    
    // Add hover effect
    item.addEventListener('mouseover', () => {
      item.style.backgroundColor = '#f8f9fa';
    });
    
    item.addEventListener('mouseout', () => {
      item.style.backgroundColor = '';
    });
    
    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `perm-${permission.id}`;
    checkbox.checked = this.selectedPermissions.includes(permission.id);
    
    this.applyStyles(checkbox, {
      marginRight: '8px'
    });
    
    // Create label
    const label = document.createElement('label');
    label.htmlFor = `perm-${permission.id}`;
    label.textContent = permission.name;
    
    this.applyStyles(label, {
      flex: '1',
      marginLeft: '4px',
      cursor: 'pointer'
    });
    
    // Add click event to toggle permission
    item.addEventListener('click', (e) => {
      if (e.target !== checkbox) { // Avoid double-toggling when clicking directly on checkbox
        checkbox.checked = !checkbox.checked;
        this.togglePermission(permission.id, checkbox.checked);
      }
    });
    
    checkbox.addEventListener('change', () => {
      this.togglePermission(permission.id, checkbox.checked);
    });
    
    item.appendChild(checkbox);
    item.appendChild(label);
    
    return item;
  }
  
  /**
   * Toggle a permission selection
   * @param {string} permissionId - Permission ID to toggle
   * @param {boolean} selected - Whether permission is selected
   */
  togglePermission(permissionId, selected) {
    if (selected) {
      // Add permission if not already selected
      if (!this.selectedPermissions.includes(permissionId)) {
        this.selectedPermissions.push(permissionId);
      }
    } else {
      // Remove permission from selection
      this.selectedPermissions = this.selectedPermissions.filter(id => id !== permissionId);
    }
  }
  
  /**
   * Get currently selected permissions
   * @returns {Array} Array of selected permission IDs
   */
  getSelectedPermissions() {
    return [...this.selectedPermissions];
  }
  
  /**
   * Set selected permissions
   * @param {Array} permissions - Permission IDs to select
   */
  setSelectedPermissions(permissions) {
    this.selectedPermissions = [...permissions];
    
    // Update UI if already rendered
    if (this.permissionListElement) {
      // Update checkboxes
      this.selectedPermissions.forEach(permissionId => {
        const checkbox = this.permissionListElement.querySelector(`#perm-${permissionId}`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });
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
    // Remove from DOM
    if (this.selectorElement && this.selectorElement.parentNode) {
      this.selectorElement.parentNode.removeChild(this.selectorElement);
    }
  }
}

export default PermissionSelector;