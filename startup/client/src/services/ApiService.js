import { api } from './axiosConfig';
import { cacheExpireNamespace, cacheRead, cacheReady, cacheSet } from './cacheManager';
import { CACHE_STORE_SESSION, CACHE_TTL_DEFAULT_MS } from '@startup/constants/cache';

// Write failures that mean "your copy is out of date" rather than "your
// request was bad": the record is already gone, or another user changed it
// first.
const HTTP_GONE_STATUSES = { notFound: 404, conflict: 409 };

// Query string, normalised, so the same request hits the same entry whatever
// order the caller happened to build its params in.
const queryOf = (params) => {
  const entries = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  entries.sort(([a], [b]) => a.localeCompare(b));
  return `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}`;
};

const ApiService = {
  /** The raw call, with no cache in front of it. */
  send(method, url, data = null, config = {}) {
    return api({
      method,
      url,
      ...(data && { data }),
      ...(config.params && { params: config.params }),
      ...config,
    });
  },

  /**
   * Every call goes through here, and each method below declares its own
   * caching — whoever writes the method is the one who knows whether a stale
   * answer is acceptable, so nothing is cached unless it says so.
   *
   *   cache: 'users'                  cache this GET under the `users`
   *                                   namespace (optionally
   *                                   { namespace, ttlMs, store }: a shorter
   *                                   life, or where it is kept — 'session'
   *                                   by default, 'local' or 'db' to outlive
   *                                   the tab, 'db' for large lists, 'memory'
   *                                   to not outlive the page)
   *   invalidates: ['users', 'roles'] on success, mark those namespaces
   *                                   expired
   *   force: true                     fetch even when the cached copy is fresh
   *
   * A cached read resolves to `{ data, status }` rather than the full axios
   * response — headers and the request object are neither serialisable nor
   * meaningful after the fact. Callers read `.data`, which is unchanged.
   */
  async request(method, url, data = null, config = {}) {
    const { cache, invalidates, force = false, ...axiosConfig } = config;

    if (cache && method === 'GET') return this.cachedGet(url, cache, force, axiosConfig);

    try {
      const response = await this.send(method, url, data, axiosConfig);
      if (invalidates) invalidates.forEach(cacheExpireNamespace);
      return response;
    } catch (error) {
      // A write usually fails without changing anything, and expiring a good
      // list over a validation error just costs everyone a refetch. These two
      // are the exception: they say the server disagrees with what this client
      // thought existed — the row is gone, or someone else got there first —
      // so the cached copy is the thing that was wrong, not the request.
      const status = error?.response?.status;
      if (invalidates && (status === HTTP_GONE_STATUSES.notFound || status === HTTP_GONE_STATUSES.conflict)) {
        invalidates.forEach(cacheExpireNamespace);
      }
      throw error;
    }
  },

  /**
   * A GET declared cacheable. A fresh copy is returned as is; a missing or
   * expired one is fetched and stored over the old. If that fetch fails, the
   * old copy is returned instead — an out-of-date list beats an empty screen —
   * and only with nothing to fall back on does the error reach the caller.
   */
  async cachedGet(url, cache, force, axiosConfig) {
    // Reference lists are the largest payloads the client routinely fetches, so
    // by default a cached read goes to sessionStorage: surviving a reload costs
    // one JSON.parse instead of a round trip.
    const { namespace, ttlMs = CACHE_TTL_DEFAULT_MS, store = CACHE_STORE_SESSION } =
      typeof cache === 'string' ? { namespace: cache } : cache;
    const key = `${namespace}:${String(url).split('?')[0]}${queryOf(axiosConfig.params)}`;
    await cacheReady(key);
    const cached = cacheRead(key, { store });
    if (cached?.fresh && !force) return cached.data;

    try {
      const response = await this.send('GET', url, null, axiosConfig);
      const fetched = { data: response.data, status: response.status };
      return cacheSet(key, fetched, { store, ttlMs });
    } catch (error) {
      if (cached) return cached.data;
      throw error;
    }
  },

  // Authentication
  signup(data) {
    return this.request('POST', '/auth/signup', data, { invalidates: ['users'] });
  },

  login(data) {
    return this.request('POST', '/auth/login', data);
  },

  companyExists(companyId) {
    return this.request('GET', `/company/exists/${encodeURIComponent(companyId)}`);
  },

  // Live availability check while typing (type: 'company' | 'username').

  checkAvailability(type, value) {
    return this.request('GET', '/auth/availability', null, { params: { type, value } });
  },

  // TOTP (Google Authenticator 2FA) enrolment
  generateTotpSecret(data) {
    return this.request('POST', '/auth/generate-totp-secret', data);
  },

  verifyAndEnableTotp(data) {
    return this.request('POST', '/auth/verify-totp', data);
  },

  getUser() {
    return this.request('GET', '/users/me');
  },

  logout() {
    return this.request('POST', '/auth/logout');
  },

  updateUserProfile(userId, userProfile) {
    return this.request('POST', `/users/userProfile`, { userId, userProfile },
      { invalidates: ['users'] });
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

  getCompanyDetails() {
    return this.request('GET', '/company-details');
  },

  updateCompanyDetails(formData) {
    return this.request('PUT', '/company-details', formData);
  },

  getUserCompanies() {
    return this.request('GET', '/company/my');
  },

  switchCompany(companyId) {
    return this.request('POST', '/company/switch', { companyId });
  },

  // The roles a sign-up may pick: global ones, plus `companyId`'s own. Cached:
  // the role list changes only when someone edits roles, and every write that
  // does is marked below. `options` lets a caller pass `{ force }`.
  getAllRoles(companyId, options = {}) {
    return this.request('GET', '/auth/roles', null, { cache: 'roles', params: { companyId }, ...options });
  },

  // Users
  // Cached. Note this response carries the role list too, which is why role
  // writes invalidate `users` as well.
  getAllUsers(options = {}) {
    return this.request('GET', '/users', null, { cache: 'users', ...options });
  },
  
  getSingleUser(userId){
    return this.request('GET',`/users/${userId}`)
  },

  approveUser(userId, requirePasswordReset = false, role_id = null) {
    return this.request('POST', `/auth/approve/${userId}`, { requirePasswordReset, role_id },
      { invalidates: ['users'] });
  },

  deactivateUser(userId) {
    return this.request('POST', `/users/${userId}/deactivate`, null, { invalidates: ['users'] });
  },

  deleteUser(userId) {
    return this.request('DELETE', `/users/${userId}`, null, { invalidates: ['users'] });
  },

  updateUserRole(userId, role) {
    return this.request('PUT', `/users/${userId}/role`, { role }, { invalidates: ['users'] });
  },
  
  updateUserDevice(userId, deviceAccess) {
    return this.request('PUT', `/users/${userId}/deviceAccess`, { deviceAccess },
      { invalidates: ['users'] });
  },
  updateUser(userId, fields) {
    return this.request('PUT', `/users/${userId}`, fields, { invalidates: ['users'] });
  },
  updateUserDisappearingSettings(userId, data){
    return this.request("PATCH", `/users/${userId}/updateDisappearing`, data)
  },

  // Admin - Roles
  getRoles(options = {}) {
    return this.request('GET', '/admin/roles', null, { cache: 'roles', ...options });
  },

  // `users` too: getAllUsers returns the role list alongside its rows.
  createRole(data) {
    return this.request('POST', '/admin/roles', data, { invalidates: ['roles', 'users'] });
  },



  // Admin - Permissions
  getPermissions(options = {}) {
    return this.request('GET', '/admin/permissions', null, { cache: 'permissions', ...options });
  },



  deletePermission(permission_id) {
    return this.request('DELETE', `/admin/permissions/${permission_id}`, null,
      { invalidates: ['permissions'] });
  },

  // Admin - Role Permissions
  getRolePermissions() {
    return this.request('GET', '/admin/role-permissions');
  },

  // `roles`, not `permissions`: /admin/roles answers with each role's
  // permissions attached, so granting one changes that cached list.
  addRolePermissions(data) {
    return this.request('POST', '/admin/role-permissions/add', data, { invalidates: ['roles'] });
  },

  removeRolePermission(data) {
    return this.request('POST', '/admin/role-permissions/remove', data, { invalidates: ['roles'] });
  },

  // Admin - User Company Assignment
  getSupportUsers() {
    return this.request('GET', '/admin/users/support');
  },

  assignUserToCompany(userId, companyId) {
    return this.request('POST', '/admin/assign-user', { userId, companyId },
      { invalidates: ['users'] });
  },

  removeUserFromCompany(userId, companyId) {
    return this.request('POST', '/admin/remove-user', { userId, companyId },
      { invalidates: ['users'] });
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

  // Batch-save the changed permission rows for one subscription in a single call.
  updateSubscriptionPermissions(subscriptionId, permissions, isGlobal) {
    return this.request('PUT', `/admin/subscriptions/${subscriptionId}/permissions`, { permissions, isGlobal });
  },

  exportSubscription(subscriptionId) {
    return this.request('GET', `/admin/subscriptions/${subscriptionId}/export`, null, {
      responseType: 'blob'
    });
  },

  importSubscription(payload) {
    return this.request('POST', '/admin/subscriptions/import', payload);
  },

  // Head base — restate this company's head history to the wallet, so periods
  // that predate activity logging are billed on what was actually there.
  buildHeadBase(months) {
    return this.request('POST', '/admin/head-base', { months });
  },

  pushSubscriptionToWallet(subscriptionId) {
    return this.request('POST', `/admin/subscriptions/${subscriptionId}/push-to-wallet`);
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
