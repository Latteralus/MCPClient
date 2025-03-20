// services/auth/index.js
// Comprehensive export of all authentication-related functions

// Import individual modules
import * as authentication from './authentication.js';
import * as roles from './roles.js';
import * as permissions from './permissions.js';
import * as userOperations from './userOperations.js';
import * as userImport from './userImport.js';
import * as sessionManagement from './sessionManagement.js';

// Export all functions from individual modules
export * from './authentication.js';
export * from './roles.js';
export * from './permissions.js';
export * from './userOperations.js';
export * from './userImport.js';
export * from './sessionManagement.js';

// Combine and export all modules
export default {
  ...authentication,
  ...roles,
  ...permissions,
  ...userOperations,
  ...userImport,
  ...sessionManagement
};

// Explicit exports to ensure all needed functions are available
export const {
  createUser,
  updateUser,
  deleteUser,
  getAllUsers,
  importUsers,
  
  createRole,
  updateRole,
  deleteRole,
  getAllRoles,
  
  getAvailablePermissions,
  
  resetUserPassword,
  forceLogoutUser,
  
  generateUserImportTemplate
} = {
  ...userOperations,
  ...roles,
  ...permissions,
  ...userImport
};