// services/encryption/keyManager.js
// Key management service for HIPAA-compliant chat encryption

import { logChatEvent } from '../../utils/logger.js';
import { getConfig } from '../../config/index.js';

// Storage key for encrypted keys
const KEY_STORAGE_PREFIX = 'crmplus_chat_encryption_';

// Keys for current session
let encryptionKey = null;
let encryptionIV = null;
let legacyKey = null;

// Flag to check if crypto API is available
const hasCryptoAPI = typeof window !== 'undefined' && 
                     window.crypto && 
                     window.crypto.subtle;

/**
 * Generate secure random bytes
 * @param {number} length - Length of bytes to generate
 * @returns {Uint8Array} Random bytes
 */
function getRandomBytes(length) {
  if (hasCryptoAPI) {
    return window.crypto.getRandomValues(new Uint8Array(length));
  } else {
    // Fallback for older browsers (less secure)
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
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
  if (hasCryptoAPI) {
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
 * Convert array buffer to base64 string
 * @param {ArrayBuffer} buffer - Array buffer to convert
 * @returns {string} Base64 string
 */
function arrayBufferToBase64(buffer) {
  const binary = String.fromCharCode.apply(null, new Uint8Array(buffer));
  return btoa(binary);
}

/**
 * Convert base64 string to array buffer
 * @param {string} base64 - Base64 string to convert
 * @returns {ArrayBuffer} Array buffer
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Save keys to local storage
 * @param {Object} keys - Keys to save
 * @returns {boolean} Success status
 */
function saveKeys(keys) {
  try {
    // Save to local storage
    if (keys.encryptionKeyBase64) {
      localStorage.setItem(`${KEY_STORAGE_PREFIX}key`, keys.encryptionKeyBase64);
    }
    
    if (keys.encryptionIVBase64) {
      localStorage.setItem(`${KEY_STORAGE_PREFIX}iv`, keys.encryptionIVBase64);
    }
    
    if (keys.legacyKey) {
      localStorage.setItem(`${KEY_STORAGE_PREFIX}legacy`, keys.legacyKey);
    }
    
    return true;
  } catch (error) {
    console.error('[Key Manager] Error saving keys:', error);
    return false;
  }
}

/**
 * Load keys from local storage
 * @returns {Object} Loaded keys
 */
function loadKeys() {
  try {
    const encryptionKeyBase64 = localStorage.getItem(`${KEY_STORAGE_PREFIX}key`);
    const encryptionIVBase64 = localStorage.getItem(`${KEY_STORAGE_PREFIX}iv`);
    const legacyKey = localStorage.getItem(`${KEY_STORAGE_PREFIX}legacy`);
    
    return {
      encryptionKeyBase64,
      encryptionIVBase64,
      legacyKey
    };
  } catch (error) {
    console.error('[Key Manager] Error loading keys:', error);
    return {
      encryptionKeyBase64: null,
      encryptionIVBase64: null,
      legacyKey: null
    };
  }
}

/**
 * Clear keys from local storage
 */
function clearStorage() {
  try {
    localStorage.removeItem(`${KEY_STORAGE_PREFIX}key`);
    localStorage.removeItem(`${KEY_STORAGE_PREFIX}iv`);
    localStorage.removeItem(`${KEY_STORAGE_PREFIX}legacy`);
  } catch (error) {
    console.error('[Key Manager] Error clearing keys from storage:', error);
  }
}

/**
 * Generate new keys
 * @returns {Promise<Object>} Generated keys
 */
async function generateKeys() {
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
      encryptionIV = getRandomBytes(12);
      
      // Export the key for storage
      const exportedKey = await window.crypto.subtle.exportKey('raw', key);
      const encryptionKeyBase64 = arrayBufferToBase64(exportedKey);
      const encryptionIVBase64 = arrayBufferToBase64(encryptionIV);
      
      // Also generate a legacy key for fallback
      legacyKey = generateRandomString(32);
      
      console.log('[Key Manager] Generated secure encryption keys using Web Crypto API');
      
      return {
        encryptionKeyBase64,
        encryptionIVBase64,
        legacyKey
      };
    } else {
      // Fallback for older browsers: Generate random strings
      // Note: This is less secure and would not be HIPAA-compliant in production
      legacyKey = generateRandomString(32); // 256-bit key equivalent
      
      console.warn('[Key Manager] Using fallback encryption methods - less secure');
      logChatEvent('security', 'Using fallback encryption (not recommended for PHI)');
      
      return {
        encryptionKeyBase64: null,
        encryptionIVBase64: null,
        legacyKey
      };
    }
  } catch (error) {
    console.error('[Key Manager] Error generating keys:', error);
    throw error;
  }
}

/**
 * Import keys from storage
 * @param {Object} storedKeys - Keys from storage
 * @returns {Promise<boolean>} Success status
 */
async function importKeys(storedKeys) {
  try {
    if (hasCryptoAPI && storedKeys.encryptionKeyBase64 && storedKeys.encryptionIVBase64) {
      // Import the key
      const keyData = base64ToArrayBuffer(storedKeys.encryptionKeyBase64);
      encryptionKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        {
          name: 'AES-GCM',
          length: 256
        },
        false, // not extractable
        ['encrypt', 'decrypt']
      );
      
      // Import the IV
      encryptionIV = new Uint8Array(base64ToArrayBuffer(storedKeys.encryptionIVBase64));
      
      console.log('[Key Manager] Imported encryption keys from storage');
    }
    
    // Import legacy key
    if (storedKeys.legacyKey) {
      legacyKey = storedKeys.legacyKey;
    }
    
    return true;
  } catch (error) {
    console.error('[Key Manager] Error importing keys:', error);
    return false;
  }
}

/**
 * Initialize encryption keys
 * @returns {Promise<boolean>} Success status
 */
export async function initKeys() {
  try {
    // Check if encryption is enabled
    if (!getConfig('hipaa.enableEncryption', true)) {
      console.log('[Key Manager] Encryption disabled in configuration');
      return false;
    }
    
    // First try to load keys from storage
    const storedKeys = loadKeys();
    
    if (storedKeys.encryptionKeyBase64 || storedKeys.legacyKey) {
      // Import existing keys
      const result = await importKeys(storedKeys);
      
      if (result) {
        logChatEvent('security', 'Encryption keys loaded from storage');
        return true;
      }
    }
    
    // If no keys or import failed, generate new keys
    const newKeys = await generateKeys();
    
    // Save to storage
    saveKeys(newKeys);
    
    logChatEvent('security', 'New encryption keys generated');
    return true;
  } catch (error) {
    console.error('[Key Manager] Error initializing keys:', error);
    logChatEvent('security', 'Failed to initialize encryption keys', { error: error.message });
    return false;
  }
}

/**
 * Get encryption keys for use in encryption service
 * @returns {Object} Encryption keys
 */
export async function getEncryptionKeys() {
  // Initialize keys if not already done
  if (!hasKeys()) {
    await initKeys();
  }
  
  return {
    encryptionKey,
    encryptionIV
  };
}

/**
 * Get legacy keys for fallback encryption
 * @returns {Object} Legacy keys
 */
export function getLegacyKeys() {
  return {
    legacyKey
  };
}

/**
 * Check if keys are initialized
 * @returns {boolean} True if keys are available
 */
export function hasKeys() {
  return !!(encryptionKey || legacyKey);
}

/**
 * Clear all encryption keys
 */
export function clearKeys() {
  encryptionKey = null;
  encryptionIV = null;
  legacyKey = null;
  
  // Clear from storage
  clearStorage();
  
  logChatEvent('security', 'Encryption keys cleared');
}

/**
 * Rotate encryption keys
 * @returns {Promise<boolean>} Success status
 */
export async function rotateKeys() {
  try {
    // Clear existing keys
    clearKeys();
    
    // Generate new keys
    return await initKeys();
  } catch (error) {
    console.error('[Key Manager] Key rotation error:', error);
    return false;
  }
}

/**
 * Schedule key rotation
 * @param {number} interval - Rotation interval in milliseconds
 * @returns {number} Timer ID
 */
export function scheduleKeyRotation(interval = 24 * 60 * 60 * 1000) { // Default: 24 hours
  console.log(`[Key Manager] Scheduling key rotation every ${interval / (60 * 60 * 1000)} hours`);
  
  return setInterval(async () => {
    console.log('[Key Manager] Rotating encryption keys');
    await rotateKeys();
  }, interval);
}

export default {
  initKeys,
  getEncryptionKeys,
  getLegacyKeys,
  hasKeys,
  clearKeys,
  rotateKeys,
  scheduleKeyRotation
};