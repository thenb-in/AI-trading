import axios from 'axios';



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

};


  


export default ApiService;