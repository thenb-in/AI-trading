import axios from 'axios';
import { API_CONFIG } from '../../constants/startup/';

const API_URL = API_CONFIG.BASE_URL;

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
      // Check if URL is already absolute (starts with http:// or https://)
      const isAbsoluteUrl = url.startsWith('http://') || url.startsWith('https://');
      const requestUrl = isAbsoluteUrl ? url : `${API_URL}${url}`;
      
      const response = await axios({
        method,
        url: requestUrl,
        ...(data && { data }),
        ...(config.params && { params: config.params }),
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
      // Log error response (only for non-session-expired errors to reduce noise)
      const errorData = error.response?.data || {};
      const isSessionExpired = error.response?.status === 400 && errorData.requiresLogin;
      
      if (!isSessionExpired) {
        console.error(`❌ ${method} ${url} error:`, {
          status: error.response?.status,
          data: errorData,
          message: error.message
        });
      }
      
      // Handle session expiration - don't throw, let the caller handle it
      if (isSessionExpired || error.response?.status === 401) {
        // Clear any stale auth data
        if (typeof window !== 'undefined') {
          // Clear cookies if possible
          document.cookie.split(";").forEach((c) => {
            document.cookie = c
              .replace(/^ +/, "")
              .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          });
        }
      }
      
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

  generateTotpSecret(data) {
    return this.request('POST', '/auth/generate-totp-secret', data);
  },

  verifyAndEnableTotp(data) {
    return this.request('POST', '/auth/verify-totp', data);
  },

  updateUserProfile(userId, userProfile) {
    return this.request('POST', `/users/userProfile`, { userId, userProfile });
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

  getCompanyProfile() {
    return this.request('GET', '/company-profile');
  },

  updateCompanyProfile(profile) {
    return this.request('PUT', '/company-profile', profile);
  },

  getUserCompanies() {
    return this.request('GET', '/company/my');
  },

  switchCompany(companyId) {
    return this.request('POST', '/company/switch', { companyId });
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

  approveUser(userId, requirePasswordReset = false, roleId = null) {
    return this.request('POST', `/auth/approve/${userId}`, { requirePasswordReset, roleId });
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

  // Admin - Roles
  getRoles() {
    return this.request('GET', '/admin/roles');
  },

  createRole(data) {
    return this.request('POST', '/admin/roles', data);
  },

  updateRole(roleId, data) {
    return this.request('PUT', `/admin/roles/${roleId}`, data);
  },

  deleteRole(roleId) {
    return this.request('DELETE', `/admin/roles/${roleId}`);
  },

  // Admin - Permissions
  getPermissions() {
    return this.request('GET', '/admin/permissions');
  },

  createPermission(data) {
    return this.request('POST', '/admin/permissions', data);
  },

  updatePermission(permissionId, data) {
    return this.request('PUT', `/admin/permissions/${permissionId}`, data);
  },

  deletePermission(permissionId) {
    return this.request('DELETE', `/admin/permissions/${permissionId}`);
  },

  // Admin - Role Permissions
  getRolePermissions() {
    return this.request('GET', '/admin/role-permissions');
  },

  addRolePermissions(data) {
    return this.request('POST', '/admin/role-permissions/add', data);
  },

  removeRolePermission(data) {
    return this.request('POST', '/admin/role-permissions/remove', data);
  },

  // Admin - User Company Assignment
  getSadminUsers() {
    return this.request('GET', '/admin/users/sadmin');
  },

  getAllCompanies() {
    return this.request('GET', '/admin/companies');
  },

  assignUserToCompany(userId, companyId) {
    return this.request('POST', '/admin/assign-user', { userId, companyId });
  },

  removeUserFromCompany(userId, companyId) {
    return this.request('POST', '/admin/remove-user', { userId, companyId });
  },

  getCompanyUsers(companyId) {
    return this.request('GET', `/admin/companies/${companyId}/users`);
  },

  // Get all layouts for a specific document (private + public)
  getLayoutsByDocument(documentName) {
    return this.request('GET', `/layouts/document/${documentName}`);
  },

  // Get a specific layout by ID
  getLayoutById(layoutId) {
    return this.request('GET', `/layouts/layout/${layoutId}`);
  },

  // Create or update a layout
  createOrUpdateLayout(layoutData) {
    return this.request('POST', '/layouts/create-or-update-layout', layoutData);
  },

  // Delete a layout
  deleteLayout(layoutId) {
    return this.request('DELETE', `/layouts/layout/${layoutId}`);
  },

  // Set a layout as default
  setDefaultLayout(layoutId) {
    return this.request('POST', '/layouts/set-default', { layout_id: layoutId });
  },

  // Unset default layout for a document
  unsetDefaultLayout(documentName) {
    return this.request('POST', '/layouts/unset-default', { document_name: documentName });
  },
  
};


export { ApiService };
