import { io } from 'socket.io-client';

const RECEIVE_MESSAGE_EVENT = 'receiveMessage';
const MESSAGE_DELETED_EVENT = 'message-deleted';
const MESSAGE_REACTION_EVENT = 'message:reaction';

// todo: this.socket.emit is like a UDP
// wrapped in promise means it will wait for the response and ensure TCP (or catch any errors)
const SOCKET_URL = import.meta.env.VITE_BACKEND_BASE_URL;

// Singleton instance
let instance = null;

class SocketService {
  constructor() {
    if (!instance) {
      instance = this;
      this.socket = null;
      this.messageHandlers = new Set();
      this.messageDeletedHandlers = new Set();
      this.messageReadUpdatedHandlers = new Set();
      this.reactionHandlers = new Set();
      this.connectionState = {
        isConnected: false,
        isConnecting: false,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        reconnectDelay: 1000,
        eventListeners: new Map()
      };
    }
    return instance;
  }

  sendReaction(reactionData) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('message:react', reactionData);
    } else {
      console.error('Socket not connected, cannot send reaction.');
    }
  }

  // Add a method to safely add and track event listeners
  _addEventListener(event, handler) {
    if (!this.socket) return () => {};
    
    // Store the handler reference for later cleanup
    if (!this.connectionState.eventListeners.has(event)) {
      this.connectionState.eventListeners.set(event, new Set());
    }
    this.connectionState.eventListeners.get(event).add(handler);
    
    // Add the actual event listener
    this.socket.on(event, handler);
    
    // Return cleanup function
    return () => this._removeEventListener(event, handler);
  }

  // Add handler for message saved event
  onMessageSaved(handler) {
    if (this.socket) {
      const wrappedCallback = (data) => {
        console.log('💾 Message saved event received:', data);
        handler(data);
      };
      this.messageHandlers.add(wrappedCallback);
      this.socket.on('message-saved', wrappedCallback);
      return () => this.offMessageSaved(wrappedCallback);
    }
    return () => {};
  }

  // Save message request
  saveMessageRequest(messageId) {
    console.log('Sending save-message request for message:', messageId);
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        const error = new Error('Socket not initialized');
        console.error('Socket not initialized');
        reject(error);
        return;
      }
      
      if (!this.socket.connected) {
        const error = new Error('Socket not connected');
        console.error('Socket not connected, connection state:', this.socket.disconnected ? 'disconnected' : 'connecting');
        reject(error);
        return;
      }
      
      console.log('Emitting save-message event with messageId:', messageId);
      
      // Add a timeout for the socket response
      const timeout = setTimeout(() => {
        const error = new Error('Save message request timed out');
        console.error('Save message request timed out');
        reject(error);
      }, 5000); // 5 second timeout
      
      this.socket.emit('save-message', { messageId }, (response) => {
        clearTimeout(timeout);
        
        if (!response) {
          const error = new Error('Empty response from server');
          console.error('Empty response from server for save-message');
          reject(error);
          return;
        }
        
        if (response.error) {
          console.error('Server returned error for save-message:', response.error);
          reject(new Error(response.error));
          return;
        }
        
        console.log('Save message successful, response:', response);
        resolve(response);
      });
    });
  }

  offMessageSaved(callback) {
    if (this.socket) {
      this.messageHandlers.delete(callback);
      this.socket.off('message-saved', callback);
    }
  }
  
  // Helper method to remove a specific event listener
  _removeEventListener(event, handler) {
    if (!this.socket || !this.connectionState.eventListeners.has(event)) return;
    
    const handlers = this.connectionState.eventListeners.get(event);
    if (handlers.has(handler)) {
      this.socket.off(event, handler);
      handlers.delete(handler);
    }
  }
  
  // Clear all event listeners
  _clearAllEventListeners() {
    if (!this.socket) return;
    
    for (const [event, handlers] of this.connectionState.eventListeners.entries()) {
      for (const handler of handlers) {
        this.socket.off(event, handler);
      }
    }
    this.connectionState.eventListeners.clear();
  }

  connect(callback, onConnectError, onDisconnect, onError) {
    // If already connected, just call the callback
    if (this.connectionState.isConnected) {
      console.log('🔌 Socket already connected, reusing connection');
      if (callback) callback();
      return () => {
        // Clean up only the specific callbacks that were passed in
        if (callback) this.socket?.off('connect', callback);
        if (onConnectError) this.socket?.off('connect_error', onConnectError);
        if (onDisconnect) this.socket?.off('disconnect', onDisconnect);
        if (onError) this.socket?.off('error', onError);
      };
    }
    
    // If already in the process of connecting, just add to the callback queue
    if (this.connectionState.isConnecting) {
      console.log('🔌 Socket connection in progress, queuing callbacks');
      // Store callbacks to be called once connected
      const connectListener = () => {
        if (callback) callback();
        this.socket?.off('connect', connectListener);
      };
      
      if (callback) this.socket?.on('connect', connectListener);
      if (onConnectError) this.socket?.on('connect_error', onConnectError);
      if (onDisconnect) this.socket?.on('disconnect', onDisconnect);
      if (onError) this.socket?.on('error', onError);
      
      return () => {
        // Clean up the specific callbacks we just added
        if (callback) this.socket?.off('connect', connectListener);
        if (onConnectError) this.socket?.off('connect_error', onConnectError);
        if (onDisconnect) this.socket?.off('disconnect', onDisconnect);
        if (onError) this.socket?.off('error', onError);
      };
    }
    
    console.log('🔌 Attempting to connect to socket endpoint:', SOCKET_URL);
    console.log('Environment:', import.meta.env.MODE);
    
    this.connectionState.isConnecting = true;
    this.connectionState.reconnectAttempts = 0;
    
    try {
      const options = {
        path: '/api/socket.io',
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket', 'polling'],
        withCredentials: true,
        secure: window.location.protocol === 'https:',
        rejectUnauthorized: import.meta.env.PROD,
      };
      
      console.log('🔌 Socket connection options:', options);
      
      // If we have an existing socket, clean it up first
      if (this.socket) {
        this._clearAllEventListeners();
        this.socket.disconnect();
        this.socket = null;
      }
      
      this.socket = io(SOCKET_URL, options);

      // Connection status handlers
      const onConnect = () => {
        console.log('✅ Socket connected successfully', {
          socketId: this.socket.id,
          endpoint: SOCKET_URL,
          connected: this.socket.connected,
          disconnected: this.socket.disconnected
        });
        
        this.connectionState.isConnected = true;
        this.connectionState.isConnecting = false;
        this.connectionState.reconnectAttempts = 0;
        
        if (callback) callback();
      };
      
      const connectErrorHandler = (error) => {
        console.error('❌ Socket connection error:', {
          message: error.message,
          description: error.description,
          context: error.context,
          type: error.type,
          endpoint: SOCKET_URL,
          timestamp: new Date().toISOString(),
          environment: import.meta.env.MODE,
          connected: this.socket?.connected || false
        });
        
        this.connectionState.isConnecting = false;
        
        if (error.message === 'Authentication error') {
          console.log('Authentication failed, redirecting to login...');
          // navigate('/login');
        }
        
        if (onConnectError) onConnectError(error);
      };
      
      const onDisconnectHandler = (reason) => {
        console.warn('ℹ️ Socket disconnected:', {
          reason,
          endpoint: SOCKET_URL,
          timestamp: new Date().toISOString(),
          wasConnected: this.connectionState.isConnected
        });
        
        const wasConnected = this.connectionState.isConnected;
        this.connectionState.isConnected = false;
        this.connectionState.isConnecting = false;
        
        if (onDisconnect) onDisconnect(reason);
        
        // Only attempt to reconnect if we were previously connected
        if (wasConnected && reason === 'io server disconnect') {
          this.connectionState.reconnectAttempts++;
          
          if (this.connectionState.reconnectAttempts <= this.connectionState.maxReconnectAttempts) {
            const delay = Math.min(
              this.connectionState.reconnectDelay * Math.pow(2, this.connectionState.reconnectAttempts - 1),
              this.connectionState.reconnectDelay * 10 // Max 10x the base delay
            );
            
            console.log(`⏳ Attempting to reconnect (${this.connectionState.reconnectAttempts}/${this.connectionState.maxReconnectAttempts}) in ${delay}ms...`);
            
            setTimeout(() => {
              if (!this.connectionState.isConnected && !this.connectionState.isConnecting) {
                this.connect(callback, onConnectError, onDisconnect, onError);
              }
            }, delay);
          } else {
            console.error('❌ Max reconnection attempts reached, giving up');
          }
        }
      };
      
      // Set up event listeners
      this._addEventListener('connect', onConnect);
      this._addEventListener('connect_error', connectErrorHandler);
      this._addEventListener('disconnect', onDisconnectHandler);

      // Handle socket.io manager events
      const onReconnectAttempt = (attempt) => {
        console.log(`🔄 Reconnection attempt ${attempt} for ${SOCKET_URL}`);
        this.connectionState.isConnecting = true;
      };
      
      const onReconnectFailed = () => {
        console.error('❌ All reconnection attempts failed');
        this.connectionState.isConnecting = false;
      };
      
      const errorHandler = (error) => {
        console.error('❌ Socket error:', {
          message: error.message,
          code: error.code,
          context: error.context,
          endpoint: SOCKET_URL,
          timestamp: new Date().toISOString()
        });
        if (onError) onError(error);
      };
      
      // Set up socket.io manager event listeners
      if (this.socket.io) {
        this.socket.io.on('reconnect_attempt', onReconnectAttempt);
        this.socket.io.on('reconnect_failed', onReconnectFailed);
        this._addEventListener('error', errorHandler);
      }
    } catch (error) {
      console.error('❌ Failed to initialize socket connection:', {
        message: error.message,
        stack: error.stack,
        endpoint: SOCKET_URL,
        timestamp: new Date().toISOString()
      });
    }
  }

  joinRoom(userId) {
    if (this.socket) {
      this.socket.emit('joinRooms', userId);
    }
  }

  // Message handling
  onMessage(callback) {
    if (!this.socket) {
      console.warn('Socket not connected, message handler not registered');
      return () => {};
    }
    
    const wrappedCallback = (data) => {
      if (!this.connectionState.isConnected) {
        console.warn('Received message but socket is not connected, ignoring');
        return;
      }
      
      try {
        console.log('📨 New message received:', data);
        callback(data);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    };
    
    this.messageHandlers.add(wrappedCallback);
    return this._addEventListener(RECEIVE_MESSAGE_EVENT, wrappedCallback);
  }
  onReaction(callback) {
    if (!this.socket) {
      console.warn('Socket not connected, reaction handler not registered');
      return () => {};
    }

    const wrappedCallback = (data) => {
      if (!this.connectionState.isConnected) {
        console.warn('Received reaction but socket is not connected, ignoring');
        return;
      }

      try {
        console.log('📨 New reaction received:', data);
        callback(data);
      } catch (error) {
        console.error('Error in reaction handler:', error);
      }
    };

    this.reactionHandlers.add(wrappedCallback);
    return this._addEventListener(MESSAGE_REACTION_EVENT, wrappedCallback);
  }

  offMessage(callback) {
    if (!this.socket) return;
    
    // Find the wrapped callback in our handlers
    for (const handler of this.messageHandlers) {
      if (handler.originalCallback === callback || handler === callback) {
        this.messageHandlers.delete(handler);
        this.socket.off(RECEIVE_MESSAGE_EVENT, handler);
        break;
      }
    }
  }

  onMessageDeleted(callback) {
    if (this.socket) {
      const wrappedCallback = (messageId) => {
        console.log('🗑️ Message deleted event received:', messageId);
        try {
          // Ensure we're passing the message ID directly to the callback
          callback(messageId);
        } catch (error) {
          console.error('Error in message deletion handler:', error);
        }
      };
      
      // Add the wrapped callback to our set of handlers
      this.messageDeletedHandlers.add(wrappedCallback);
      
      // Set up the socket event listener
      this.socket.on(MESSAGE_DELETED_EVENT, wrappedCallback);
      
      // Return a cleanup function that removes this handler
      return () => {
        this.offMessageDeleted(wrappedCallback);
      };
    }
    
    // Return a no-op function if socket isn't available
    return () => {};
  }

  offMessageDeleted(callback) {
    if (this.socket) {
      this.messageDeletedHandlers.delete(callback);
      this.socket.off(MESSAGE_DELETED_EVENT, callback);
    }
  }

  // Room management
  // joinRoom(roomId) {
  //   if (this.socket) {
  //     console.log(`🚪 Joining room: ${roomId}`);
  //     this.socket.emit('joinRoom', roomId);
  //   }
  // }

  leaveRoom(roomId) {
    if (this.socket) {
      console.log(`🚪 Leaving room: ${roomId}`);
      this.socket.emit('leaveRoom', roomId);
    }
  }

  // Message sending
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket is not connected'));
        return;
      }

      console.log('📤 Sending message:', { 
        roomId: message.roomId, 
        content: message.isFile ? '[File]' : message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '')
      });
      
      // Add a timeout for the acknowledgment
      const timeout = setTimeout(() => {
        reject(new Error('Message send timeout'));
      }, 10000); // 10 second timeout

      this.socket.emit('sendMessage', message, (response) => {
        clearTimeout(timeout);
        
        if (response?.error) {
          console.error('❌ Error sending message:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('✅ Message sent successfully, server response:', response);
          resolve(response);
        }
      });
    });
  }

  // Connection management
  isConnected() {
    return this.socket?.connected || false;
  }

  deleteMessageRequest(messageId) {
    console.log('Sending delete-message request for message:', messageId);
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        const error = new Error('Socket not initialized');
        console.error('Socket not initialized');
        reject(error);
        return;
      }
      
      if (!this.socket.connected) {
        const error = new Error('Socket not connected');
        console.error('Socket not connected, connection state:', this.socket.disconnected ? 'disconnected' : 'connecting');
        reject(error);
        return;
      }
      
      console.log('Emitting delete-message event with messageId:', messageId);
      
      // Add a timeout for the socket response
      const timeout = setTimeout(() => {
        const error = new Error('Delete message request timed out');
        console.error('Delete message request timed out');
        reject(error);
      }, 5000); // 5 second timeout
      
      // Emit the delete-message event with an acknowledgment callback
      this.socket.emit('delete-message', messageId, (response) => {
        clearTimeout(timeout);
        
        if (!response) {
          const error = new Error('Empty response from server');
          console.error('Empty response from server for delete-message');
          reject(error);
          return;
        }
        
        if (response.error) {
          console.error('Server returned error for delete-message:', response.error);
          reject(new Error(response.error));
          return;
        }
        
        console.log('Message deleted successfully, response:', response);
        resolve(response);
      });
    });
  }

  editMessageRequest({messageId, newMessage}) {
    if (this.socket) {
      this.socket.emit('edit-message', {messageId, newMessage});
    }
  }

  onMessageEdited(callback) {
    if (this.socket) {
      const wrappedCallback = (data) => {
        console.log('📨 New message received:', data);
        callback(data);
      };
      this.messageHandlers.add(wrappedCallback);
      this.socket.on('message-edited', wrappedCallback);
      return () => this.offMessage(wrappedCallback);
    }
    return () => {};
  }

  offMessageEdited(callback) {
    if (this.socket) {
      this.messageHandlers.delete(callback);
      this.socket.off('message-edited', callback);
    }
  }

  pinMessageRequest(messageId) {
    if (this.socket) {
      this.socket.emit('pin-message', messageId);
    }
  }

  onMessagePinned(callback) {
    if (this.socket) {
      const wrappedCallback = (data) => {
        console.log('📌 Message pinned event received:', data);
        callback(data);
      };
      this.messageHandlers.add(wrappedCallback);
      this.socket.on('message-pinned', wrappedCallback);
      return () => this.offMessagePinned(wrappedCallback);
    }
    return () => {};
  }

  offMessagePinned(callback) {
    if (this.socket) {
      this.messageHandlers.delete(callback);
      this.socket.off('message-pinned', callback);
    }
  }

  // Event forwarding (for direct event access if needed)
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      return () => this.socket.off(event, callback);
    }
    return () => {};
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Add handler for message read updates
  onMessageReadUpdated(handler) {
    if (typeof handler !== 'function') return () => {};
    
    this.messageReadUpdatedHandlers.add(handler);
    
    // Set up the socket listener if not already set up
    if (this.socket && !this.socket.hasListeners('message-read-updated')) {
      this.socket.on('message-read-updated', (data) => {
        this.messageReadUpdatedHandlers.forEach(h => h(data));
      });
    }
    
    // Return cleanup function
    return () => this.messageReadUpdatedHandlers.delete(handler);
  }

  // Emit message read event
  markMessageAsRead(messageId, roomId,userId) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket not connected, cannot mark message as read');
      return Promise.reject(new Error('Socket not connected'));
    }
   
    
    if (!userId) {
      console.warn('User ID not found, cannot mark message as read');
      return Promise.reject(new Error('User not authenticated'));
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.socket.emit('message-read', { 
          messageId, 
          roomId, 
          userId 
        }, (response) => {
          if (!response) {
            console.error('No response from server for message-read event');
            reject(new Error('No response from server'));
            return;
          }
          console.warn('Response from server for message-read event:', response);
          if (response.success) {
            resolve({
              success: true,
              message: response.message,
              deletionTime: response.deletionTime,
              allRead: response.allRead,
              readBy: response.readBy || [],

            });
          } else {
            console.error('Server error marking message as read:', response.error);
            reject(new Error(response.error || 'Failed to mark message as read'));
          }
        });
      } catch (error) {
        console.error('Error emitting message-read event:', error);
        reject(error);
      }
    });
  }

  // Remove all event listeners and clean up
  disconnect() {
    if (this.socket) {
      // Clear all event listeners
      this._clearAllEventListeners();
      
      // Disconnect the socket
      this.socket.disconnect();
      this.socket = null;
      
      // Update connection state
      this.connectionState.isConnected = false;
      this.connectionState.isConnecting = false;
      this.connectionState.reconnectAttempts = 0;
    }
    
    // Clear all message handlers
    this.messageHandlers.clear();
    this.messageDeletedHandlers.clear();
    this.messageReadUpdatedHandlers.clear();
    
    console.log('🔌 Socket disconnected and cleaned up');
  }
}

export default new SocketService();