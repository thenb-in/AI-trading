import { api } from './axiosConfig';

const ApiService = {
  async request(method, url, data = null, config = {}) {
    return api({
      method,
      url,
      ...(data && { data }),
      ...(config.params && { params: config.params }),
      ...config,
    });
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

  approveUser(userId, requirePasswordReset = false, role_id = null) {
    return this.request('POST', `/auth/approve/${userId}`, { requirePasswordReset, role_id });
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

  updateRole(role_id, data) {
    return this.request('PUT', `/admin/roles/${role_id}`, data);
  },

  deleteRole(role_id) {
    return this.request('DELETE', `/admin/roles/${role_id}`);
  },

  // Admin - Permissions
  getPermissions() {
    return this.request('GET', '/admin/permissions');
  },

  createPermission(data) {
    return this.request('POST', '/admin/permissions', data);
  },

  updatePermission(permission_id, data) {
    return this.request('PUT', `/admin/permissions/${permission_id}`, data);
  },

  deletePermission(permission_id) {
    return this.request('DELETE', `/admin/permissions/${permission_id}`);
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
  getSupportUsers() {
    return this.request('GET', '/admin/users/support');
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

  // Admin - Subscriptions
  getSubscriptions() {
    return this.request('GET', '/admin/subscriptions');
  },

  createSubscription(data) {
    return this.request('POST', '/admin/subscriptions', data);
  },

  updateSubscriptionPermissionStatus(data) {
    return this.request('POST', '/admin/subscription-permissions/update', data);
  },

  updateMultipleSubscriptionPermissionStatuses(data) {
    return this.request('POST', '/admin/subscription-permissions/update-multiple', data);
  },

  // Company-Subscription methods
  getCompanySubscriptions(companyId) {
    return this.request('GET', `/admin/companies/${companyId}/subscriptions`);
  },

  getAvailableSubscriptions() {
    return this.request('GET', '/admin/subscriptions/available');
  },

  setCompanySubscriptions(companyId, subscriptionIds) {
    return this.request('PUT', `/admin/companies/${companyId}/subscriptions`, { subscriptionIds });
  },

  openHelpSupportTicket(data) {
    return this.request('POST', '/help-support/open-ticket', data);
  },
  
};


export { ApiService };
