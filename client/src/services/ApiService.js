import axios from 'axios';
import socketService from './SocketService';


const API_URL = import.meta.env.VITE_API_URL;

const ApiService = {
  async request(method, url, data = null, config = {}) {
    const headers = {
      ...config.headers,
      'Content-Type': 'application/json',
    };

    // Log the request
    console.log(`📡 API ${method} ${url}`, {
      data,
      headers,
      withCredentials: true,
      ...config
    });

    try {
      const response = await axios({
        method,
        url: `${API_URL}${url}`,
        ...(data && { data }),
        headers,
        withCredentials: true,
        ...config,
      });
      
      // Log successful response
      console.log(`✅ ${method} ${url} success:`, {
        status: response.status,
        data: response.data,
        headers: response.headers
      });
      
      return response;
      
    } catch (error) {
      // Log error response
      console.error(`❌ ${method} ${url} error:`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      // if (error.response?.status === 401) {
      //   window.location.href = '/';
      // }
      throw error.response?.data || error;
    }
  },
  // Authentication
  signup(data) {
    return this.request('POST', '/auth/signup', data);
  },

  login(data) {
    return this.request('POST', '/auth/login', data);
  },

  getUser() {
    return this.request('GET', '/users/me');
  },

  logout() {
    socketService.disconnect();
    return this.request('POST', '/auth/logout');
  },

  // Company
  getCompany() {
    return this.request('GET', '/company');
  },

  getCompanySettings() {
    return this.request('GET', '/company/settings');
  },

  updateCompanySettings(settings) {
    return this.request('PUT', '/company/settings', settings);
  },

  getAllRoles() {
    return this.request('GET', '/auth/roles');
  },

  // Users
  getAllUsers() {
    return this.request('GET', '/users');
  },
  
  getSingleUser(userId){
    return this.request('GET',`/users/${userId}`)
  },

  approveUser(userId) {
    return this.request('POST', `/auth/approve/${userId}`);
  },

  deactivateUser(userId) {
    return this.request('POST', `/users/${userId}/deactivate`);
  },

  deleteUser(userId) {
    return this.request('DELETE', `/users/${userId}`);
  },

  updateUserRole(userId, role) {
    return this.request('PUT', `/users/${userId}/role`, { role });
  },
  
  updateUserDevice(userId, deviceAccess) {
    return this.request('PUT', `/users/${userId}/deviceAccess`, { deviceAccess });
  },
  updateUserDisappearingSettings(userId, data){
    return this.request("PATCH", `/users/${userId}/updateDisappearing`, data)
  },
  // Rooms
  getAllRooms() {
    return this.request('GET', '/rooms');
  },

  getRoomsWithAdminDetails() {
    return this.request('GET', '/rooms/admin-details');
  },

  createRoom(data) {
    return this.request('POST', '/rooms', data);
  },

  deleteRoom(roomId) {
    return this.request('DELETE', `/rooms/${roomId}`);
  },

  deleteRoomMessages(roomId,saved = false) {
    return this.request('DELETE', `/messages/room/${roomId}/saved/${saved}`);
  },

  removeParticipants(roomId, participantId){
  return this.request('PATCH', `/rooms/${roomId}`, { participantId });
  },

  getRoom(roomId){
    return this.request("GET", `/rooms/${roomId}`)
  },

  updateRoom(roomId, data) {
  return this.request('PATCH', `/rooms/${roomId}/addParticipants`, data);
  },
  updateRoomName(roomId, data) {
    return this.request('PATCH', `/rooms/updateName/${roomId}`, data);
    },
  updateRoomDisappearingStatus(roomId, data){
    return this.request('POST', `/rooms/${roomId}/disapperStatus`, data)
  },
  updateRoomDescription(roomId, data) {
    return this.request('PATCH', `/rooms/updateDescription/${roomId}`, data);
    },  

  // Messages
  getRoomMessages(roomId, limit = 50, offset = 0) {
    return this.request('GET', `/rooms/${roomId}/messages?limit=${limit}&offset=${offset}`);
  },

  sendMessage(data) {
    return this.request('POST', '/messages', data);
  },

  deleteMessage(messageId) {
    return this.request('DELETE', `/messages/${messageId}`);
  },

  searchMessages(query) {
    return this.request('GET', `/messages/search?q=${encodeURIComponent(query)}`);
  },

  // Starred Messages
  starMessage(messageId) {
    return this.request('POST', '/messages/starred', { messageId });
  },

  unstarMessage(messageId) {
    // Send messageId as part of the URL path
    return this.request('DELETE', `/messages/starred/${messageId}`);
  },

  getStarredMessages() {
    return this.request('GET', '/messages/starred');
  },

  getPinnedMessages(roomId) {
    return this.request('GET', `/messages/pinned/${roomId}`);
  },

  getSavedMessages(roomId) {
    return this.request('GET', `/messages/saved/${roomId}`);
  },

  unpinMessage(messageId) {
    return this.request('PATCH', `/messages/pinned/${messageId}`);
  },

  unSaveMessage(messageId) {
    return this.request('PATCH', `/messages/saved/${messageId}`);
  },

  getUserSavedMessages() {
    return this.request('GET', '/messages/userSaved');
  },

  getUserPinnedMessages() {
    return this.request('GET', '/messages/userPinned');
  },

  saveMessage(messageId) {
    return this.request('PATCH', `/messages/save-message/${messageId}`);
  },

  pinMessage(messageId) {
    return this.request('PATCH', `/messages/pin-message/${messageId}`);
  },
  
  uploadFile(file) {
    console.log(`📤 Starting file upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    const formData = new FormData();
    formData.append('file', file);

    return axios({
      method: 'POST',
      url: `${API_URL}/messages/upload`, 
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    })
      .then(response => {
        console.log(`✅ File upload completed: ${file.name}`);
        return response;
      })
      .catch(error => {
        console.error(`❌ File upload failed: ${file.name}`, error);
        if (error.response?.status === 401) {
          console.log('Authentication error during file upload', error);
        }
        throw error.response?.data || error;
      });
  },
};


  


export default ApiService;