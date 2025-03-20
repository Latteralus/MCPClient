// contexts/EncryptionContext.js
// Encryption context provider for HIPAA-compliant chat

import { logChatEvent } from '../utils/logger.js';
import { getConfig } from '../config/index.js';
import {
  initEncryption,
  encryptMessage,
  decryptMessage,
  checkCryptoSupport,
  isEncryptionActive,
  getEncryptionInfo,
  resetEncryptionKeys
} from '../services/encryption/encryption.js';
import keyManager from '../services/encryption/keyManager.js';

/**
 * Encryption Context
 * Provides encryption methods and state throughout the application
 */
class EncryptionContext {
  constructor() {
    this.listeners = [];
    this.encryptionState = {
      initialized: false,
      active: false,
      cryptoSupported: false,
      method: 'none',
      hipaaCompliant: false
    };
    
    // Initialize encryption
    this.initialize();
  }
  
  /**
   * Initialize encryption system
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      // Check if encryption is enabled
      const encryptionEnabled = getConfig('hipaa.enableEncryption', true);
      
      if (!encryptionEnabled) {
        this.encryptionState = {
          initialized: true,
          active: false,
          cryptoSupported: checkCryptoSupport(),
          method: 'none',
          hipaaCompliant: false
        };
        
        this.notifyListeners();
        
        logChatEvent('security', 'Encryption disabled in configuration');
        return false;
      }
      
      // Initialize encryption
      const result = await initEncryption();
      
      // Update state
      const encryptionInfo = getEncryptionInfo();
      this.encryptionState = {
        initialized: true,
        active: isEncryptionActive(),
        cryptoSupported: checkCryptoSupport(),
        method: encryptionInfo.method,
        hipaaCompliant: encryptionInfo.hipaaCompliant
      };
      
      // Notify listeners
      this.notifyListeners();
      
      // Log initialization
      logChatEvent('security', 'Encryption context initialized', {
        active: this.encryptionState.active,
        method: this.encryptionState.method,
        hipaaCompliant: this.encryptionState.hipaaCompliant
      });
      
      // Schedule key rotation if enabled
      if (result && this.encryptionState.active) {
        this.setupKeyRotation();
      }
      
      return result;
    } catch (error) {
      console.error('[EncryptionContext] Initialization error:', error);
      
      // Update state
      this.encryptionState = {
        initialized: false,
        active: false,
        cryptoSupported: checkCryptoSupport(),
        method: 'none',
        hipaaCompliant: false,
        error: error.message
      };
      
      // Notify listeners
      this.notifyListeners();
      
      logChatEvent('security', 'Encryption context initialization error', {
        error: error.message
      });
      
      return false;
    }
  }
  
  /**
   * Setup key rotation schedule
   */
  setupKeyRotation() {
    // Check if key rotation is enabled
    const keyRotationEnabled = getConfig('security.enableKeyRotation', true);
    
    if (!keyRotationEnabled) {
      return;
    }
    
    // Get key rotation interval (default: 24 hours)
    const keyRotationInterval = getConfig('security.keyRotationInterval', 24 * 60 * 60 * 1000);
    
    // Schedule key rotation
    keyManager.scheduleKeyRotation(keyRotationInterval);
    
    logChatEvent('security', 'Encryption key rotation scheduled', {
      interval: keyRotationInterval / (60 * 60 * 1000) + ' hours'
    });
  }
  
  /**
   * Notify all listeners of state changes
   */
  notifyListeners() {
    const state = this.getEncryptionState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[EncryptionContext] Error in encryption context listener:', error);
      }
    });
  }
  
  /**
   * Encrypt a message
   * @param {Object} message - Message to encrypt
   * @returns {Promise<Object>} Encrypted message
   */
  async encrypt(message) {
    try {
      // Check if encryption is active
      if (!this.encryptionState.active) {
        return {
          ...message,
          encrypted: false
        };
      }
      
      // Encrypt message
      return await encryptMessage(message);
    } catch (error) {
      console.error('[EncryptionContext] Encryption error:', error);
      
      logChatEvent('security', 'Message encryption error', {
        error: error.message
      });
      
      // Return unencrypted message on error
      return {
        ...message,
        encrypted: false
      };
    }
  }
  
  /**
   * Decrypt a message
   * @param {Object} encryptedMessage - Message to decrypt
   * @returns {Promise<Object>} Decrypted message
   */
  async decrypt(encryptedMessage) {
    try {
      // Check if message is encrypted
      if (!encryptedMessage || !encryptedMessage.encrypted) {
        return encryptedMessage;
      }
      
      // Decrypt message
      return await decryptMessage(encryptedMessage);
    } catch (error) {
      console.error('[EncryptionContext] Decryption error:', error);
      
      logChatEvent('security', 'Message decryption error', {
        error: error.message
      });
      
      // Return error message
      return {
        id: encryptedMessage.id || 'unknown',
        sender: encryptedMessage.sender || 'unknown',
        timestamp: encryptedMessage.timestamp || new Date().toISOString(),
        channel: encryptedMessage.channel,
        recipient: encryptedMessage.recipient,
        text: '[Encrypted message - unable to decrypt]',
        type: encryptedMessage.type || 'chat',
        decryptionFailed: true
      };
    }
  }
  
  /**
   * Decrypt multiple messages
   * @param {Array} encryptedMessages - Messages to decrypt
   * @returns {Promise<Array>} Decrypted messages
   */
  async decryptMany(encryptedMessages) {
    if (!encryptedMessages || !Array.isArray(encryptedMessages)) {
      return [];
    }
    
    const decryptedMessages = [];
    
    for (const message of encryptedMessages) {
      try {
        const decrypted = await this.decrypt(message);
        decryptedMessages.push(decrypted);
      } catch (error) {
        console.error('[EncryptionContext] Batch decryption error:', error);
        
        // Add error message
        decryptedMessages.push({
          id: message.id || 'unknown',
          sender: message.sender || 'unknown',
          timestamp: message.timestamp || new Date().toISOString(),
          channel: message.channel,
          recipient: message.recipient,
          text: '[Encrypted message - unable to decrypt]',
          type: message.type || 'chat',
          decryptionFailed: true
        });
      }
    }
    
    return decryptedMessages;
  }
  
  /**
   * Reset encryption keys
   * @returns {Promise<boolean>} Success status
   */
  async resetKeys() {
    try {
      // Reset encryption keys
      const result = await resetEncryptionKeys();
      
      // Update state if successful
      if (result) {
        const encryptionInfo = getEncryptionInfo();
        this.encryptionState = {
          ...this.encryptionState,
          active: isEncryptionActive(),
          method: encryptionInfo.method
        };
        
        // Notify listeners
        this.notifyListeners();
        
        logChatEvent('security', 'Encryption keys reset');
      }
      
      return result;
    } catch (error) {
      console.error('[EncryptionContext] Reset keys error:', error);
      
      logChatEvent('security', 'Encryption key reset error', {
        error: error.message
      });
      
      return false;
    }
  }
  
  /**
   * Force re-initialization of encryption
   * @returns {Promise<boolean>} Success status
   */
  async reinitialize() {
    try {
      // Reset keys
      await keyManager.clearKeys();
      
      // Re-initialize
      return await this.initialize();
    } catch (error) {
      console.error('[EncryptionContext] Reinitialization error:', error);
      
      logChatEvent('security', 'Encryption reinitialization error', {
        error: error.message
      });
      
      return false;
    }
  }
  
  /**
   * Get current encryption state
   * @returns {Object} Current encryption state
   */
  getEncryptionState() {
    // Update active status in case it changed
    this.encryptionState.active = isEncryptionActive();
    
    return { ...this.encryptionState };
  }
  
  /**
   * Check if the browser supports required crypto capabilities
   * @returns {boolean} True if supported
   */
  isCryptoSupported() {
    return checkCryptoSupport();
  }
  
  /**
   * Get detailed encryption information
   * @returns {Object} Encryption information
   */
  getDetailedInfo() {
    return getEncryptionInfo();
  }
  
  /**
   * Subscribe to encryption state changes
   * @param {Function} listener - Callback for state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    if (typeof listener !== 'function') {
      console.error('[EncryptionContext] Encryption listener must be a function');
      return () => {};
    }
    
    this.listeners.push(listener);
    
    // Immediately notify with current state
    listener(this.getEncryptionState());
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Detect potential PHI in text
   * This is a simple heuristic and should not be relied upon for compliance
   * @param {string} text - Text to check
   * @returns {boolean} True if text may contain PHI
   */
  mayContainPHI(text) {
    if (!text) return false;
    
    // Simple heuristics to detect common PHI patterns
    const phiPatterns = [
      // SSN
      /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/,
      // Phone numbers
      /\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/,
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
      // Dates that could be DOB
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
      /\b\d{1,2}-\d{1,2}-\d{2,4}\b/,
      // Medical record numbers
      /\bMR#?\s*\d+\b/i,
      /\bmedical\s*record\s*#?\s*\d+\b/i,
      // Email addresses
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
      // Common PHI keywords
      /\b(hipaa|phi|ssn|social security|birth date|dob|address|diagnosis|patient|doctor)\b/i
    ];
    
    return phiPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Destroy encryption context
   */
  destroy() {
    // Clear listeners
    this.listeners = [];
    
    logChatEvent('security', 'Encryption context destroyed');
  }
}

// Create singleton instance
const encryptionContext = new EncryptionContext();
export default encryptionContext;