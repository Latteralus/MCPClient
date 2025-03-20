// services/api/index.js
// Base API client for HIPAA-compliant chat application

import { getConfig } from '../../config/index.js';
import { logChatEvent } from '../../utils/logger.js';

/**
 * API client for making HTTP requests to the server
 */
class ApiClient {
  constructor() {
    this.baseUrl = getConfig('server.url', 'http://localhost:3000/api');
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    this.requestInterceptors = [];
    this.responseInterceptors = [];

    // Initialize API client
    this.initialize();
  }

  /**
   * Initialize the API client
   */
  initialize() {
    // Update base URL from config
    this.baseUrl = getConfig('server.url', 'http://localhost:3000/api');
    
    console.log(`[API Client] Initialized with base URL: ${this.baseUrl}`);
    
    // Add default interceptors
    this.addRequestInterceptor(this.authTokenInterceptor);
    this.addResponseInterceptor(this.errorHandlerInterceptor);
  }

  /**
   * Auth token interceptor that adds the authentication token to requests
   * @param {Object} config - Request configuration
   * @returns {Object} Updated request configuration
   */
  authTokenInterceptor = (config) => {
    // Skip adding auth token if this is a login or public endpoint
    if (config.url === '/auth/login' || config.url === '/auth/register' || config.public) {
      return config;
    }

    try {
      // We can't access auth service directly here to avoid circular dependency
      // Instead, we get the token directly from storage
      const token = localStorage.getItem('crmplus_chat_auth_token');
      if (token) {
        if (!config.headers) {
          config.headers = {};
        }
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('[API Client] Error in auth token interceptor:', error);
    }

    return config;
  }

  /**
   * Error handler interceptor that processes API responses
   * @param {Object} response - API response
   * @param {Object} requestConfig - Original request config
   * @returns {Object} Processed response
   */
  errorHandlerInterceptor = async (response, requestConfig) => {
    // If response has error status, log it
    if (!response.ok) {
      logChatEvent('api', 'API error response', {
        status: response.status,
        url: requestConfig.url,
        method: requestConfig.method
      });
      
      // If status is 401 Unauthorized and not a login request, 
      // we could trigger a logout here but we don't have direct access to auth service
      if (response.status === 401 && requestConfig.url !== '/auth/login') {
        // Dispatch an event that auth service can listen for
        const authEvent = new CustomEvent('auth:unauthorized', {
          detail: { url: requestConfig.url }
        });
        window.dispatchEvent(authEvent);
      }
    }
    
    return response;
  }

  /**
   * Add a request interceptor
   * @param {Function} interceptor - Function that receives and modifies request config
   */
  addRequestInterceptor(interceptor) {
    if (typeof interceptor === 'function') {
      this.requestInterceptors.push(interceptor);
    }
  }

  /**
   * Add a response interceptor
   * @param {Function} interceptor - Function that receives and processes response
   */
  addResponseInterceptor(interceptor) {
    if (typeof interceptor === 'function') {
      this.responseInterceptors.push(interceptor);
    }
  }

  /**
   * Apply request interceptors to request config
   * @param {Object} config - Request configuration
   * @returns {Object} Modified request configuration
   */
  applyRequestInterceptors(config) {
    let modifiedConfig = { ...config };
    
    for (const interceptor of this.requestInterceptors) {
      try {
        modifiedConfig = interceptor(modifiedConfig) || modifiedConfig;
      } catch (error) {
        console.error('[API Client] Error in request interceptor:', error);
      }
    }
    
    return modifiedConfig;
  }

  /**
   * Apply response interceptors to response
   * @param {Object} response - Response object
   * @param {Object} requestConfig - Original request configuration
   * @returns {Object} Modified response
   */
  async applyResponseInterceptors(response, requestConfig) {
    let modifiedResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      try {
        modifiedResponse = await interceptor(modifiedResponse, requestConfig) || modifiedResponse;
      } catch (error) {
        console.error('[API Client] Error in response interceptor:', error);
      }
    }
    
    return modifiedResponse;
  }

  /**
   * Make an HTTP request
   * @param {string} method - HTTP method
   * @param {string} url - URL path (will be appended to base URL)
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async request(method, url, options = {}) {
    try {
      // Prepare request configuration
      const requestConfig = {
        method: method.toUpperCase(),
        url,
        headers: { ...this.defaultHeaders, ...options.headers },
        data: options.data,
        params: options.params,
        public: options.public,
        timeout: options.timeout || 30000 // Default 30 second timeout
      };

      // Apply request interceptors
      const modifiedConfig = this.applyRequestInterceptors(requestConfig);

      // Build full URL with query parameters
      let fullUrl = this.baseUrl + modifiedConfig.url;
      
      // Add query parameters if present
      if (modifiedConfig.params) {
        const queryParams = new URLSearchParams();
        
        Object.keys(modifiedConfig.params).forEach(key => {
          if (modifiedConfig.params[key] !== undefined && modifiedConfig.params[key] !== null) {
            queryParams.append(key, modifiedConfig.params[key]);
          }
        });
        
        const queryString = queryParams.toString();
        if (queryString) {
          fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
        }
      }

      // Log API request (masked for sensitive endpoints)
      const isSensitive = url.includes('login') || url.includes('password');
      logChatEvent('api', 'API request', {
        method: modifiedConfig.method,
        url: modifiedConfig.url,
        params: isSensitive ? '[redacted]' : modifiedConfig.params
      });

      // Set up fetch options
      const fetchOptions = {
        method: modifiedConfig.method,
        headers: modifiedConfig.headers,
        body: modifiedConfig.data ? JSON.stringify(modifiedConfig.data) : undefined
      };

      // Execute the request
      const startTime = Date.now();
      const response = await fetch(fullUrl, fetchOptions);
      const endTime = Date.now();

      // Apply response interceptors
      const modifiedResponse = await this.applyResponseInterceptors(response, modifiedConfig);

      // Parse the response based on content type
      let data;
      const contentType = modifiedResponse.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await modifiedResponse.json();
      } else {
        data = await modifiedResponse.text();
      }

      // Log API response timing
      logChatEvent('api', 'API response', {
        method: modifiedConfig.method,
        url: modifiedConfig.url,
        status: modifiedResponse.status,
        time: endTime - startTime
      });

      // Return standardized response format
      return {
        success: modifiedResponse.ok,
        status: modifiedResponse.status,
        message: !modifiedResponse.ok ? data.message || 'Request failed' : undefined,
        data: modifiedResponse.ok ? data : undefined,
        headers: Object.fromEntries(modifiedResponse.headers.entries())
      };
    } catch (error) {
      console.error(`[API Client] Request error (${method} ${url}):`, error);
      
      logChatEvent('api', 'API request error', {
        method,
        url,
        error: error.message
      });

      // Return standardized error response
      return {
        success: false,
        status: 0,
        message: error.message || 'Network error',
        error: error
      };
    }
  }

  /**
   * Make a GET request
   * @param {string} url - URL path
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async get(url, options = {}) {
    return this.request('GET', url, options);
  }

  /**
   * Make a POST request
   * @param {string} url - URL path
   * @param {Object} data - Request data
   * @param {Object} options - Additional request options
   * @returns {Promise<Object>} Response data
   */
  async post(url, data, options = {}) {
    return this.request('POST', url, { ...options, data });
  }

  /**
   * Make a PUT request
   * @param {string} url - URL path
   * @param {Object} data - Request data
   * @param {Object} options - Additional request options
   * @returns {Promise<Object>} Response data
   */
  async put(url, data, options = {}) {
    return this.request('PUT', url, { ...options, data });
  }

  /**
   * Make a DELETE request
   * @param {string} url - URL path
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async delete(url, options = {}) {
    return this.request('DELETE', url, options);
  }

  /**
   * Make a PATCH request
   * @param {string} url - URL path
   * @param {Object} data - Request data
   * @param {Object} options - Additional request options
   * @returns {Promise<Object>} Response data
   */
  async patch(url, data, options = {}) {
    return this.request('PATCH', url, { ...options, data });
  }
}

// Create and export singleton instance
const api = new ApiClient();
export default api;