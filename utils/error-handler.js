// utils/error-handler.js
// Centralized error handling for HIPAA-compliant chat

import { logChatEvent } from './logger.js';
import { getConfig } from '../config/index.js';

// Error severity levels
export const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Error categories
export const ErrorCategory = {
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  VALIDATION: 'validation',
  DATA: 'data',
  SECURITY: 'security',
  STORAGE: 'storage',
  UI: 'ui',
  SYSTEM: 'system'
};

// Error codes
export const ErrorCode = {
  // Network errors
  NETWORK_DISCONNECTED: 'NETWORK_DISCONNECTED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  WS_CONNECTION_FAILED: 'WS_CONNECTION_FAILED',
  TIMEOUT: 'TIMEOUT',
  
  // Authentication errors
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  FORMAT_ERROR: 'FORMAT_ERROR',
  
  // Data errors
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  DATA_ALREADY_EXISTS: 'DATA_ALREADY_EXISTS',
  DATA_CORRUPTED: 'DATA_CORRUPTED',
  
  // Security errors
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  CRYPTO_NOT_SUPPORTED: 'CRYPTO_NOT_SUPPORTED',
  
  // Storage errors
  STORAGE_FULL: 'STORAGE_FULL',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  STORAGE_READ_ERROR: 'STORAGE_READ_ERROR',
  STORAGE_WRITE_ERROR: 'STORAGE_WRITE_ERROR',
  
  // UI errors
  COMPONENT_FAILED: 'COMPONENT_FAILED',
  RENDER_ERROR: 'RENDER_ERROR',
  
  // System errors
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR'
};

// Store for error handlers
const errorHandlers = {};

// Default system-wide error messages by code
const defaultErrorMessages = {
  [ErrorCode.NETWORK_DISCONNECTED]: 'Network connection lost',
  [ErrorCode.API_REQUEST_FAILED]: 'Failed to communicate with the server',
  [ErrorCode.WS_CONNECTION_FAILED]: 'Real-time connection failed',
  [ErrorCode.TIMEOUT]: 'Request timed out',
  
  [ErrorCode.AUTH_FAILED]: 'Authentication failed',
  [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired, please log in again',
  [ErrorCode.PERMISSION_DENIED]: 'You do not have permission to perform this action',
  [ErrorCode.SESSION_EXPIRED]: 'Your session has expired, please log in again',
  
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.REQUIRED_FIELD_MISSING]: 'Required information is missing',
  [ErrorCode.FORMAT_ERROR]: 'Information format is incorrect',
  
  [ErrorCode.DATA_NOT_FOUND]: 'The requested information could not be found',
  [ErrorCode.DATA_ALREADY_EXISTS]: 'This information already exists',
  [ErrorCode.DATA_CORRUPTED]: 'The data is corrupted or invalid',
  
  [ErrorCode.ENCRYPTION_FAILED]: 'Failed to secure your information',
  [ErrorCode.DECRYPTION_FAILED]: 'Could not read secured information',
  [ErrorCode.CRYPTO_NOT_SUPPORTED]: 'Your browser does not support secure communication',
  
  [ErrorCode.STORAGE_FULL]: 'Storage is full',
  [ErrorCode.STORAGE_UNAVAILABLE]: 'Storage is unavailable',
  [ErrorCode.STORAGE_READ_ERROR]: 'Failed to read from storage',
  [ErrorCode.STORAGE_WRITE_ERROR]: 'Failed to write to storage',
  
  [ErrorCode.COMPONENT_FAILED]: 'A component failed to load',
  [ErrorCode.RENDER_ERROR]: 'Failed to display information',
  
  [ErrorCode.INITIALIZATION_FAILED]: 'System initialization failed',
  [ErrorCode.UNEXPECTED_ERROR]: 'An unexpected error occurred'
};

// Storage for recent error counts (to prevent flooding)
const recentErrors = {
  counts: {},
  lastReset: Date.now()
};

/**
 * Handle an error
 * @param {Error|Object} error - Error object or error info
 * @param {Object} options - Additional options
 * @param {string} options.code - Error code
 * @param {string} options.category - Error category
 * @param {string} options.severity - Error severity
 * @param {string} options.message - User-friendly error message
 * @param {string} options.source - Error source
 * @param {Object} options.context - Additional context
 * @returns {Object} Processed error
 */
export function handleError(error, options = {}) {
  try {
    // Clean error rate limiting storage periodically (every 5 minutes)
    const now = Date.now();
    if (now - recentErrors.lastReset > 5 * 60 * 1000) {
      recentErrors.counts = {};
      recentErrors.lastReset = now;
    }
    
    // Normalize error object
    const normalizedError = normalizeError(error, options);
    
    // Check for rate limiting
    const errorKey = `${normalizedError.code}:${normalizedError.source}`;
    recentErrors.counts[errorKey] = (recentErrors.counts[errorKey] || 0) + 1;
    
    // Log error (if not excessive)
    const maxErrorsPerPeriod = getConfig('error.maxLogsPerError', 10);
    if (recentErrors.counts[errorKey] <= maxErrorsPerPeriod) {
      logError(normalizedError);
    } else if (recentErrors.counts[errorKey] === maxErrorsPerPeriod + 1) {
      // Log once that we're rate limiting
      logChatEvent('error', 'Error rate limited', {
        code: normalizedError.code,
        source: normalizedError.source
      });
    }
    
    // Call any registered handlers for this error code or category
    callErrorHandlers(normalizedError);
    
    // Return the normalized error
    return normalizedError;
  } catch (handlerError) {
    // If the error handler itself fails, log to console as a last resort
    console.error('[Error Handler] Meta-error in error handler:', handlerError);
    console.error('Original error:', error);
    
    // Return a basic error object
    return {
      code: ErrorCode.UNEXPECTED_ERROR,
      message: 'An unexpected error occurred',
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.SYSTEM,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Normalize error object to a standard format
 * @param {Error|Object} error - Error object or info
 * @param {Object} options - Additional options
 * @returns {Object} Normalized error
 */
function normalizeError(error, options = {}) {
  // Extract base information from error
  const originalError = error instanceof Error ? error : null;
  const errorMessage = originalError ? originalError.message : 
                      (typeof error === 'string' ? error : 
                      (error && error.message ? error.message : 'Unknown error'));
  
  // Create normalized error object
  const normalizedError = {
    timestamp: new Date().toISOString(),
    code: options.code || ErrorCode.UNEXPECTED_ERROR,
    category: options.category || ErrorCategory.SYSTEM,
    severity: options.severity || ErrorSeverity.ERROR,
    source: options.source || 'unknown',
    originalError,
    stackTrace: originalError ? originalError.stack : null,
    context: options.context || {}
  };
  
  // Add user-friendly message
  normalizedError.message = options.message || 
                           defaultErrorMessages[normalizedError.code] || 
                           errorMessage || 
                           'An error occurred';
  
  return normalizedError;
}

/**
 * Log an error to the audit log system
 * @param {Object} error - Normalized error object
 */
function logError(error) {
  // Don't log info-level errors to the audit log
  if (error.severity === ErrorSeverity.INFO) {
    return;
  }
  
  // Prepare log details
  const logDetails = {
    code: error.code,
    source: error.source,
    category: error.category,
    context: error.context
  };
  
  // Add stack trace for ERROR and CRITICAL severity
  if (error.severity === ErrorSeverity.ERROR || error.severity === ErrorSeverity.CRITICAL) {
    logDetails.stackTrace = error.stackTrace;
  }
  
  // Log to console based on severity
  switch (error.severity) {
    case ErrorSeverity.WARNING:
      console.warn(`[${error.source}] ${error.message}`, error.context);
      break;
    case ErrorSeverity.ERROR:
    case ErrorSeverity.CRITICAL:
      console.error(`[${error.source}] ${error.message}`, error);
      break;
    default:
      console.log(`[${error.source}] ${error.message}`, error.context);
  }
  
  // Log to audit system
  logChatEvent('error', error.message, logDetails);
}

/**
 * Call any registered error handlers
 * @param {Object} error - Normalized error object
 */
function callErrorHandlers(error) {
  // Call code-specific handler if exists
  if (errorHandlers[error.code]) {
    try {
      errorHandlers[error.code](error);
    } catch (handlerError) {
      console.error('[Error Handler] Error in code-specific handler:', handlerError);
    }
  }
  
  // Call category handler if exists
  if (errorHandlers[error.category]) {
    try {
      errorHandlers[error.category](error);
    } catch (handlerError) {
      console.error('[Error Handler] Error in category handler:', handlerError);
    }
  }
  
  // Call severity handler if exists
  if (errorHandlers[error.severity]) {
    try {
      errorHandlers[error.severity](error);
    } catch (handlerError) {
      console.error('[Error Handler] Error in severity handler:', handlerError);
    }
  }
  
  // Always call global handler if exists
  if (errorHandlers.global) {
    try {
      errorHandlers.global(error);
    } catch (handlerError) {
      console.error('[Error Handler] Error in global handler:', handlerError);
    }
  }
}

/**
 * Register an error handler
 * @param {string} key - Error code, category, severity, or 'global'
 * @param {Function} handler - Handler function
 * @returns {Function} Unregister function
 */
export function registerErrorHandler(key, handler) {
  if (typeof handler !== 'function') {
    console.error('[Error Handler] Handler must be a function');
    return () => {};
  }
  
  errorHandlers[key] = handler;
  
  // Return unregister function
  return () => {
    delete errorHandlers[key];
  };
}

/**
 * Create a wrapper that catches errors and handles them
 * @param {Function} fn - Function to wrap
 * @param {Object} options - Error handling options
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, options = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, {
        source: options.source || fn.name || 'unknown',
        ...options
      });
      
      // Re-throw if specified, otherwise return null
      if (options.rethrow) {
        throw error;
      }
      
      return options.defaultValue !== undefined ? options.defaultValue : null;
    }
  };
}

/**
 * Create a network error
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} context - Additional context
 * @returns {Object} Error object
 */
export function createNetworkError(message, code = ErrorCode.API_REQUEST_FAILED, context = {}) {
  return handleError(new Error(message), {
    code,
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.ERROR,
    source: 'network',
    context
  });
}

/**
 * Create an authentication error
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} context - Additional context
 * @returns {Object} Error object
 */
export function createAuthError(message, code = ErrorCode.AUTH_FAILED, context = {}) {
  return handleError(new Error(message), {
    code,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.WARNING,
    source: 'auth',
    context
  });
}

/**
 * Create a validation error
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} context - Additional context
 * @returns {Object} Error object
 */
export function createValidationError(message, code = ErrorCode.INVALID_INPUT, context = {}) {
  return handleError(new Error(message), {
    code,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.WARNING,
    source: 'validation',
    context
  });
}

/**
 * Get a user-friendly message for an error code
 * @param {string} code - Error code
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(code) {
  return defaultErrorMessages[code] || 'An error occurred';
}

/**
 * Reset error handling system
 */
export function resetErrorHandling() {
  // Clear all handlers
  Object.keys(errorHandlers).forEach(key => {
    delete errorHandlers[key];
  });
  
  // Reset error rate limiting
  recentErrors.counts = {};
  recentErrors.lastReset = Date.now();
  
  console.log('[Error Handler] Error handling system reset');
}

export default {
  handleError,
  registerErrorHandler,
  withErrorHandling,
  createNetworkError,
  createAuthError,
  createValidationError,
  getErrorMessage,
  resetErrorHandling,
  ErrorSeverity,
  ErrorCategory,
  ErrorCode
};