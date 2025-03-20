// chat/components/common/ModalBase.js
// Base modal component for HIPAA-compliant chat application

import { logChatEvent } from '../../utils/logger.js';
import { handleError, ErrorCategory, ErrorCode } from '../../utils/error-handler.js';
import { getConfig } from '../../config/index.js';

/**
 * Base Modal Component
 * Provides common modal functionality for reuse in other components
 */
class ModalBase {
  /**
   * Create a new ModalBase
   * @param {Object} options - Modal options 
   * @param {string} options.title - Modal title
   * @param {string} options.width - Modal width
   * @param {string} options.height - Modal height
   * @param {boolean} options.closeOnOverlayClick - Whether to close when clicking outside
   * @param {boolean} options.closeOnEscape - Whether to close on Escape key
   * @param {boolean} options.showCloseButton - Whether to show the close button
   * @param {Function} options.onClose - Callback for when modal closes
   * @param {Function} options.onOpen - Callback for when modal opens
   * @param {string} options.className - Additional class name for the modal
   * @param {boolean} options.hideCloseButton - Whether to hide the close button
   * @param {boolean} options.fullscreen - Whether the modal should be fullscreen
   * @param {boolean} options.centered - Whether to center the modal vertically
   */
  constructor(options = {}) {
    this.options = {
      title: 'Modal',
      width: '400px',
      height: 'auto',
      closeOnOverlayClick: true,
      closeOnEscape: true,
      showCloseButton: true,
      onClose: null,
      onOpen: null,
      className: '',
      hideCloseButton: false,
      fullscreen: false,
      centered: true,
      zIndex: 1000,
      ...options
    };
    
    // DOM elements
    this.overlayElement = null;
    this.modalElement = null;
    this.headerElement = null;
    this.bodyElement = null;
    this.footerElement = null;
    
    // State tracking
    this.isOpen = false;
    this.modalId = `modal-${Math.random().toString(36).substr(2, 9)}`;
    this.focusableElements = null;
    this.previouslyFocusedElement = null;
    
    // Event handlers
    this.handleEscKey = this.handleEscKey.bind(this);
    this.handleOverlayClick = this.handleOverlayClick.bind(this);
    this.handleTabKey = this.handleTabKey.bind(this);
    
    // Bind methods
    this.show = this.show.bind(this);
    this.close = this.close.bind(this);
    this.renderContent = this.renderContent.bind(this);
    this.renderFooter = this.renderFooter.bind(this);
    this.setTitle = this.setTitle.bind(this);
    this.setWidth = this.setWidth.bind(this);
    this.setHeight = this.setHeight.bind(this);
    this.addFooterButton = this.addFooterButton.bind(this);
  }
  
  /**
   * Show the modal
   */
  show() {
    try {
      // Prevent showing if already open
      if (this.isOpen) return;
      
      // Store previously focused element to restore focus when modal closes
      this.previouslyFocusedElement = document.activeElement;
      
      // Create overlay
      this.overlayElement = document.createElement('div');
      this.overlayElement.className = `modal-overlay ${this.options.className}-overlay`;
      this.overlayElement.setAttribute('role', 'dialog');
      this.overlayElement.setAttribute('aria-modal', 'true');
      this.overlayElement.setAttribute('aria-labelledby', `${this.modalId}-title`);
      
      this.applyStyles(this.overlayElement, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: this.options.centered ? 'center' : 'flex-start',
        justifyContent: 'center',
        zIndex: this.options.zIndex,
        overflow: 'auto',
        padding: this.options.fullscreen ? '0' : '20px',
        boxSizing: 'border-box'
      });
      
      // Create modal
      this.modalElement = document.createElement('div');
      this.modalElement.className = `modal-container ${this.options.className}`;
      this.modalElement.id = this.modalId;
      
      this.applyStyles(this.modalElement, {
        backgroundColor: 'white',
        borderRadius: this.options.fullscreen ? '0' : '4px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        width: this.options.fullscreen ? '100%' : this.options.width,
        height: this.options.fullscreen ? '100%' : this.options.height,
        maxWidth: this.options.fullscreen ? 'none' : '90%',
        maxHeight: this.options.fullscreen ? 'none' : '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      });
      
      // Create modal header
      this.createHeader();
      
      // Create modal body
      this.createBody();
      
      // Create modal footer
      this.createFooter();
      
      // Add modal to overlay
      this.overlayElement.appendChild(this.modalElement);
      
      // Add to body
      document.body.appendChild(this.overlayElement);
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Focus the first focusable element in the modal
      this.focusableElements = this.modalElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (this.focusableElements.length > 0) {
        this.focusableElements[0].focus();
      }
      
      // Set open state
      this.isOpen = true;
      
      // Call onOpen callback if provided
      if (typeof this.options.onOpen === 'function') {
        this.options.onOpen();
      }
      
      // Log event
      logChatEvent('ui', 'Modal opened', {
        title: this.options.title,
        modalId: this.modalId
      });
    } catch (error) {
      handleError(error, {
        code: ErrorCode.COMPONENT_FAILED,
        category: ErrorCategory.UI,
        source: 'ModalBase',
        message: 'Failed to show modal'
      });
    }
  }
  
  /**
   * Create modal header
   */
  createHeader() {
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'modal-header';
    
    this.applyStyles(this.headerElement, {
      padding: '16px 24px',
      borderBottom: '1px solid #e8e8e8',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#f9f9f9'
    });
    
    // Title
    const title = document.createElement('h3');
    title.textContent = this.options.title;
    title.id = `${this.modalId}-title`;
    
    this.applyStyles(title, {
      margin: '0',
      padding: '0',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#333'
    });
    
    // Close button (optional)
    if (this.options.showCloseButton && !this.options.hideCloseButton) {
      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'modal-close-button';
      closeButton.innerHTML = '&times;';
      closeButton.setAttribute('aria-label', 'Close');
      
      this.applyStyles(closeButton, {
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '24px',
        fontWeight: 'bold',
        cursor: 'pointer',
        padding: '0',
        lineHeight: '1',
        color: '#666',
        transition: 'color 0.2s'
      });
      
      // Hover effect
      closeButton.addEventListener('mouseover', () => {
        closeButton.style.color = '#000';
      });
      
      closeButton.addEventListener('mouseout', () => {
        closeButton.style.color = '#666';
      });
      
      closeButton.addEventListener('click', this.close);
      
      this.headerElement.appendChild(title);
      this.headerElement.appendChild(closeButton);
    } else {
      this.headerElement.appendChild(title);
    }
    
    this.modalElement.appendChild(this.headerElement);
  }
  
  /**
   * Create modal body
   */
  createBody() {
    this.bodyElement = document.createElement('div');
    this.bodyElement.className = 'modal-body';
    
    this.applyStyles(this.bodyElement, {
      padding: '24px',
      overflowY: 'auto',
      maxHeight: this.options.fullscreen ? 'calc(100vh - 120px)' : 'calc(80vh - 120px)',
      flex: '1'
    });
    
    // Add content
    try {
      const content = this.renderContent();
      if (content) {
        if (content instanceof HTMLElement) {
          this.bodyElement.appendChild(content);
        } else if (typeof content === 'string') {
          this.bodyElement.innerHTML = content;
        }
      }
    } catch (error) {
      console.error('[ModalBase] Error rendering content:', error);
      this.bodyElement.textContent = 'Error rendering content';
    }
    
    this.modalElement.appendChild(this.bodyElement);
  }
  
  /**
   * Create modal footer
   */
  createFooter() {
    // Only create footer if renderFooter returns content
    try {
      const footerContent = this.renderFooter();
      
      if (footerContent) {
        this.footerElement = document.createElement('div');
        this.footerElement.className = 'modal-footer';
        
        this.applyStyles(this.footerElement, {
          padding: '16px 24px',
          borderTop: '1px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          backgroundColor: '#f9f9f9'
        });
        
        if (footerContent instanceof HTMLElement) {
          this.footerElement.appendChild(footerContent);
        } else if (typeof footerContent === 'string') {
          this.footerElement.innerHTML = footerContent;
        } else if (Array.isArray(footerContent)) {
          footerContent.forEach(element => {
            if (element instanceof HTMLElement) {
              this.footerElement.appendChild(element);
            }
          });
        }
        
        this.modalElement.appendChild(this.footerElement);
      }
    } catch (error) {
      console.error('[ModalBase] Error rendering footer:', error);
    }
  }
  
  /**
   * Setup event listeners for modal
   */
  setupEventListeners() {
    // Close on overlay click if enabled
    if (this.options.closeOnOverlayClick) {
      this.overlayElement.addEventListener('click', this.handleOverlayClick);
    }
    
    // Handle escape key if enabled
    if (this.options.closeOnEscape) {
      document.addEventListener('keydown', this.handleEscKey);
    }
    
    // Handle tab key for focus trap
    document.addEventListener('keydown', this.handleTabKey);
  }
  
  /**
   * Handle Escape key press
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleEscKey(e) {
    if (e.key === 'Escape' && this.isOpen) {
      this.close();
    }
  }
  
  /**
   * Handle Tab key press for focus trapping
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleTabKey(e) {
    if (e.key === 'Tab' && this.isOpen && this.focusableElements && this.focusableElements.length > 0) {
      // Get the first and last focusable elements
      const firstFocusable = this.focusableElements[0];
      const lastFocusable = this.focusableElements[this.focusableElements.length - 1];
      
      // If shift+tab and focus is on first element, move to last
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } 
      // If tab and focus is on last element, move to first
      else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }
  
  /**
   * Handle overlay click
   * @param {MouseEvent} e - Mouse event
   */
  handleOverlayClick(e) {
    if (e.target === this.overlayElement) {
      this.close();
    }
  }
  
  /**
   * Close the modal
   */
  close() {
    try {
      if (!this.isOpen) return;
      
      // Remove event listeners
      if (this.options.closeOnOverlayClick) {
        this.overlayElement.removeEventListener('click', this.handleOverlayClick);
      }
      
      if (this.options.closeOnEscape) {
        document.removeEventListener('keydown', this.handleEscKey);
      }
      
      document.removeEventListener('keydown', this.handleTabKey);
      
      // Remove from DOM
      if (this.overlayElement && this.overlayElement.parentNode) {
        this.overlayElement.parentNode.removeChild(this.overlayElement);
      }
      
      // Reset elements
      this.overlayElement = null;
      this.modalElement = null;
      this.headerElement = null;
      this.bodyElement = null;
      this.footerElement = null;
      
      // Reset state
      this.isOpen = false;
      
      // Restore focus to previously focused element
      if (this.previouslyFocusedElement && this.previouslyFocusedElement.focus) {
        this.previouslyFocusedElement.focus();
      }
      
      // Call onClose callback if provided
      if (typeof this.options.onClose === 'function') {
        this.options.onClose();
      }
      
      // Log event
      logChatEvent('ui', 'Modal closed', {
        title: this.options.title,
        modalId: this.modalId
      });
    } catch (error) {
      handleError(error, {
        code: ErrorCode.COMPONENT_FAILED,
        category: ErrorCategory.UI,
        source: 'ModalBase',
        message: 'Failed to close modal'
      });
    }
  }
  
  /**
   * Render modal content (to be overridden by subclasses)
   * @returns {HTMLElement|string} Modal content
   */
  renderContent() {
    // Default implementation returns empty content
    const content = document.createElement('div');
    content.textContent = 'This modal has no content. Override the renderContent method.';
    return content;
  }
  
  /**
   * Render modal footer (to be overridden by subclasses)
   * @returns {HTMLElement|string|Array<HTMLElement>} Modal footer content
   */
  renderFooter() {
    // Default implementation returns null (no footer)
    return null;
  }
  
  /**
   * Set modal title
   * @param {string} title - New title
   */
  setTitle(title) {
    this.options.title = title;
    
    // Update title if modal is open
    if (this.isOpen && this.headerElement) {
      const titleElement = this.headerElement.querySelector(`#${this.modalId}-title`);
      if (titleElement) {
        titleElement.textContent = title;
      }
    }
  }
  
  /**
   * Set modal width
   * @param {string} width - New width
   */
  setWidth(width) {
    this.options.width = width;
    
    // Update width if modal is open
    if (this.isOpen && this.modalElement && !this.options.fullscreen) {
      this.modalElement.style.width = width;
    }
  }
  
  /**
   * Set modal height
   * @param {string} height - New height
   */
  setHeight(height) {
    this.options.height = height;
    
    // Update height if modal is open
    if (this.isOpen && this.modalElement && !this.options.fullscreen) {
      this.modalElement.style.height = height;
    }
  }
  
  /**
   * Add a button to the footer
   * @param {Object} options - Button options
   * @param {string} options.text - Button text
   * @param {string} options.variant - Button variant (primary, secondary, danger)
   * @param {Function} options.onClick - Click handler
   * @param {boolean} options.disabled - Whether button is disabled
   * @returns {HTMLElement} Button element
   */
  addFooterButton(options = {}) {
    const buttonOptions = {
      text: 'Button',
      variant: 'secondary',
      onClick: () => {},
      disabled: false,
      ...options
    };
    
    // Create button element
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = buttonOptions.text;
    button.disabled = buttonOptions.disabled;
    button.className = `modal-button modal-button-${buttonOptions.variant}`;
    
    // Apply base styles
    this.applyStyles(button, {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: buttonOptions.disabled ? 'not-allowed' : 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      marginLeft: '8px',
      opacity: buttonOptions.disabled ? '0.6' : '1'
    });
    
    // Apply variant-specific styles
    switch (buttonOptions.variant) {
      case 'primary':
        this.applyStyles(button, {
          backgroundColor: '#2196F3',
          color: 'white'
        });
        break;
      case 'danger':
        this.applyStyles(button, {
          backgroundColor: '#f44336',
          color: 'white'
        });
        break;
      case 'secondary':
      default:
        this.applyStyles(button, {
          backgroundColor: '#f5f5f5',
          color: '#333',
          border: '1px solid #ddd'
        });
    }
    
    // Add click handler
    button.addEventListener('click', buttonOptions.onClick);
    
    // Add to footer if exists
    if (this.footerElement) {
      this.footerElement.appendChild(button);
    }
    
    return button;
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
   * Update modal content
   * @param {HTMLElement|string} content - New content
   */
  updateContent(content) {
    if (!this.isOpen || !this.bodyElement) return;
    
    // Clear current content
    this.bodyElement.innerHTML = '';
    
    // Add new content
    if (content instanceof HTMLElement) {
      this.bodyElement.appendChild(content);
    } else if (typeof content === 'string') {
      this.bodyElement.innerHTML = content;
    }
    
    // Update focusable elements
    this.focusableElements = this.modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  }
  
  /**
   * Check if modal is open
   * @returns {boolean} True if open
   */
  isVisible() {
    return this.isOpen;
  }
  
  /**
   * Get the body element for direct manipulation
   * @returns {HTMLElement} Modal body element
   */
  getBodyElement() {
    return this.bodyElement;
  }
  
  /**
   * Destroy the modal
   */
  destroy() {
    // Close the modal if open
    if (this.isOpen) {
      this.close();
    }
    
    // Remove any lingering event listeners
    document.removeEventListener('keydown', this.handleEscKey);
    document.removeEventListener('keydown', this.handleTabKey);
    
    // Log destruction
    logChatEvent('ui', 'Modal destroyed', {
      title: this.options.title,
      modalId: this.modalId
    });
  }
}

export default ModalBase;