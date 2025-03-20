// chat/utils/logger.js
// Audit logging functionality for HIPAA compliance

// Storage key for audit logs
const AUDIT_LOG_KEY = 'crmplus_chat_audit_log';

// Maximum number of audit entries to keep
const MAX_AUDIT_ENTRIES = 1000;

// Audit log retention period (90 days in milliseconds)
const AUDIT_LOG_RETENTION = 90 * 24 * 60 * 60 * 1000;

/**
 * Log a chat event for audit purposes
 * @param {string} category - Event category (system, message, storage, security, auth)
 * @param {string} action - Description of the action
 * @param {Object} details - Additional details (optional)
 * @returns {boolean} Success status
 */
export function logChatEvent(category, action, details = {}) {
  try {
    // Create audit entry
    const entry = {
      timestamp: new Date().toISOString(),
      category,
      action,
      details,
      username: localStorage.getItem('crmplus_chat_username') || 'Unknown',
      browser: getBrowserInfo(),
      ip: '127.0.0.1' // Local IP for HIPAA compliance
    };
    
    // Get current audit log
    const auditLog = getAuditLog();
    
    // Add entry to beginning of array (newest first)
    auditLog.unshift(entry);
    
    // Trim to maximum entries
    if (auditLog.length > MAX_AUDIT_ENTRIES) {
      auditLog.length = MAX_AUDIT_ENTRIES;
    }
    
    // Save to storage
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(auditLog));
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error logging audit event:', error);
    return false;
  }
}

/**
 * Get all audit log entries
 * @returns {Array} Array of audit log entries
 */
export function getAuditLog() {
  try {
    const storedLog = localStorage.getItem(AUDIT_LOG_KEY);
    return storedLog ? JSON.parse(storedLog) : [];
  } catch (error) {
    console.error('[CRM Extension] Error getting audit log:', error);
    return [];
  }
}

/**
 * Get browser information for audit log
 * @returns {string} Browser information
 */
function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  let browserInfo = 'Unknown Browser';
  
  if (userAgent.includes('Firefox')) {
    browserInfo = 'Firefox';
  } else if (userAgent.includes('Edg')) {
    browserInfo = 'Edge';
  } else if (userAgent.includes('Chrome')) {
    browserInfo = 'Chrome';
  } else if (userAgent.includes('Safari')) {
    browserInfo = 'Safari';
  }
  
  return browserInfo;
}

/**
 * Clean up expired audit log entries
 * @returns {number} Number of entries removed
 */
export function cleanupAuditLog() {
  try {
    const auditLog = getAuditLog();
    const now = new Date().getTime();
    
    // Filter out expired entries
    const validEntries = auditLog.filter(entry => {
      const entryTime = new Date(entry.timestamp).getTime();
      return (now - entryTime) < AUDIT_LOG_RETENTION;
    });
    
    // Log the cleanup
    const removedCount = auditLog.length - validEntries.length;
    if (removedCount > 0) {
      console.log(`[CRM Extension] Removed ${removedCount} expired audit log entries`);
    }
    
    // Save the filtered entries
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(validEntries));
    
    return removedCount;
  } catch (error) {
    console.error('[CRM Extension] Error cleaning up audit log:', error);
    return 0;
  }
}

/**
 * Search the audit log
 * @param {Object} criteria - Search criteria
 * @param {number} limit - Maximum number of results
 * @returns {Array} Matching audit log entries
 */
export function searchAuditLog(criteria = {}, limit = 100) {
  try {
    // Get all entries
    let entries = getAuditLog();
    
    // Apply filters if provided
    if (criteria.category) {
      entries = entries.filter(entry => entry.category === criteria.category);
    }
    
    if (criteria.username) {
      entries = entries.filter(entry => entry.username === criteria.username);
    }
    
    if (criteria.startDate) {
      const startTime = new Date(criteria.startDate).getTime();
      entries = entries.filter(entry => new Date(entry.timestamp).getTime() >= startTime);
    }
    
    if (criteria.endDate) {
      const endTime = new Date(criteria.endDate).getTime();
      entries = entries.filter(entry => new Date(entry.timestamp).getTime() <= endTime);
    }
    
    if (criteria.action) {
      entries = entries.filter(entry => entry.action.includes(criteria.action));
    }
    
    // Limit results
    return entries.slice(0, limit);
  } catch (error) {
    console.error('[CRM Extension] Error searching audit log:', error);
    return [];
  }
}

/**
 * Export the audit log to a file
 * @returns {boolean} Success status
 */
export function exportAuditLog() {
  try {
    // Get all audit log entries
    const auditLog = getAuditLog();
    
    // Create a formatted CSV string
    let csvContent = 'timestamp,category,action,username,browser,details\n';
    
    auditLog.forEach(entry => {
      // Format details as a safe string
      const detailsStr = JSON.stringify(entry.details || {}).replace(/"/g, '""');
      
      csvContent += `"${entry.timestamp}","${entry.category}","${entry.action.replace(/"/g, '""')}","${entry.username}","${entry.browser}","${detailsStr}"\n`;
    });
    
    // Create a blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `chat_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    
    // Add to document, click, and remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Log the export
    logChatEvent('system', 'Audit log exported');
    
    console.log('[CRM Extension] Exported audit log to file');
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error exporting audit log:', error);
    return false;
  }
}

/**
 * Clear the audit log
 * Note: In a HIPAA-compliant system, this would be restricted to administrators
 * @returns {boolean} Success status
 */
export function clearAuditLog() {
  try {
    // Before clearing, log that the action is happening
    const auditLogSize = getAuditLog().length;
    logChatEvent('system', `Audit log cleared (${auditLogSize} entries)`);
    
    // Clear the audit log
    localStorage.removeItem(AUDIT_LOG_KEY);
    
    console.log('[CRM Extension] Cleared audit log');
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error clearing audit log:', error);
    return false;
  }
}

/**
 * Get statistics about the audit log
 * @returns {Object} Audit log statistics
 */
export function getAuditLogStats() {
  try {
    const auditLog = getAuditLog();
    
    // Count entries by category
    const categoryCounts = {};
    auditLog.forEach(entry => {
      categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
    });
    
    // Get date range
    let oldestEntry = null;
    let newestEntry = null;
    
    if (auditLog.length > 0) {
      oldestEntry = auditLog[auditLog.length - 1].timestamp;
      newestEntry = auditLog[0].timestamp;
    }
    
    return {
      totalEntries: auditLog.length,
      categories: categoryCounts,
      oldestEntry,
      newestEntry,
      retentionDays: AUDIT_LOG_RETENTION / (24 * 60 * 60 * 1000)
    };
  } catch (error) {
    console.error('[CRM Extension] Error getting audit log statistics:', error);
    return {
      totalEntries: 0,
      categories: {},
      oldestEntry: null,
      newestEntry: null,
      retentionDays: AUDIT_LOG_RETENTION / (24 * 60 * 60 * 1000)
    };
  }
}