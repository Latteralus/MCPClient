// chat/components/admin/users/ImportUsersModal.js
// Modal for importing multiple users

import { importUsers } from '../../../services/auth';
import { logChatEvent } from '../../../utils/logger.js';
import ModalBase from '../../common/ModalBase.js';

/**
 * Import Users Modal Component
 * Modal for importing multiple users from CSV or JSON
 */
class ImportUsersModal extends ModalBase {
  /**
   * Create a new ImportUsersModal
   * @param {Object} options - Modal options
   * @param {Function} options.onSuccess - Success callback
   */
  constructor(options = {}) {
    super({
      title: 'Import Users',
      width: '550px',
      ...options
    });
    
    this.options = {
      onSuccess: () => {},
      ...options
    };
    
    this.users = [];
  }
  
  /**
   * Render the modal content
   * @returns {HTMLElement} Modal content
   */
  renderContent() {
    const content = document.createElement('div');
    
    // Instructions
    const instructions = document.createElement('div');
    this.applyStyles(instructions, {
      marginBottom: '20px'
    });
    
    const instructionsTitle = document.createElement('h4');
    instructionsTitle.textContent = 'Import Multiple Users';
    this.applyStyles(instructionsTitle, {
      marginTop: '0',
      marginBottom: '10px'
    });
    
    const instructionsText = document.createElement('p');
    instructionsText.textContent = 'Import multiple users using either JSON format or by pasting CSV data. The import will validate each user and skip any with errors.';
    
    instructions.appendChild(instructionsTitle);
    instructions.appendChild(instructionsText);
    
    // Format information
    const formatInfo = document.createElement('div');
    this.applyStyles(formatInfo, {
      backgroundColor: '#f8f9fa',
      padding: '10px',
      borderRadius: '4px',
      marginBottom: '20px',
      fontSize: '14px'
    });
    
    const jsonExample = document.createElement('div');
    jsonExample.innerHTML = '<strong>JSON Format Example:</strong><br>';
    jsonExample.innerHTML += '<code>[{"username": "user1", "displayName": "User One", "password": "Password123", "role": "user"},<br>{"username": "user2", "displayName": "User Two", "password": "Password123", "role": "moderator"}]</code>';
    
    const csvExample = document.createElement('div');
    csvExample.innerHTML = '<strong>CSV Format Example:</strong><br>';
    csvExample.innerHTML += '<code>username,displayName,password,role<br>user1,User One,Password123,user<br>user2,User Two,Password123,moderator</code>';
    
    formatInfo.appendChild(jsonExample);
    formatInfo.appendChild(document.createElement('br'));
    formatInfo.appendChild(csvExample);
    
    // Import form
    const form = document.createElement('form');
    
    // Text area for input
    const textAreaGroup = document.createElement('div');
    this.applyStyles(textAreaGroup, {
      marginBottom: '15px'
    });
    
    const textAreaLabel = document.createElement('label');
    textAreaLabel.textContent = 'Paste JSON or CSV data:';
    textAreaLabel.htmlFor = 'import-data';
    this.applyStyles(textAreaLabel, {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 'bold'
    });
    
    const textArea = document.createElement('textarea');
    textArea.id = 'import-data';
    textArea.rows = 8;
    this.applyStyles(textArea, {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      boxSizing: 'border-box',
      fontFamily: 'monospace',
      fontSize: '14px'
    });
    
    textAreaGroup.appendChild(textAreaLabel);
    textAreaGroup.appendChild(textArea);
    
    // Format selection
    const formatGroup = document.createElement('div');
    this.applyStyles(formatGroup, {
      marginBottom: '15px'
    });
    
    const formatLabel = document.createElement('label');
    formatLabel.textContent = 'Format:';
    this.applyStyles(formatLabel, {
      marginRight: '10px'
    });
    
    const jsonRadio = document.createElement('input');
    jsonRadio.type = 'radio';
    jsonRadio.id = 'format-json';
    jsonRadio.name = 'format';
    jsonRadio.value = 'json';
    jsonRadio.checked = true;
    
    const jsonLabel = document.createElement('label');
    jsonLabel.textContent = 'JSON';
    jsonLabel.htmlFor = 'format-json';
    this.applyStyles(jsonLabel, {
      marginRight: '15px'
    });
    
    const csvRadio = document.createElement('input');
    csvRadio.type = 'radio';
    csvRadio.id = 'format-csv';
    csvRadio.name = 'format';
    csvRadio.value = 'csv';
    
    const csvLabel = document.createElement('label');
    csvLabel.textContent = 'CSV';
    csvLabel.htmlFor = 'format-csv';
    
    formatGroup.appendChild(formatLabel);
    formatGroup.appendChild(jsonRadio);
    formatGroup.appendChild(jsonLabel);
    formatGroup.appendChild(csvRadio);
    formatGroup.appendChild(csvLabel);
    
    // Error message area
    const errorMessage = document.createElement('div');
    errorMessage.id = 'import-error';
    this.applyStyles(errorMessage, {
      color: '#dc3545',
      marginBottom: '15px',
      display: 'none'
    });
    
    // Result area (initially hidden)
    const resultArea = document.createElement('div');
    resultArea.id = 'import-result';
    this.applyStyles(resultArea, {
      backgroundColor: '#f8f9fa',
      padding: '10px',
      borderRadius: '4px',
      marginBottom: '15px',
      display: 'none'
    });
    
    // Action buttons
    const actionButtons = document.createElement('div');
    this.applyStyles(actionButtons, {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '20px'
    });
    
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancel';
    this.applyStyles(cancelButton, {
      padding: '8px 16px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      cursor: 'pointer'
    });
    
    cancelButton.addEventListener('click', () => {
      this.close();
    });
    
    const validateButton = document.createElement('button');
    validateButton.type = 'button';
    validateButton.textContent = 'Validate';
    this.applyStyles(validateButton, {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginRight: '10px'
    });
    
    validateButton.addEventListener('click', () => {
      this.validateImportData(textArea.value, form.elements.format.value, errorMessage, resultArea);
    });
    
    const importButton = document.createElement('button');
    importButton.type = 'submit';
    importButton.textContent = 'Import Users';
    this.applyStyles(importButton, {
      padding: '8px 16px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    });
    
    // Add buttons to container
    const buttonGroup = document.createElement('div');
    this.applyStyles(buttonGroup, {
      display: 'flex'
    });
    
    buttonGroup.appendChild(validateButton);
    buttonGroup.appendChild(importButton);
    
    actionButtons.appendChild(cancelButton);
    actionButtons.appendChild(buttonGroup);
    
    // Add elements to form
    form.appendChild(textAreaGroup);
    form.appendChild(formatGroup);
    form.appendChild(errorMessage);
    form.appendChild(resultArea);
    form.appendChild(actionButtons);
    
    // Form submission handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // First validate
      const valid = this.validateImportData(
        textArea.value, 
        form.elements.format.value, 
        errorMessage, 
        resultArea
      );
      
      if (!valid) return;
      
      // Disable import button
      importButton.disabled = true;
      importButton.textContent = 'Importing...';
      
      try {
        // Call API to import users
        const result = await importUsers(this.users);
        
        if (result.success) {
          // Show success message
          this.showResultSummary(resultArea, result);
          
          // Update button
          importButton.textContent = 'Close';
          importButton.style.backgroundColor = '#007bff';
          importButton.disabled = false;
          
          // Change import button to close
          importButton.removeEventListener('click', form.onsubmit);
          importButton.addEventListener('click', () => {
            this.close();
            
            // Call success callback
            if (this.options.onSuccess && typeof this.options.onSuccess === 'function') {
              this.options.onSuccess();
            }
          });
          
          // Log import
          logChatEvent('admin', 'Imported users', { 
            count: result.successCount,
            failed: result.failedCount
          });
        } else {
          this.showFormError(errorMessage, result.error || 'Failed to import users');
          
          // Re-enable import button
          importButton.disabled = false;
          importButton.textContent = 'Import Users';
        }
      } catch (error) {
        console.error('[CRM Extension] Error importing users:', error);
        this.showFormError(errorMessage, 'An error occurred while importing users');
        
        // Re-enable import button
        importButton.disabled = false;
        importButton.textContent = 'Import Users';
      }
    });
    
    content.appendChild(instructions);
    content.appendChild(formatInfo);
    content.appendChild(form);
    
    return content;
  }
  
  /**
   * Validate import data
   * @param {string} data - Import data
   * @param {string} format - Data format (json or csv)
   * @param {HTMLElement} errorElement - Error message element
   * @param {HTMLElement} resultElement - Result display element
   * @returns {boolean} Whether data is valid
   */
  validateImportData(data, format, errorElement, resultElement) {
    // Clear previous state
    this.users = [];
    resultElement.style.display = 'none';
    resultElement.innerHTML = '';
    
    // Validate data exists
    if (!data || !data.trim()) {
      this.showFormError(errorElement, 'No data provided');
      return false;
    }
    
    try {
      if (format === 'json') {
        // Parse JSON
        const parsedData = JSON.parse(data);
        
        // Validate it's an array
        if (!Array.isArray(parsedData)) {
          this.showFormError(errorElement, 'Invalid JSON format. Expected an array of user objects.');
          return false;
        }
        
        // Validate each user
        this.users = parsedData;
      } else if (format === 'csv') {
        // Parse CSV
        const lines = data.trim().split('\n');
        if (lines.length < 2) {
          this.showFormError(errorElement, 'Invalid CSV format. Need header row and at least one user row.');
          return false;
        }
        
        // Parse header
        const headers = lines[0].split(',').map(header => header.trim());
        const requiredHeaders = ['username', 'password'];
        
        // Check required headers
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          this.showFormError(errorElement, `Missing required headers: ${missingHeaders.join(', ')}`);
          return false;
        }
        
        // Parse rows
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; // Skip empty lines
          
          const values = line.split(',').map(val => val.trim());
          
          // Create user object
          const user = {};
          headers.forEach((header, index) => {
            if (index < values.length) {
              user[header] = values[index];
            }
          });
          
          this.users.push(user);
        }
      } else {
        this.showFormError(errorElement, 'Invalid format selected');
        return false;
      }
      
      // Validate we have users
      if (this.users.length === 0) {
        this.showFormError(errorElement, 'No valid users found in the data');
        return false;
      }
      
      // Validate each user has required fields
      const invalidUsers = this.users.filter(user => 
        !user.username || !user.password
      );
      
      if (invalidUsers.length > 0) {
        this.showFormError(errorElement, `${invalidUsers.length} users are missing required fields (username, password)`);
        return false;
      }
      
      // Show validation summary
      this.showValidationSummary(resultElement);
      
      return true;
    } catch (error) {
      console.error('[CRM Extension] Error validating import data:', error);
      this.showFormError(errorElement, `Error parsing ${format.toUpperCase()} data: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Show validation summary
   * @param {HTMLElement} resultElement - Result display element
   */
  showValidationSummary(resultElement) {
    resultElement.innerHTML = '';
    resultElement.style.display = 'block';
    
    const title = document.createElement('h4');
    title.textContent = 'Validation Summary';
    this.applyStyles(title, {
      marginTop: '0',
      marginBottom: '10px'
    });
    
    const summary = document.createElement('div');
    summary.innerHTML = `<strong>Users to import:</strong> ${this.users.length}<br>`;
    
    // Count roles
    const roles = this.users.reduce((counts, user) => {
      const role = user.role || 'user';
      counts[role] = (counts[role] || 0) + 1;
      return counts;
    }, {});
    
    const rolesSummary = Object.entries(roles)
      .map(([role, count]) => `${role}: ${count}`)
      .join(', ');
    
    summary.innerHTML += `<strong>Roles:</strong> ${rolesSummary}<br>`;
    
    resultElement.appendChild(title);
    resultElement.appendChild(summary);
  }
  
  /**
   * Show result summary after import
   * @param {HTMLElement} resultElement - Result display element
   * @param {Object} result - Import result
   */
  showResultSummary(resultElement, result) {
    resultElement.innerHTML = '';
    resultElement.style.display = 'block';
    
    const title = document.createElement('h4');
    title.textContent = 'Import Results';
    this.applyStyles(title, {
      marginTop: '0',
      marginBottom: '10px'
    });
    
    const summary = document.createElement('div');
    summary.innerHTML = `<strong>Successfully imported:</strong> ${result.successCount} users<br>`;
    
    if (result.failedCount > 0) {
      summary.innerHTML += `<strong>Failed to import:</strong> ${result.failedCount} users<br><br>`;
      
      if (result.errors && result.errors.length > 0) {
        summary.innerHTML += '<strong>Errors:</strong><br>';
        
        const errorList = document.createElement('ul');
        this.applyStyles(errorList, {
          margin: '5px 0',
          paddingLeft: '20px'
        });
        
        result.errors.forEach(error => {
          const errorItem = document.createElement('li');
          errorItem.textContent = `${error.username || 'Unknown user'}: ${error.error}`;
          errorList.appendChild(errorItem);
        });
        
        summary.appendChild(errorList);
      }
    } else {
      summary.innerHTML += '<strong>Status:</strong> All users were imported successfully!';
    }
    
    resultElement.appendChild(title);
    resultElement.appendChild(summary);
  }
  
  /**
   * Show error message in form
   * @param {HTMLElement} errorElement - Error message element
   * @param {string} message - Error message
   */
  showFormError(errorElement, message) {
    if (!errorElement) return;
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Automatically hide after 5 seconds
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  }
}

export default ImportUsersModal;