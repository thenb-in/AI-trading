/**
 * Controller for authentication operations
 * Contains only business logic, no request/response handling
 */
const authService = require('../../services/startup/authService');
const multiCompanyService = require('../../services/startup/multiCompanyService');

const authController = {
  /**
   * Sign up a new user
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {string} companyId - Company ID
   * @param {object} userData - User data (phone, name, role)
   * @returns {Promise<object>} Created user
   */
  async signup(username, password, companyId, userData) {
    return await authService.signup(username, password, companyId, userData);
  },

  /**
   * Login a user
   * @param {object} credentials - Login credentials (username, password)
   * @returns {Promise<object>} User data with tokens
   */
  async loginUser(credentials) {
    return await authService.loginUser(credentials);
  },

  /**
   * Reset password
   * @param {object} data - Reset password data (username, password, isFirstLogin)
   * @returns {Promise<object>} Updated user
   */
  async resetPassword(data) {
    return await authService.resetPassword(data);
  },

  /**
   * Approve a user
   * @param {string} userId - User ID
   * @param {boolean} requirePasswordReset - Whether password reset is required
   * @param {string|null} roleId - Role ID to assign
   * @returns {Promise<void>}
   */
  async approveUser(userId, requirePasswordReset, roleId) {
    return await authService.approveUser(userId, requirePasswordReset, roleId);
  },

  /**
   * Get all roles
   * @returns {Promise<array>} List of roles
   */
  async getAllRoles() {
    return await authService.getAllRoles();
  },

  /**
   * Get all users for a company
   * @param {string} companyId - Company ID
   * @returns {Promise<object>} Users and roles
   */
  async getAllUsers(companyId) {
    return await multiCompanyService.getAllUsers(companyId);
  },

  /**
   * Logout user (revoke refresh token)
   * @param {string} _userId - User ID (currently unused, reserved for future use)
   * @returns {Promise<void>}
   */
  async logout(_userId) {
    // Logout logic is handled by clearing cookies in view layer
    // This is a placeholder if any service-level cleanup is needed
    return Promise.resolve();
  }
};

module.exports = authController;
