Project Prompt: HIPAA-Compliant Local WebSocket Chat for CRM+ Extension
Project Overview
Extend the existing CRM+ browser extension with a HIPAA-compliant chat feature that allows users within the same local network to securely communicate with each other. The system will use a lightweight WebSocket server running on the local network without requiring administrative privileges, ensuring all communications remain within the organization's network.
Technical Requirements
Backend (WebSocket Server)

Create a lightweight Node.js WebSocket server that can run without administrative privileges
Implement user authentication and session management
Include message relay functionality without permanent storage of PHI
Add encryption for all communications
Implement message timestamping and audit logging
Design the server to be portable and easy to run from any machine
Include connection status monitoring and reconnection logic

Extension Integration

Extend the existing CRM+ header interface to include a chat button and notification system
Create a responsive chat UI that can be toggled on/off
Implement secure message sending and receiving via WebSocket
Add real-time presence indicators showing available colleagues
Include support for basic message formatting
Add configurable sound notifications for new messages
Implement client-side message encryption/decryption
Create temporary local storage for chat history with configurable retention periods

HIPAA Compliance Features

Implement end-to-end encryption for all messages
Create thorough audit logging of all chat activities
Include automatic session timeouts after periods of inactivity
Add privacy indicators showing when chat is active
Implement message expiration functionality
Include data minimization features to limit PHI exposure
Add options to purge chat history manually or on schedule

Deliverables

WebSocket Server Module

Complete Node.js WebSocket server code
Documentation for running the server without admin privileges
Configuration options for security settings


Extension Chat Interface

New UI components for the chat feature
Integration with the existing header bar
Responsive design that works across different screen sizes


Security Documentation

Overview of encryption implementation
Audit logging architecture
HIPAA compliance considerations
Security testing results


User Guide

Setup instructions for both server and extension
Usage guidelines compliant with HIPAA requirements
Troubleshooting section for common issues



Technical Constraints

The solution must work without administrative privileges
All communications must stay within the local network
No patient data should be stored permanently
The implementation must work with the existing extension architecture
The solution should function in Chrome, Edge, and Firefox browsers
Performance impact on the main extension functionality should be minimal

Development Phases

Phase 1: Core Architecture

Design system architecture
Implement basic WebSocket server
Create initial extension chat interface


Phase 2: Security Implementation

Add encryption/decryption functionality
Implement authentication system
Create audit logging


Phase 3: UI Refinement

Enhance chat interface
Add notifications and presence indicators
Implement user experience improvements


Phase 4: Testing & Documentation

Test in various network environments
Create comprehensive documentation
Verify HIPAA compliance measures



Success Criteria

Users can securely communicate with other users on the same network
All communications are encrypted end-to-end
No PHI is stored permanently or transmitted outside the local network
The solution can run without administrative privileges
The chat interface integrates seamlessly with the existing extension UI
Full audit logging is available for compliance purposes
The system handles network interruptions and reconnections gracefully

This project will enhance the CRM+ extension with secure communication capabilities while maintaining HIPAA compliance and working within the constraints of limited administrative privileges.