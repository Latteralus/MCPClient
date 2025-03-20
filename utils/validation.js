// chat/utils/validation.js
// Input validation utilities for HIPAA-compliant chat

/**
 * Check if text contains potential PHI (Protected Health Information)
 * @param {string} text - Text to check
 * @returns {boolean} True if text may contain PHI
 */
export function containsPotentialPHI(text) {
    if (!text || text.trim() === '') {
      return false;
    }
    
    // Common PHI patterns to check
    const phiPatterns = [
      // Social Security Number patterns
      /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/,
      
      // Various date formats (potentially DOB)
      /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/,
      
      // Medical record numbers (various formats)
      /\bMR[#\s]?\d{5,10}\b/i,
      /\bmedical[\s-]record[\s-]number\b/i,
      
      // Phone numbers
      /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
      
      // Email addresses
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
      
      // Street addresses (simplified pattern)
      /\b\d+\s+[A-Za-z\s]+\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|court|ct|lane|ln|way)\b/i,
      
      // Patient ID or Chart Number references
      /\b(?:patient|chart)[\s-](?:id|number|#)[\s:]*(?:\d{3,10}|[A-Z]{1,3}\d{3,7})\b/i,
      
      // Insurance identifiers
      /\b(?:insurance|policy)[\s-](?:id|number|#)[\s:]*(?:\d{3,12}|[A-Z]{1,3}\d{3,10})\b/i,
      
      // Common medical terms that may indicate PHI discussion
      /\bdiagnosis\b|\bdiagnosed\b|\bsymptoms\b|\bprescription\b|\bmedication\b|\bdosage\b/i,
      
      // Context phrases that might indicate sharing of PHI
      /\bpatient information\b|\bhealth information\b|\bmedical history\b|\btest results\b/i,
      
      // Common medical record sections
      /\ballergies\b|\bvital signs\b|\blab results\b|\bmedical conditions\b|\bimmunizations\b/i
    ];
    
    // Check if any PHI pattern matches
    for (const pattern of phiPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }
    
    // Check for sensitive keywords that might indicate PHI
    const sensitiveKeywords = [
      'confidential', 'private', 'sensitive',
      'hipaa', 'phi', 'pii', 'personal information',
      'health record', 'chart', 'physician', 'doctor', 'patient', 'treatment',
      'dob', 'birth date', 'date of birth', 'age',
      'ssn', 'social security', 'medicare', 'medicaid',
      'insurance', 'claim', 'authorization', 'consent'
    ];
    
    const lowercaseText = text.toLowerCase();
    for (const keyword of sensitiveKeywords) {
      if (lowercaseText.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Validate a username
   * @param {string} username - Username to validate
   * @returns {Object} Validation result with success and optional error
   */
  export function validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { success: false, error: 'Username is required' };
    }
    
    // Remove whitespace
    const trimmedUsername = username.trim();
    
    if (trimmedUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long' };
    }
    
    if (trimmedUsername.length > 50) {
      return { success: false, error: 'Username cannot exceed 50 characters' };
    }
    
    // Check for valid characters (alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmedUsername)) {
      return { 
        success: false, 
        error: 'Username can only contain letters, numbers, underscores, and hyphens' 
      };
    }
    
    return { success: true, username: trimmedUsername };
  }
  
  /**
   * Validate a password
   * @param {string} password - Password to validate
   * @returns {Object} Validation result with success and optional error
   */
  export function validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return { success: false, error: 'Password is required' };
    }
    
    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long' };
    }
    
    // Check for strong password (at least one uppercase, one lowercase, one number)
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return { 
        success: false, 
        error: 'Password must include at least one uppercase letter, one lowercase letter, and one number' 
      };
    }
    
    return { success: true };
  }
  
  /**
   * Validate a channel name
   * @param {string} channelName - Channel name to validate
   * @returns {Object} Validation result with success and optional error
   */
  export function validateChannelName(channelName) {
    if (!channelName || typeof channelName !== 'string') {
      return { success: false, error: 'Channel name is required' };
    }
    
    // Remove whitespace
    const trimmedName = channelName.trim();
    
    if (trimmedName.length < 2) {
      return { success: false, error: 'Channel name must be at least 2 characters long' };
    }
    
    if (trimmedName.length > 50) {
      return { success: false, error: 'Channel name cannot exceed 50 characters' };
    }
    
    // Check for invalid characters
    if (/[^\w\s\-]/.test(trimmedName)) {
      return { 
        success: false, 
        error: 'Channel name can only contain letters, numbers, spaces, underscores, and hyphens' 
      };
    }
    
    return { success: true, channelName: trimmedName };
  }
  
  /**
   * Validate channel description
   * @param {string} description - Channel description to validate
   * @returns {Object} Validation result with success and optional error
   */
  export function validateChannelDescription(description) {
    if (!description) {
      return { success: true, description: '' }; // Description is optional
    }
    
    if (typeof description !== 'string') {
      return { success: false, error: 'Description must be a string' };
    }
    
    // Remove excessive whitespace
    const trimmedDescription = description.trim();
    
    if (trimmedDescription.length > 500) {
      return { success: false, error: 'Description cannot exceed 500 characters' };
    }
    
    return { success: true, description: trimmedDescription };
  }
  
  /**
   * Validate a message before sending
   * @param {string} message - Message text to validate
   * @returns {Object} Validation result with success and optional error
   */
  export function validateMessage(message) {
    if (!message || typeof message !== 'string') {
      return { success: false, error: 'Message text is required' };
    }
    
    // Remove whitespace
    const trimmedMessage = message.trim();
    
    if (trimmedMessage.length === 0) {
      return { success: false, error: 'Message cannot be empty' };
    }
    
    if (trimmedMessage.length > 2000) {
      return { success: false, error: 'Message cannot exceed 2000 characters' };
    }
    
    // Check for potential PHI and add warning
    const containsPHI = containsPotentialPHI(trimmedMessage);
    
    return { 
      success: true, 
      message: trimmedMessage,
      containsPHI
    };
  }
  
  /**
   * Escape HTML to prevent XSS
   * @param {string} html - String that might contain HTML
   * @returns {string} Escaped HTML
   */
  export function escapeHtml(html) {
    if (!html) return '';
    
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  /**
   * Validate an email address
   * @param {string} email - Email to validate
   * @returns {Object} Validation result with success and optional error
   */
  export function validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { success: false, error: 'Email is required' };
    }
    
    // Remove whitespace
    const trimmedEmail = email.trim();
    
    // Basic email validation
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { success: false, error: 'Invalid email address format' };
    }
    
    return { success: true, email: trimmedEmail };
  }
  
  /**
   * Validate a URL
   * @param {string} url - URL to validate
   * @returns {Object} Validation result with success and optional error
   */
  export function validateUrl(url) {
    if (!url || typeof url !== 'string') {
      return { success: false, error: 'URL is required' };
    }
    
    // Remove whitespace
    const trimmedUrl = url.trim();
    
    try {
      // Try to create a URL object to validate
      new URL(trimmedUrl);
      return { success: true, url: trimmedUrl };
    } catch (error) {
      return { success: false, error: 'Invalid URL format' };
    }
  }
  
  /**
   * Validate WebSocket URL
   * @param {string} url - WebSocket URL to validate
   * @returns {Object} Validation result with success and optional error
   */
  export function validateWebSocketUrl(url) {
    if (!url || typeof url !== 'string') {
      return { success: false, error: 'WebSocket URL is required' };
    }
    
    // Remove whitespace
    const trimmedUrl = url.trim();
    
    // Check for WebSocket protocol
    if (!trimmedUrl.startsWith('ws://') && !trimmedUrl.startsWith('wss://')) {
      return { success: false, error: 'WebSocket URL must start with ws:// or wss://' };
    }
    
    try {
      // Try to create a URL object to validate
      new URL(trimmedUrl);
      return { success: true, url: trimmedUrl };
    } catch (error) {
      return { success: false, error: 'Invalid WebSocket URL format' };
    }
  }
  
  /**
   * Validate a date string
   * @param {string} dateString - Date string to validate
   * @returns {Object} Validation result with success and optional error
   */
  export function validateDate(dateString) {
    if (!dateString || typeof dateString !== 'string') {
      return { success: false, error: 'Date is required' };
    }
    
    // Remove whitespace
    const trimmedDate = dateString.trim();
    
    // Try to parse the date
    const date = new Date(trimmedDate);
    
    if (isNaN(date.getTime())) {
      return { success: false, error: 'Invalid date format' };
    }
    
    return { success: true, date };
  }
  
  /**
   * Validate a phone number
   * @param {string} phoneNumber - Phone number to validate
   * @returns {Object} Validation result with success and optional error
   */
  export function validatePhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return { success: false, error: 'Phone number is required' };
    }
    
    // Remove whitespace, dashes, parentheses
    const cleanedNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Check if it's a valid US phone number (simple check)
    if (!/^\d{10}$/.test(cleanedNumber)) {
      return { success: false, error: 'Phone number must be 10 digits' };
    }
    
    return { success: true, phoneNumber: cleanedNumber };
  }
  
  /**
   * Format a phone number for display
   * @param {string} phoneNumber - Raw phone number
   * @returns {string} Formatted phone number
   */
  export function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    // Remove non-digits
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    
    // Return original if not 10 digits
    return phoneNumber;
  }
  
  /**
   * Generate a random ID
   * @param {number} length - Length of ID to generate
   * @returns {string} Random ID
   */
  export function generateId(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    // Use crypto API if available for better randomness
    if (window.crypto && window.crypto.getRandomValues) {
      const values = new Uint32Array(length);
      window.crypto.getRandomValues(values);
      
      for (let i = 0; i < length; i++) {
        result += chars.charAt(values[i] % chars.length);
      }
    } else {
      // Fallback to Math.random
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    
    return result;
  }