// chat/utils/encryption.js
// Encryption/decryption utilities for HIPAA-compliant chat

import { logChatEvent } from './logger.js';

// Store encryption keys for current session
let encryptionKey = null;
let encryptionIV = null;

// Flag to check if crypto API is available
const hasCryptoAPI = typeof window !== 'undefined' && 
                     window.crypto && 
                     window.crypto.subtle;

/**
 * Generate new encryption keys for the current session
 * @returns {Promise<boolean>} Success status
 */
export async function generateSessionKeys() {
  try {
    if (hasCryptoAPI) {
      // Modern browsers: Use the Web Crypto API for strong encryption
      const key = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );
      
      // Store the key for later use
      encryptionKey = key;
      
      // Generate a random IV (Initialization Vector)
      encryptionIV = window.crypto.getRandomValues(new Uint8Array(12));
      
      console.log('[CRM Extension] Generated secure encryption keys using Web Crypto API');
    } else {
      // Fallback for older browsers: Generate random strings
      // Note: This is less secure and would not be HIPAA-compliant in production
      encryptionKey = generateRandomString(32); // 256-bit key equivalent
      encryptionIV = generateRandomString(16); // 128-bit IV equivalent
      
      console.warn('[CRM Extension] Using fallback encryption methods - less secure');
      logChatEvent('security', 'Using fallback encryption (not recommended for PHI)');
    }
    
    logChatEvent('security', 'Generated new encryption keys');
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error generating encryption keys:', error);
    logChatEvent('security', 'Failed to generate encryption keys', { error: error.message });
    return false;
  }
}

/**
 * Generate a random string of specified length
 * @param {number} length - Length of string to generate
 * @returns {string} Random string
 */
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Use crypto.getRandomValues if available for better randomness
  if (window.crypto && window.crypto.getRandomValues) {
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(values[i] % characters.length);
    }
  } else {
    // Fallback to Math.random()
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  }
  
  return result;
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
      type: message.type
    };
  } catch (error) {
    console.error('[CRM Extension] Error encrypting with Web Crypto API:', error);
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
    console.error('[CRM Extension] Error decrypting with Web Crypto API:', error);
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
    // Convert message to JSON string
    const messageJson = JSON.stringify(message);
    
    // Apply simple XOR encryption with the key
    const encrypted = xorEncrypt(messageJson, encryptionKey);
    
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
      type: message.type
    };
  } catch (error) {
    console.error('[CRM Extension] Error in legacy encryption:', error);
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
    // Apply XOR decryption (same operation as encryption)
    const decryptedJson = xorEncrypt(encryptedMessage.encryptedData, encryptionKey);
    
    // Parse the decrypted JSON
    return JSON.parse(decryptedJson);
  } catch (error) {
    console.error('[CRM Extension] Error in legacy decryption:', error);
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
  let result = '';
  
  for (let i = 0; i < text.length; i++) {
    // XOR each character with the corresponding character in the key
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  
  // Convert to Base64 for safe transmission
  return btoa(result);
}

/**
 * Encrypt a message object
 * @param {Object} message - The message object to encrypt
 * @returns {Promise<Object>} Encrypted message object
 */
export async function encryptMessage(message) {
  try {
    if (!message) return null;
    
    // Make sure we have encryption keys
    if (!encryptionKey || !encryptionIV) {
      await generateSessionKeys();
    }
    
    // Use appropriate encryption method
    if (hasCryptoAPI) {
      return await encryptWithCryptoAPI(message);
    } else {
      return encryptWithLegacyMethod(message);
    }
  } catch (error) {
    console.error('[CRM Extension] Error encrypting message:', error);
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
    if (!encryptionKey || !encryptionIV) {
      throw new Error('Encryption keys not available');
    }
    
    // Use appropriate decryption method based on encryption method
    if (encryptedMessage.encryptionMethod === 'AES-GCM' && hasCryptoAPI) {
      return await decryptWithCryptoAPI(encryptedMessage);
    } else {
      return decryptWithLegacyMethod(encryptedMessage);
    }
  } catch (error) {
    console.error('[CRM Extension] Error decrypting message:', error);
    logChatEvent('security', 'Decryption error', { error: error.message });
    
    // Return a placeholder message for UI display
    return {
      id: encryptedMessage.id || generateMessageId(),
      sender: encryptedMessage.sender || 'Unknown',
      text: '[Encrypted message - unable to decrypt]',
      timestamp: encryptedMessage.timestamp || new Date().toISOString(),
      type: encryptedMessage.type || 'chat',
      channel: encryptedMessage.channel || 'general'
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
 * Check if the browser has the required crypto capabilities
 * @returns {boolean} True if the browser supports required crypto functions
 */
export function checkCryptoSupport() {
  return hasCryptoAPI;
}

/**
 * Check if messages are currently being encrypted
 * @returns {boolean} True if encryption is active
 */
export function isEncryptionActive() {
  return !!encryptionKey;
}

/**
 * Export encryption information for display (safe to show to user)
 * @returns {Object} Encryption status information
 */
export function getEncryptionInfo() {
  return {
    active: isEncryptionActive(),
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
  encryptionKey = null;
  encryptionIV = null;
  
  logChatEvent('security', 'Encryption keys reset');
  
  return await generateSessionKeys();
}