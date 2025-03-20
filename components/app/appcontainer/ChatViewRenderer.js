// chat/components/app/appcontainer/ChatViewRenderer.js
// Handles rendering of the chat view component

import MessageInput from '../../messages/MessageInput.js';
import { getChannelMessages } from '../../../utils/storage.js';

/**
 * Render the chat view
 * @param {HTMLElement} container - Container to render into
 * @param {Object} options - Rendering options
 * @returns {HTMLElement} The rendered chat view
 */
export function renderChatView(container, options = {}) {
  const {
    showUserList = true,
    selectedChannel = 'general',
    mockChannels = [],
    mockUsers = [],
    onChannelSelect = () => {},
    onUserSelect = () => {},
    toggleUserList = () => {}
  } = options;

  // Create layout with a flexible 3-panel design
  const layout = document.createElement('div');
  applyStyles(layout, {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff'
  });
  
  // Create sidebar for channels
  const sidebar = createSidebar(mockChannels, selectedChannel, onChannelSelect);
  
  // Create main content area for chat
  const chatArea = createChatArea(selectedChannel, mockChannels, toggleUserList, mockUsers);
  
  // Create collapsible users panel
  const userPanel = createUserPanel(mockUsers, onUserSelect);
  
  // Apply more compact sizing to each panel
  applyStyles(sidebar, {
    flex: '0 0 180px',  // More compact fixed width
    minWidth: '160px',  // Smaller minimum width
    maxWidth: '180px'   // Smaller maximum width
  });
  
  applyStyles(chatArea, {
    flex: '1 1 auto',   // Grow and shrink as needed
    minWidth: '250px'   // Smaller minimum width
  });
  
  if (showUserList) {
    applyStyles(userPanel, {
      flex: '0 0 200px',  // More compact fixed width
      minWidth: '180px',  // Smaller minimum width
      maxWidth: '200px'   // Smaller maximum width
    });
  }
  
  // Add all panels to layout
  layout.appendChild(sidebar);
  layout.appendChild(chatArea);
  
  if (showUserList) {
    layout.appendChild(userPanel);
  }
  
  container.appendChild(layout);
  return layout;
}

/**
 * Create sidebar with channels
 * @param {Array} channels - Channel list
 * @param {string} selectedChannel - ID of selected channel
 * @param {Function} onChannelSelect - Channel selection callback
 * @returns {HTMLElement} Sidebar element
 */
function createSidebar(channels, selectedChannel, onChannelSelect) {
  const sidebar = document.createElement('div');
  applyStyles(sidebar, {
    height: '100%',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa',
    overflow: 'hidden' // Prevent overflow
  });
  
  // Sidebar header - more compact
  const sidebarHeader = document.createElement('div');
  applyStyles(sidebarHeader, {
    padding: '10px 12px', // Reduced padding
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  });
  
  const headingText = document.createElement('h2');
  headingText.textContent = 'Channels';
  applyStyles(headingText, {
    margin: '0',
    fontSize: '16px', // Smaller font
    fontWeight: 'bold'
  });
  
  // Channel count badge
  const channelCount = document.createElement('span');
  channelCount.textContent = channels.length.toString();
  applyStyles(channelCount, {
    backgroundColor: '#e0e0e0',
    color: '#333',
    borderRadius: '12px',
    padding: '1px 6px', // Smaller padding
    fontSize: '11px', // Smaller font
    fontWeight: 'bold'
  });
  
  sidebarHeader.appendChild(headingText);
  sidebarHeader.appendChild(channelCount);
  
  // Channels container
  const channelsContainer = document.createElement('div');
  applyStyles(channelsContainer, {
    flex: '1',
    overflowY: 'auto',
    padding: '4px 0' // Reduced padding
  });
  
  // Group channels by type
  const publicChannels = channels.filter(channel => channel.type === 'public');
  const privateChannels = channels.filter(channel => channel.type === 'private');
  
  // Add public channels
  if (publicChannels.length > 0) {
    addChannelGroup(channelsContainer, 'PUBLIC CHANNELS', publicChannels, selectedChannel, onChannelSelect);
  }
  
  // Add private channels
  if (privateChannels.length > 0) {
    addChannelGroup(channelsContainer, 'PRIVATE CHANNELS', privateChannels, selectedChannel, onChannelSelect);
  }
  
  // Add new channel button - more compact
  const newChannelButton = document.createElement('button');
  applyStyles(newChannelButton, {
    margin: '8px', // Reduced margin
    padding: '6px 0', // Reduced padding
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px', // Smaller font
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px', // Reduced gap
    fontWeight: 'bold'
  });
  
  const plusIcon = document.createElement('span');
  plusIcon.textContent = '+';
  applyStyles(plusIcon, {
    fontSize: '16px' // Smaller font
  });
  
  const buttonText = document.createElement('span');
  buttonText.textContent = 'New Channel';
  
  newChannelButton.appendChild(plusIcon);
  newChannelButton.appendChild(buttonText);
  
  // Add hover effect
  newChannelButton.addEventListener('mouseover', () => {
    newChannelButton.style.backgroundColor = '#1976D2';
  });
  
  newChannelButton.addEventListener('mouseout', () => {
    newChannelButton.style.backgroundColor = '#2196F3';
  });
  
  // Add components to sidebar
  sidebar.appendChild(sidebarHeader);
  sidebar.appendChild(channelsContainer);
  sidebar.appendChild(newChannelButton);
  
  return sidebar;
}

/**
 * Add a channel group to the sidebar
 * @param {HTMLElement} container - Channels container
 * @param {string} title - Group title
 * @param {Array} channels - Channel list
 * @param {string} selectedChannel - Selected channel ID
 * @param {Function} onChannelSelect - Channel selection callback
 */
function addChannelGroup(container, title, channels, selectedChannel, onChannelSelect) {
  // Create group header
  const groupHeader = document.createElement('div');
  applyStyles(groupHeader, {
    padding: '8px 12px 4px', // More compact padding
    fontSize: '10px', // Smaller font
    color: '#666',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  });
  groupHeader.textContent = title;
  
  // Create channel list
  const channelList = document.createElement('div');
  applyStyles(channelList, {
    marginBottom: '10px' // Reduced margin
  });
  
  // Add channels
  channels.forEach(channel => {
    const channelItem = createChannelItem(channel, channel.id === selectedChannel, onChannelSelect);
    channelList.appendChild(channelItem);
  });
  
  // Add to container
  container.appendChild(groupHeader);
  container.appendChild(channelList);
}

/**
 * Create a channel item
 * @param {Object} channel - Channel data
 * @param {boolean} isActive - Whether channel is active
 * @param {Function} onChannelSelect - Channel selection callback
 * @returns {HTMLElement} Channel item element
 */
function createChannelItem(channel, isActive, onChannelSelect) {
  const item = document.createElement('div');
  applyStyles(item, {
    padding: '6px 12px 6px 10px', // More compact padding
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '13px', // Smaller font
    color: isActive ? '#2196F3' : '#333',
    backgroundColor: isActive ? 'rgba(33, 150, 243, 0.08)' : 'transparent',
    borderLeft: isActive ? '3px solid #2196F3' : '3px solid transparent' // Thinner border
  });
  
  // Globe icon for channel type
  const icon = document.createElement('span');
  icon.textContent = channel.type === 'public' ? '🌐' : '🔒';
  applyStyles(icon, {
    marginRight: '8px', // Reduced margin
    fontSize: '14px', // Smaller font
    opacity: '0.7'
  });
  
  // Channel name
  const name = document.createElement('span');
  name.textContent = channel.name;
  applyStyles(name, {
    flex: '1',
    fontWeight: isActive ? 'bold' : 'normal',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  });
  
  // Unread indicator
  if (channel.unread && channel.unread > 0) {
    const badge = document.createElement('span');
    badge.textContent = channel.unread > 99 ? '99+' : channel.unread;
    applyStyles(badge, {
      minWidth: '18px', // Smaller badge
      height: '18px', // Smaller badge
      backgroundColor: isActive ? '#2196F3' : '#f44336',
      color: 'white',
      borderRadius: '9px',
      fontSize: '11px', // Smaller font
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 4px' // Reduced padding
    });
    
    item.appendChild(badge);
  }
  
  // Add components to item
  item.appendChild(icon);
  item.appendChild(name);
  
  // Add event listener for channel selection
  item.addEventListener('click', () => {
    onChannelSelect(channel);
  });
  
  // Add hover effect
  item.addEventListener('mouseover', () => {
    if (!isActive) {
      item.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
    }
  });
  
  item.addEventListener('mouseout', () => {
    if (!isActive) {
      item.style.backgroundColor = 'transparent';
    }
  });
  
  return item;
}

/**
 * Create the main chat area
 * @param {string} selectedChannel - ID of selected channel
 * @param {Array} channels - Channel list
 * @param {Function} toggleUserList - Toggle user list callback
 * @param {Array} mockUsers - List of mock users
 * @returns {HTMLElement} Chat area element
 */
function createChatArea(selectedChannel, channels, toggleUserList, mockUsers) {
  const chatArea = document.createElement('div');
  applyStyles(chatArea, {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    width: '100%' // FIXED: Ensure the chat area takes full width
  });
  
  // Get channel info
  const channel = channels.find(c => c.id === selectedChannel) || { 
    id: 'general', 
    name: 'General', 
    type: 'public' 
  };
  
  // Chat header with channel info
  const chatHeader = createChatHeader(channel, toggleUserList);
  
  // Messages container
  const messagesContainer = createMessagesContainer(channel);
  
  // Chat input area container
  const inputContainer = document.createElement('div');
  applyStyles(inputContainer, {
    width: '100%' // FIXED: Ensure input takes full width
  });
  
  // Create MessageInput component
  const messageInput = new MessageInput(inputContainer, {
    channelId: channel.id,
    placeholder: `Message #${channel.name}`,
    maxLength: 2000
  });
  
  // Add components to chat area
  chatArea.appendChild(chatHeader);
  chatArea.appendChild(messagesContainer);
  chatArea.appendChild(inputContainer);
  
  return chatArea;
}

/**
 * Create chat header with channel info
 * @param {Object} channel - Channel object
 * @param {Function} toggleUserList - Toggle user list callback
 * @returns {HTMLElement} Chat header element
 */
function createChatHeader(channel, toggleUserList) {
  const header = document.createElement('div');
  applyStyles(header, {
    padding: '10px 12px', // Reduced padding
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    width: '100%'
  });
  
  // Channel info
  const channelInfo = document.createElement('div');
  applyStyles(channelInfo, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px' // Reduced gap
  });
  
  // Channel icon
  const channelIcon = document.createElement('span');
  channelIcon.textContent = channel.type === 'public' ? '🌐' : '🔒';
  applyStyles(channelIcon, {
    fontSize: '16px' // Smaller font
  });
  
  // Channel name
  const channelName = document.createElement('div');
  channelName.textContent = channel.name;
  applyStyles(channelName, {
    fontSize: '16px', // Smaller font
    fontWeight: 'bold'
  });
  
  // Channel type badge
  const channelType = document.createElement('span');
  channelType.textContent = channel.type === 'public' ? 'Public' : 'Private';
  applyStyles(channelType, {
    fontSize: '10px', // Smaller font
    padding: '2px 8px', // Reduced padding
    borderRadius: '10px',
    backgroundColor: channel.type === 'public' ? '#e3f2fd' : '#fff3e0',
    color: channel.type === 'public' ? '#1565c0' : '#e65100'
  });
  
  channelInfo.appendChild(channelIcon);
  channelInfo.appendChild(channelName);
  channelInfo.appendChild(channelType);
  
  // Actions area
  const actions = document.createElement('div');
  applyStyles(actions, {
    display: 'flex',
    gap: '8px' // Reduced gap
  });
  
  // Search button
  const searchButton = createIconButton('🔍', 'Search in channel');
  
  // Toggle users button
  const toggleUsersButton = createIconButton('👥', 'Toggle team members');
  toggleUsersButton.addEventListener('click', toggleUserList);
  
  // Add buttons to actions
  actions.appendChild(searchButton);
  actions.appendChild(toggleUsersButton);
  
  // Add components to header
  header.appendChild(channelInfo);
  header.appendChild(actions);
  
  return header;
}

/**
 * Create an icon button 
 * @param {string} icon - Icon text
 * @param {string} title - Button title
 * @returns {HTMLElement} Button element
 */
function createIconButton(icon, title) {
  const button = document.createElement('button');
  button.textContent = icon;
  button.title = title;
  applyStyles(button, {
    width: '28px', // Smaller size
    height: '28px', // Smaller size
    borderRadius: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px', // Smaller font
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });

  // Add hover effect
  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = '#f5f5f5';
  });

  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = 'transparent';
  });

  return button;
}

/**
 * Create the messages container for the chat area
 * @param {Object} channel - Channel object
 * @returns {HTMLElement} Messages container element
 */
function createMessagesContainer(channel) {
  const container = document.createElement('div');
  applyStyles(container, {
    flex: '1',
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%', // FIXED: Ensure container takes full width
    minHeight: '200px' // FIXED: Ensure minimum height
  });

  // Placeholder message
  const placeholderMessage = document.createElement('div');
  applyStyles(placeholderMessage, {
    margin: 'auto',
    textAlign: 'center',
    color: '#666',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    maxWidth: '80%'
  });
  
  const placeholderIcon = document.createElement('div');
  placeholderIcon.textContent = '💬';
  applyStyles(placeholderIcon, {
    fontSize: '48px',
    marginBottom: '12px'
  });
  
  const placeholderTitle = document.createElement('div');
  placeholderTitle.textContent = `Welcome to #${channel.name}`;
  applyStyles(placeholderTitle, {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px'
  });
  
  const placeholderText = document.createElement('div');
  placeholderText.textContent = 'This is the start of your conversation. Messages are encrypted and will expire after 24 hours.';
  applyStyles(placeholderText, {
    fontSize: '14px'
  });
  
  placeholderMessage.appendChild(placeholderIcon);
  placeholderMessage.appendChild(placeholderTitle);
  placeholderMessage.appendChild(placeholderText);
  
  container.appendChild(placeholderMessage);

  return container;
}

/**
 * Create the user panel (team members)
 * @param {Array} users - Users list
 * @param {Function} onUserSelect - User selection callback
 * @returns {HTMLElement} User panel element
 */
function createUserPanel(users, onUserSelect) {
  const panel = document.createElement('div');
  applyStyles(panel, {
    height: '100%',
    borderLeft: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa'
  });

  // Panel header - more compact
  const panelHeader = document.createElement('div');
  applyStyles(panelHeader, {
    padding: '10px 12px', // Reduced padding
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  });
  
  const heading = document.createElement('h2');
  heading.textContent = 'Team Members';
  applyStyles(heading, {
    margin: '0',
    fontSize: '16px', // Smaller font
    fontWeight: 'bold'
  });
  
  // User count badge
  const userCount = document.createElement('span');
  userCount.textContent = users.length.toString();
  applyStyles(userCount, {
    backgroundColor: '#e0e0e0',
    color: '#333',
    borderRadius: '12px',
    padding: '1px 6px', // Smaller padding
    fontSize: '11px', // Smaller font
    fontWeight: 'bold'
  });
  
  panelHeader.appendChild(heading);
  panelHeader.appendChild(userCount);

  // Search box - more compact
  const searchBox = document.createElement('div');
  applyStyles(searchBox, {
    padding: '8px 12px', // Reduced padding
    borderBottom: '1px solid #e0e0e0'
  });

  const searchContainer = document.createElement('div');
  applyStyles(searchContainer, {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: '16px', // Smaller radius
    border: '1px solid #ddd',
    padding: '0 10px' // Reduced padding
  });
  
  const searchIcon = document.createElement('span');
  searchIcon.textContent = '🔍';
  applyStyles(searchIcon, {
    fontSize: '12px', // Smaller font
    color: '#666',
    marginRight: '6px' // Reduced margin
  });

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search users...';
  applyStyles(searchInput, {
    width: '100%',
    padding: '6px 0', // Reduced padding
    border: 'none',
    borderRadius: '16px',
    fontSize: '13px', // Smaller font
    outline: 'none'
  });

  searchContainer.appendChild(searchIcon);
  searchContainer.appendChild(searchInput);
  searchBox.appendChild(searchContainer);

  // Users container
  const usersContainer = document.createElement('div');
  applyStyles(usersContainer, {
    flex: '1',
    overflowY: 'auto',
    padding: '4px 0' // Reduced padding
  });

  // Group users by status
  const onlineUsers = users.filter(user => user.status === 'online');
  const awayUsers = users.filter(user => user.status === 'away');
  const dndUsers = users.filter(user => user.status === 'dnd');
  const offlineUsers = users.filter(user => user.status === 'offline' || !user.status);

  // Add user groups
  if (onlineUsers.length > 0) {
    addUserGroup(usersContainer, 'Online', onlineUsers, onUserSelect);
  }
  
  if (awayUsers.length > 0) {
    addUserGroup(usersContainer, 'Away', awayUsers, onUserSelect);
  }
  
  if (dndUsers.length > 0) {
    addUserGroup(usersContainer, 'Do Not Disturb', dndUsers, onUserSelect);
  }
  
  if (offlineUsers.length > 0) {
    addUserGroup(usersContainer, 'Offline', offlineUsers, onUserSelect);
  }

  // Add components to panel
  panel.appendChild(panelHeader);
  panel.appendChild(searchBox);
  panel.appendChild(usersContainer);

  return panel;
}

/**
 * Add a user group to the users panel
 * @param {HTMLElement} container - Users container
 * @param {string} title - Group title
 * @param {Array} users - User list
 * @param {Function} onUserSelect - User selection callback
 */
function addUserGroup(container, title, users, onUserSelect) {
  // Create group header - more compact
  const groupHeader = document.createElement('div');
  applyStyles(groupHeader, {
    padding: '8px 12px 4px', // Reduced padding
    fontSize: '10px', // Smaller font
    color: '#666',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  });
  groupHeader.textContent = `${title} — ${users.length}`;
  
  // Create user list
  const userList = document.createElement('div');
  applyStyles(userList, {
    marginBottom: '10px' // Reduced margin
  });
  
  // Add users
  users.forEach(user => {
    const userItem = createUserItem(user, user.status === 'online', onUserSelect);
    userList.appendChild(userItem);
  });
  
  // Add to container
  container.appendChild(groupHeader);
  container.appendChild(userList);
}

/**
 * Create a user item
 * @param {Object} user - User data
 * @param {boolean} isOnline - Whether user is online
 * @param {Function} onUserSelect - User selection callback
 * @returns {HTMLElement} User item element
 */
function createUserItem(user, isOnline, onUserSelect) {
  const item = document.createElement('div');
  applyStyles(item, {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px', // Reduced padding
    cursor: 'pointer',
    opacity: isOnline ? '1' : '0.7'
  });
  
  // Status indicator
  const statusIndicator = document.createElement('div');
  applyStyles(statusIndicator, {
    width: '6px', // Smaller size
    height: '6px', // Smaller size
    borderRadius: '50%',
    marginRight: '8px' // Reduced margin
  });
  
  // Set status color
  if (user.status === 'online') {
    statusIndicator.style.backgroundColor = '#4CAF50'; // Green
  } else if (user.status === 'away') {
    statusIndicator.style.backgroundColor = '#FFC107'; // Yellow
  } else if (user.status === 'dnd') {
    statusIndicator.style.backgroundColor = '#F44336'; // Red
  } else {
    statusIndicator.style.backgroundColor = '#9E9E9E'; // Gray
  }
  
  // Avatar - smaller
  const avatar = document.createElement('div');
  
  // Get first letter of display name or username
  const initial = (user.displayName || user.username).charAt(0).toUpperCase();
  avatar.textContent = initial;
  
  // Generate color based on username
  const hue = generateColorFromString(user.username);
  const bgColor = `hsl(${hue}, 70%, 80%)`;
  const textColor = `hsl(${hue}, 70%, 30%)`;
  
  applyStyles(avatar, {
    width: '28px', // Smaller size
    height: '28px', // Smaller size
    borderRadius: '50%',
    backgroundColor: bgColor,
    color: textColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px', // Smaller font
    marginRight: '8px' // Reduced margin
  });
  
  // User info
  const userInfo = document.createElement('div');
  applyStyles(userInfo, {
    flex: '1'
  });
  
  // Username/display name
  const displayName = document.createElement('div');
  displayName.textContent = user.displayName || user.username;
  applyStyles(displayName, {
    fontWeight: 'medium',
    fontSize: '13px' // Smaller font
  });
  
  // Role badge for admin/moderator - smaller
  if (user.role === 'admin' || user.role === 'moderator') {
    const roleBadge = document.createElement('span');
    roleBadge.textContent = user.role;
    applyStyles(roleBadge, {
      fontSize: '9px', // Smaller font
      backgroundColor: user.role === 'admin' ? '#f44336' : '#2196F3',
      color: 'white',
      padding: '1px 4px', // Reduced padding
      borderRadius: '8px', // Smaller radius
      marginLeft: '4px', // Reduced margin
      textTransform: 'uppercase',
      fontWeight: 'bold'
    });
    
    displayName.appendChild(roleBadge);
  }
  
  // Status text if available
  if (user.statusMessage) {
    const statusText = document.createElement('div');
    statusText.textContent = user.statusMessage;
    applyStyles(statusText, {
      fontSize: '11px', // Smaller font
      color: '#666',
      marginTop: '1px' // Reduced margin
    });
    
    userInfo.appendChild(statusText);
  }
  
  userInfo.appendChild(displayName);
  
  // Message icon button for direct messaging - smaller
  const messageButton = document.createElement('button');
  messageButton.innerHTML = '💬';
  messageButton.title = 'Message';
  applyStyles(messageButton, {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px', // Smaller font
    padding: '2px', // Reduced padding
    borderRadius: '4px'
  });
  
  // Add hover effect for message button
  messageButton.addEventListener('mouseover', () => {
    messageButton.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
  });
  
  messageButton.addEventListener('mouseout', () => {
    messageButton.style.backgroundColor = 'transparent';
  });
  
  // Add event listeners
  messageButton.addEventListener('click', (e) => {
    e.stopPropagation();
    onUserSelect(user);
  });
  
  item.addEventListener('click', () => {
    onUserSelect(user);
  });
  
  // Add hover effect for item
  item.addEventListener('mouseover', () => {
    item.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
  });
  
  item.addEventListener('mouseout', () => {
    item.style.backgroundColor = 'transparent';
  });
  
  // Add components to item
  item.appendChild(statusIndicator);
  item.appendChild(avatar);
  item.appendChild(userInfo);
  item.appendChild(messageButton);
  
  return item;
}

/**
 * Generate a color hue from a string
 * @param {string} str - Input string
 * @returns {number} Hue value (0-360)
 */
function generateColorFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash % 360;
}

/**
 * Apply CSS styles to an element
 * @param {HTMLElement} element - Element to style
 * @param {Object} styles - Styles to apply
 */
function applyStyles(element, styles) {
  Object.assign(element.style, styles);
}

export default { renderChatView };