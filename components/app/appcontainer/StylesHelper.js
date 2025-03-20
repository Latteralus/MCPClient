// chat/components/app/appcontainer/StylesHelper.js
// Helper functions for applying styles to elements

/**
 * Apply CSS styles to an element
 * @param {HTMLElement} element - Element to style
 * @param {Object} styles - Styles to apply
 */
export function applyStyles(element, styles) {
    Object.assign(element.style, styles);
  }
  
  /**
   * Common color palette for the chat UI
   */
  export const COLORS = {
    primary: '#343a40',        // Dark gray/blue - main header color
    secondary: '#3a444f',      // Slightly lighter shade for hover effects
    accent: '#2196F3',         // Blue accent color
    text: '#ffffff',           // White text
    textDark: '#333333',       // Dark text color
    textMuted: '#666666',      // Muted text color
    success: '#28a745',        // Green for success messages
    warning: '#ffc107',        // Yellow for warnings
    danger: '#dc3545',         // Red for errors
    light: '#f8f9fa',          // Light background
    border: '#e0e0e0',         // Border color
    selectedItem: '#e3f2fd'    // Selected item background
  };
  
  /**
   * Common spacing values for consistent UI
   */
  export const SPACING = {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  };
  
  /**
   * Common font sizes
   */
  export const FONT_SIZES = {
    xs: '10px',
    sm: '12px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    xxl: '24px'
  };
  
  /**
   * Common button styles
   * @param {string} variant - Button variant ('primary', 'secondary', 'success', 'danger')
   * @returns {Object} Style object for the button
   */
  export function getButtonStyles(variant = 'primary') {
    const baseStyles = {
      padding: `${SPACING.sm} ${SPACING.md}`,
      border: 'none',
      borderRadius: '4px',
      fontSize: FONT_SIZES.md,
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
    
    const variantStyles = {
      primary: {
        backgroundColor: COLORS.primary,
        color: COLORS.text
      },
      secondary: {
        backgroundColor: COLORS.light,
        color: COLORS.textDark,
        border: `1px solid ${COLORS.border}`
      },
      success: {
        backgroundColor: COLORS.success,
        color: COLORS.text
      },
      danger: {
        backgroundColor: COLORS.danger,
        color: COLORS.text
      },
      accent: {
        backgroundColor: COLORS.accent,
        color: COLORS.text
      }
    };
    
    return { ...baseStyles, ...variantStyles[variant] };
  }
  
  /**
   * Apply button hover effect
   * @param {HTMLElement} button - Button element
   * @param {string} variant - Button variant
   */
  export function applyButtonHoverEffect(button, variant = 'primary') {
    const hoverColors = {
      primary: '#292e33',      // Darker shade of primary
      secondary: '#e2e6ea',    // Lighter gray
      success: '#218838',      // Darker green
      danger: '#c82333',       // Darker red
      accent: '#0d8af0'        // Darker blue
    };
    
    const normalColor = getButtonStyles(variant).backgroundColor;
    const hoverColor = hoverColors[variant];
    
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = hoverColor;
    });
    
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = normalColor;
    });
  }
  
  /**
   * Create an icon button
   * @param {string} icon - Icon text or HTML
   * @param {string} title - Button title
   * @param {Function} onClick - Click handler
   * @returns {HTMLElement} Button element
   */
  export function createIconButton(icon, title, onClick) {
    const button = document.createElement('button');
    button.innerHTML = icon;
    button.title = title;
    
    applyStyles(button, {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontSize: FONT_SIZES.lg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
  
    // Add hover effect
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = '#f5f5f5';
    });
  
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = 'transparent';
    });
    
    if (onClick && typeof onClick === 'function') {
      button.addEventListener('click', onClick);
    }
  
    return button;
  }
  
  /**
   * Generate a color hue from a string (for user avatars, etc.)
   * @param {string} str - Input string
   * @returns {number} Hue value (0-360)
   */
  export function generateColorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash % 360;
  }
  
  export default {
    applyStyles,
    COLORS,
    SPACING,
    FONT_SIZES,
    getButtonStyles,
    applyButtonHoverEffect,
    createIconButton,
    generateColorFromString
  };