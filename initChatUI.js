// chat/initChatUI.js
import AppContainer from './components/app/AppContainer.js';
import { logChatEvent } from './utils/logger.js';

// Reference to the AppContainer instance
let chatAppInstance = null;

/**
 * Initialize the Chat UI
 * Creates a container for the chat UI and initializes the AppContainer
 */
export function initChatUI() {
  try {
    // Check if chat UI already exists
    if (document.getElementById('hipaa-chat-container')) {
      console.log('[CRM Extension] Chat UI already initialized');
      return true;
    }
    
    console.log('[CRM Extension] Initializing Chat UI');
    
    // Create a container element for the chat application
    const chatContainer = document.createElement('div');
    chatContainer.id = 'hipaa-chat-container';
    
    // Apply styles to position it correctly
    Object.assign(chatContainer.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      height: '500px',
      backgroundColor: '#f0f8ff', // Light blue background to make it more visible
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)', // Stronger shadow
      zIndex: '10000', // Higher z-index to ensure it's on top
      overflow: 'hidden',
      border: '2px solid #2196F3', // Blue border to make it more visible
      display: 'none' // Start hidden
    });
    
    // Add the container to the document body
    document.body.appendChild(chatContainer);
    
    // Initialize the AppContainer with the container
    chatAppInstance = new AppContainer(chatContainer);
    
    // Override the toggleChatVisibility method to ensure it works
    // Define this global function to be used by the chat button
    window.toggleChatUI = function() {
      console.log('[CRM Extension] toggleChatUI called');
      
      // Get the chat container directly
      const container = document.getElementById('hipaa-chat-container');
      if (!container) {
        console.error('[CRM Extension] Chat container not found');
        return;
      }
      
      // Toggle the display directly
      const isCurrentlyVisible = container.style.display !== 'none';
      container.style.display = isCurrentlyVisible ? 'none' : 'flex';
      
      console.log(`[CRM Extension] Chat container toggled to: ${container.style.display}`);
      
      // If we're showing the container and we have AppContainer instance,
      // make sure its render method is called for good measure
      if (!isCurrentlyVisible && chatAppInstance) {
        try {
          chatAppInstance.render();
        } catch (error) {
          console.error('[CRM Extension] Error rendering chat app:', error);
        }
      }
    };
    
    // Log initialization
    logChatEvent('system', 'Chat UI initialized');
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error initializing Chat UI:', error);
    return false;
  }
}

// Function to directly show the chat UI
export function showChatUI() {
  const container = document.getElementById('hipaa-chat-container');
  if (container) {
    container.style.display = 'flex';
    console.log('[CRM Extension] Chat UI shown directly');
    
    // Render the app if needed
    if (chatAppInstance) {
      try {
        chatAppInstance.render();
      } catch (error) {
        console.error('[CRM Extension] Error rendering chat app:', error);
      }
    }
    
    return true;
  } else {
    console.error('[CRM Extension] Chat container not found when trying to show');
    return false;
  }
}

// Function to directly hide the chat UI
export function hideChatUI() {
  const container = document.getElementById('hipaa-chat-container');
  if (container) {
    container.style.display = 'none';
    console.log('[CRM Extension] Chat UI hidden directly');
    return true;
  } else {
    console.error('[CRM Extension] Chat container not found when trying to hide');
    return false;
  }
}

/**
 * Destroy the Chat UI
 */
export function destroyChatUI() {
  try {
    if (chatAppInstance) {
      chatAppInstance.destroy();
      chatAppInstance = null;
    }
    
    const chatContainer = document.getElementById('hipaa-chat-container');
    if (chatContainer && chatContainer.parentNode) {
      chatContainer.parentNode.removeChild(chatContainer);
    }
    
    // Log destruction
    logChatEvent('system', 'Chat UI destroyed');
    
    return true;
  } catch (error) {
    console.error('[CRM Extension] Error destroying Chat UI:', error);
    return false;
  }
}