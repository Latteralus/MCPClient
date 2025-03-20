// services/auth/userImport.js
// Bulk user import functionality

import { logChatEvent } from '../../utils/logger.js';
import { getSetting, saveSetting } from '../../utils/storage.js';
import { getCurrentUser, isAuthenticated } from './authentication.js';

/**
 * Validate user import data
 * @param {Array} users - Array of user objects to validate
 * @returns {Object} Validation result
 */
function validateUserImportData(users) {
  const validationResults = {
    validUsers: [],
    invalidUsers: []
  };

  users.forEach(user => {
    // Basic validation checks
    const errors = [];

    if (!user.username) {
      errors.push('Username is required');
    }

    if (!user.password) {
      errors.push('Password is required');
    }

    // Optional but recommended fields
    if (!user.email) {
      errors.push('Email is recommended');
    }

    // Role validation
    const validRoles = ['user', 'moderator', 'admin'];
    if (user.role && !validRoles.includes(user.role)) {
      errors.push(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    if (errors.length > 0) {
      validationResults.invalidUsers.push({
        user,
        errors
      });
    } else {
      validationResults.validUsers.push(user);
    }
  });

  return validationResults;
}

/**
 * Import users in bulk
 * @param {Array} users - Array of user objects to import
 * @returns {Promise<Object>} Import result
 */
export async function importUsers(users) {
  try {
    const currentUser = getCurrentUser();
    
    // Authentication and authorization checks
    if (!isAuthenticated()) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    
    if (currentUser.role !== 'admin') {
      return {
        success: false,
        error: 'Administrator privileges required to import users'
      };
    }
    
    // Validate input
    if (!Array.isArray(users) || users.length === 0) {
      return {
        success: false,
        error: 'Valid user array is required'
      };
    }

    // Validate user data
    const { validUsers, invalidUsers } = validateUserImportData(users);
    
    // Get server URL from storage
    const serverUrl = localStorage.getItem('crmplus_chat_server_url') || 'ws://localhost:3000';
    const httpServerUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    // Prepare import results
    const importResults = {
      success: true,
      totalUsers: users.length,
      successCount: 0,
      failedCount: 0,
      validationErrors: invalidUsers,
      importedUsers: [],
      serverErrors: []
    };
    
    // Send bulk import request to server
    try {
      const response = await fetch(`${httpServerUrl}/admin/users/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('crmplus_chat_auth_token')}`
        },
        body: JSON.stringify({ users: validUsers })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import users');
      }
      
      const serverImportResult = await response.json();
      
      // Update import results from server response
      importResults.successCount = serverImportResult.successCount || 0;
      importResults.failedCount = serverImportResult.failedCount || 0;
      importResults.importedUsers = serverImportResult.importedUsers || [];
      
      // Log import event
      logChatEvent('auth', 'Admin bulk user import', {
        adminUsername: currentUser.username,
        totalUsers: users.length,
        successCount: importResults.successCount,
        failedCount: importResults.failedCount
      });
      
      return importResults;
    } catch (serverError) {
      console.error('[CRM Extension] Server user import error:', serverError);
      
      // Fallback to local import if allowed
      if (getSetting('allow_local_auth', false)) {
        const localUsers = getSetting('local_users', []);
        const existingUsernames = new Set(localUsers.map(u => u.username));
        
        // Process valid users locally
        validUsers.forEach(user => {
          try {
            // Check for existing username
            if (existingUsernames.has(user.username)) {
              importResults.failedCount++;
              importResults.serverErrors.push({
                username: user.username,
                error: 'Username already exists'
              });
              return;
            }
            
            // Create local user
            const newUser = {
              id: `user_${Date.now().toString(36)}`,
              ...user,
              role: user.role || 'user',
              displayName: user.displayName || user.username,
              createdAt: new Date().toISOString(),
              createdBy: currentUser.id
            };
            
            localUsers.push(newUser);
            existingUsernames.add(user.username);
            
            importResults.successCount++;
            importResults.importedUsers.push(newUser);
          } catch (error) {
            importResults.failedCount++;
            importResults.serverErrors.push({
              username: user.username || 'Unknown',
              error: error.message
            });
          }
        });
        
        // Save local users
        saveSetting('local_users', localUsers);
        
        // Log local import
        logChatEvent('auth', 'Local bulk user import', {
          adminUsername: currentUser.username,
          totalUsers: users.length,
          successCount: importResults.successCount,
          failedCount: importResults.failedCount,
          isLocal: true
        });
        
        return importResults;
      }
      
      // If no local import, throw error
      throw new Error('Server request failed: ' + serverError.message);
    }
  } catch (error) {
    console.error('[CRM Extension] Bulk user import error:', error);
    
    return {
      success: false,
      error: error.message,
      totalUsers: users.length,
      successCount: 0,
      failedCount: users.length
    };
  }
}

/**
 * Generate a sample user import template
 * @returns {Array} Sample user import data
 */
export function generateUserImportTemplate() {
  return [
    {
      username: 'john.doe',
      password: 'SecurePassword123!',
      email: 'john.doe@example.com',
      displayName: 'John Doe',
      role: 'user'
    },
    {
      username: 'jane.smith',
      password: 'AnotherSecurePass456!',
      email: 'jane.smith@example.com',
      displayName: 'Jane Smith',
      role: 'moderator'
    }
  ];
}