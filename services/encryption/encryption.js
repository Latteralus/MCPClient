// services/encryption/encryption.js
// Encryption service for HIPAA-compliant chat

import { logChatEvent } from '../../utils/logger.js';
import { getConfig } from '../../config/index.js';
import keyManager from './keyManager.js';

// Flag to check if crypto API is available
const hasCryptoAPI = typeof window !== 'undefined' && 
                     window.crypto && 
                     window.crypto.subtle;

/**
 * Check if the browser supports required crypto capabilities
 * @returns {boolean} True if the browser supports required crypto functions
 */
export function checkCryptoSupport() {
  return hasCryptoAPI;
}

/**
 * Check if encryption is currently active
 * @returns {boolean} True if encryption is active
 */
export function isEncryptionActive() {
  return keyManager.hasKeys();
}

/**
 * Initialize encryption service
 * @returns {Promise<boolean>} Success status
 */
export async function initEncryption() {
  try {
    // Check if encryption is enabled in config
    const encryptionEnabled = getConfig('hipaa.enableEncryption', true);
    
    if (!encryptionEnabled) {
      console.log('[Encryption Service] Encryption disabled in configuration');
      return true;
    }
    
    // Check for crypto API support
    if (!hasCryptoAPI) {
      console.warn('[Encryption Service] Web Crypto API not available - using fallback encryption');
      logChatEvent('security', 'Crypto API not available, using fallback encryption (less secure)');
    } else {
      console.log('[Encryption Service] Using Web Crypto API for secure encryption');
    }
    
    // Initialize key manager
    const result = await keyManager.initKeys();
    
    if (result) {
      logChatEvent('security', 'Encryption initialized successfully', {
        method: hasCryptoAPI ? 'AES-GCM' : 'XOR-Fallback'
      });
      return true;
    } else {
      logChatEvent('security', 'Encryption initialization failed');
      return false;
    }
  } catch (error) {
    console.error('[Encryption Service] Initialization error:', error);
    logChatEvent('security', 'Encryption initialization error', { error: error.message });
    return false;
  }
}

/**
 * Convert string to ArrayBuffer
 * @param {string} str - String to convert
 * @returns {ArrayBuffer} Resulting ArrayBuffer
 */
function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

/**
 * Convert ArrayBuffer to string
 * @param {ArrayBuffer} buf - ArrayBuffer to convert
 * @returns {string} Resulting string
 */
function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

/**
 * Encrypt a message object using Web Crypto API
 * @param {Object} message - The message object to encrypt
 * @returns {Promise<Object>} Encrypted message object
 */
async function encryptWithCryptoAPI(message) {
  try {
    // Get encryption key and IV
    const { encryptionKey, encryptionIV } = await keyManager.getEncryptionKeys();
    
    if (!encryptionKey || !encryptionIV) {
      throw new Error('Encryption keys not available');
    }
    
    // Convert message to JSON string
    const messageJson = JSON.stringify(message);
    
    // Convert string to ArrayBuffer for encryption
    const encodedMessage = str2ab(messageJson);
    
    // Encrypt the message
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: encryptionIV,
        tagLength: 128 // Authentication tag length
      },
      encryptionKey,
      encodedMessage
    );
    
    // Convert encrypted ArrayBuffer to Base64 string for transmission
    const encryptedBase64 = btoa(ab2str(encryptedData));
    
    // Create IV string for transmission
    const ivBase64 = btoa(ab2str(encryptionIV.buffer));
    
    // Create encrypted message object
    return {
      id: message.id,
      sender: message.sender,
      recipient: message.recipient,
      channel: message.channel,
      encrypted: true,
      encryptionMethod: 'AES-GCM',
      encryptedData: encryptedBase64,
      iv: ivBase64,
      timestamp: message.timestamp,
      type: message.type || 'chat'
    };
  } catch (error) {
    console.error('[Encryption Service] Error encrypting with Web Crypto API:', error);
    // Fall back to legacy encryption
    return encryptWithLegacyMethod(message);
  }
}

/**
 * Decrypt a message object using Web Crypto API
 * @param {Object} encryptedMessage - The encrypted message object
 * @returns {Promise<Object>} Decrypted message object
 */
async function decryptWithCryptoAPI(encryptedMessage) {
  try {
    // Get encryption key
    const { encryptionKey } = await keyManager.getEncryptionKeys();
    
    if (!encryptionKey) {
      throw new Error('Encryption key not available');
    }
    
    // Convert Base64 encrypted data back to ArrayBuffer
    const encryptedData = str2ab(atob(encryptedMessage.encryptedData));
    
    // Get the IV
    const iv = str2ab(atob(encryptedMessage.iv));
    const ivArray = new Uint8Array(iv);
    
    // Decrypt the data
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivArray,
        tagLength: 128
      },
      encryptionKey,
      encryptedData
    );
    
    // Convert decrypted ArrayBuffer to string
    const decryptedJson = ab2str(decryptedData);
    
    // Parse the decrypted JSON
    return JSON.parse(decryptedJson);
  } catch (error) {
    console.error('[Encryption Service] Error decrypting with Web Crypto API:', error);
    throw error;
  }
}

/**
 * Encrypt a message using legacy methods (less secure fallback)
 * @param {Object} message - The message object to encrypt
 * @returns {Object} Encrypted message object
 */
function encryptWithLegacyMethod(message) {
  try {
    // Get encryption key
    const { legacyKey } = keyManager.getLegacyKeys();
    
    if (!legacyKey) {
      throw new Error('Legacy encryption key not available');
    }
    
    // Convert message to JSON string
    const messageJson = JSON.stringify(message);
    
    // Apply simple XOR encryption with the key
    const encrypted = xorEncrypt(messageJson, legacyKey);
    
    // Create encrypted message object
    return {
      id: message.id,
      sender: message.sender,
      recipient: message.recipient,
      channel: message.channel,
      encrypted: true,
      encryptionMethod: 'XOR',
      encryptedData: encrypted,
      timestamp: message.timestamp,
      type: message.type || 'chat'
    };
  } catch (error) {
    console.error('[Encryption Service] Error in legacy encryption:', error);
    // Return original message on error
    return {
      ...message,
      encrypted: false
    };
  }
}

/**
 * Decrypt a message using legacy methods
 * @param {Object} encryptedMessage - The encrypted message object
 * @returns {Object} Decrypted message object
 */
function decryptWithLegacyMethod(encryptedMessage) {
  try {
    // Get legacy key
    const { legacyKey } = keyManager.getLegacyKeys();
    
    if (!legacyKey) {
      throw new Error('Legacy decryption key not available');
    }
    
    // Apply XOR decryption (same operation as encryption)
    const decryptedJson = xorEncrypt(encryptedMessage.encryptedData, legacyKey);
    
    // Parse the decrypted JSON
    return JSON.parse(decryptedJson);
  } catch (error) {
    console.error('[Encryption Service] Error in legacy decryption:', error);
    throw error;
  }
}

/**
 * Simple XOR encryption/decryption for legacy fallback
 * Note: This is a simplified implementation for demonstration
 * In a production HIPAA environment, use proper encryption libraries
 * 
 * @param {string} text - The text to encrypt/decrypt
 * @param {string} key - The encryption key
 * @returns {string} The encrypted/decrypted text
 */
function xorEncrypt(text, key) {
  try {
    let result = '';
    
    for (let i = 0; i < text.length; i++) {
      // XOR each character with the corresponding character in the key
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    
    // Convert to Base64 for safe transmission
    return btoa(result);
  } catch (error) {
    console.error('[Encryption Service] XOR encryption error:', error);
    throw error;
  }
}

/**
 * XOR decrypt Base64 encoded string
 * @param {string} encryptedBase64 - Base64 encoded encrypted string
 * @param {string} key - Encryption key
 * @returns {string} Decrypted string
 */
function xorDecrypt(encryptedBase64, key) {
  try {
    // Decode Base64
    const encryptedText = atob(encryptedBase64);
    
    // XOR is symmetric, so we use the same function
    return xorEncrypt(encryptedText, key);
  } catch (error) {
    console.error('[Encryption Service] XOR decryption error:', error);
    throw error;
  }
}

/**
 * Encrypt a message object
 * @param {Object} message - The message object to encrypt
 * @returns {Promise<Object>} Encrypted message object
 */
export async function encryptMessage(message) {
  try {
    if (!message) return null;
    
    // Skip encryption if disabled in config
    if (!getConfig('hipaa.enableEncryption', true)) {
      return {
        ...message,
        encrypted: false
      };
    }
    
    // Make sure we have encryption keys
    if (!keyManager.hasKeys()) {
      await keyManager.initKeys();
    }
    
    // Use appropriate encryption method
    if (hasCryptoAPI) {
      return await encryptWithCryptoAPI(message);
    } else {
      return encryptWithLegacyMethod(message);
    }
  } catch (error) {
    console.error('[Encryption Service] Error encrypting message:', error);
    logChatEvent('security', 'Encryption error', { error: error.message });
    
    // Return original message on error, but mark as unencrypted
    return {
      ...message,
      encrypted: false
    };
  }
}

/**
 * Decrypt a message object
 * @param {Object} encryptedMessage - The encrypted message object
 * @returns {Promise<Object>} Decrypted message object
 */
export async function decryptMessage(encryptedMessage) {
  try {
    if (!encryptedMessage || !encryptedMessage.encrypted) {
      return encryptedMessage;
    }
    
    // Make sure we have encryption keys
    if (!keyManager.hasKeys()) {
      await keyManager.initKeys();
    }
    
    // Use appropriate decryption method based on encryption method
    if (encryptedMessage.encryptionMethod === 'AES-GCM' && hasCryptoAPI) {
      return await decryptWithCryptoAPI(encryptedMessage);
    } else if (encryptedMessage.encryptionMethod === 'XOR') {
      return decryptWithLegacyMethod(encryptedMessage);
    } else {
      throw new Error(`Unsupported encryption method: ${encryptedMessage.encryptionMethod}`);
    }
  } catch (error) {
    console.error('[Encryption Service] Error decrypting message:', error);
    logChatEvent('security', 'Decryption error', { error: error.message });
    
    // Return a placeholder message for UI display
    return {
      id: encryptedMessage.id || generateMessageId(),
      sender: encryptedMessage.sender || 'Unknown',
      text: '[Encrypted message - unable to decrypt]',
      timestamp: encryptedMessage.timestamp || new Date().toISOString(),
      type: encryptedMessage.type || 'chat',
      channel: encryptedMessage.channel || null,
      recipient: encryptedMessage.recipient || null,
      decryptionFailed: true
    };
  }
}

/**
 * Generate a unique message ID
 * @returns {string} A unique message ID
 */
function generateMessageId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Export encryption information for display (safe to show to user)
 * @returns {Object} Encryption status information
 */
export function getEncryptionInfo() {
  return {
    active: keyManager.hasKeys(),
    method: hasCryptoAPI ? 'AES-GCM (256-bit)' : 'XOR (Legacy)',
    secure: hasCryptoAPI,
    hipaaCompliant: hasCryptoAPI,
    browserSupport: hasCryptoAPI ? 'Full' : 'Limited'
  };
}

/**
 * Reset encryption keys (for testing or key rotation)
 * @returns {Promise<boolean>} Success status
 */
export async function resetEncryptionKeys() {
  try {
    keyManager.clearKeys();
    logChatEvent('security', 'Encryption keys reset');
    return await keyManager.initKeys();
  } catch (error) {
    console.error('[Encryption Service] Reset encryption keys error:', error);
    return false;
  }
}

export default {
  initEncryption,
  encryptMessage,
  decryptMessage,
  checkCryptoSupport,
  isEncryptionActive,
  getEncryptionInfo,
  resetEncryptionKeys
};