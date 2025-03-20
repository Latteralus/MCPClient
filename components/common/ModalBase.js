// chat/components/common/ModalBase.js
// Base modal component for reuse in other components

/**
 * Base Modal Component
 * Provides common modal functionality for extension
 */
class ModalBase {
    /**
     * Create a new ModalBase
     * @param {Object} options - Modal options 
     * @param {string} options.title - Modal title
     * @param {string} options.width - Modal width
     * @param {string} options.height - Modal height
     */
    constructor(options = {}) {
      this.options = {
        title: 'Modal',
        width: '400px',
        height: 'auto',
        ...options
      };
      
      this.overlayElement = null;
      this.modalElement = null;
      
      // Bind methods
      this.show = this.show.bind(this);
      this.close = this.close.bind(this);
      this.renderContent = this.renderContent.bind(this);
    }
    
    /**
     * Show the modal
     */
    show() {
      // Create overlay
      this.overlayElement = document.createElement('div');
      this.overlayElement.className = 'modal-overlay';
      this.applyStyles(this.overlayElement, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '1000'
      });
      
      // Create modal
      this.modalElement = document.createElement('div');
      this.modalElement.className = 'modal-container';
      this.applyStyles(this.modalElement, {
        backgroundColor: 'white',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        width: this.options.width,
        maxWidth: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      });
      
      // Modal header
      const header = document.createElement('div');
      this.applyStyles(header, {
        padding: '15px 20px',
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      });
      
      const title = document.createElement('h4');
      title.textContent = this.options.title;
      this.applyStyles(title, {
        margin: '0',
        fontSize: '18px',
        fontWeight: 'bold'
      });
      
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      this.applyStyles(closeButton, {
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        padding: '0',
        lineHeight: '1'
      });
      
      closeButton.addEventListener('click', () => {
        this.close();
      });
      
      header.appendChild(title);
      header.appendChild(closeButton);
      this.modalElement.appendChild(header);
      
      // Modal body
      const body = document.createElement('div');
      this.applyStyles(body, {
        padding: '20px'
      });
      
      // Add content
      const content = this.renderContent();
      if (content) {
        body.appendChild(content);
      }
      
      this.modalElement.appendChild(body);
      this.overlayElement.appendChild(this.modalElement);
      
      // Add to body
      document.body.appendChild(this.overlayElement);
      
      // Close on overlay click if enabled
      if (this.options.closeOnOverlayClick) {
        this.overlayElement.addEventListener('click', (e) => {
          if (e.target === this.overlayElement) {
            this.close();
          }
        });
      }
      
      // Handle escape key
      document.addEventListener('keydown', this.handleEscKey);
    }
    
    /**
     * Close the modal
     */
    close() {
      if (this.overlayElement && this.overlayElement.parentNode) {
        document.body.removeChild(this.overlayElement);
        this.overlayElement = null;
        this.modalElement = null;
        
        // Remove escape key handler
        document.removeEventListener('keydown', this.handleEscKey);
      }
    }
    
    /**
     * Handle escape key press
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleEscKey = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    }
    
    /**
     * Render modal content (to be overridden by subclasses)
     * @returns {HTMLElement} Modal content
     */
    renderContent() {
      // Default implementation returns empty content
      const content = document.createElement('div');
      content.textContent = 'This modal has no content.';
      return content;
    }
    
    /**
     * Apply CSS styles to an element
     * @param {HTMLElement} element - Element to style
     * @param {Object} styles - Styles to apply
     */
    applyStyles(element, styles) {
      Object.assign(element.style, styles);
    }
  }
  
  export default ModalBase;