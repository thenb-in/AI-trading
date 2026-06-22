const authService = require('../services/authService');
const userService = require('../services/userService');

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
   * @param {string|null} role_id - Role ID to assign
   * @returns {Promise<void>}
   */
  async approveUser(userId, requirePasswordReset, role_id) {
    return await authService.approveUser(userId, requirePasswordReset, role_id);
  },

  /**
   * Get all roles
   * @returns {Promise<array>} List of roles
   */
  async getAllRoles() {
    return await authService.getAllRoles();
  },

  /**
   * Check if a field value (company name / username) is still available
   * @param {string} type - Field type ('company' | 'username')
   * @param {string} value - Value to check
   * @returns {Promise<object>} { type, value, available }
   */
  async checkAvailability(type, value) {
    return await authService.checkAvailability({ type, value });
  },

  /**
   * Get all users for a company
   * @param {string} companyId - Company ID
   * @returns {Promise<object>} Users and roles
   */
  async getAllUsers(companyId) {
    return await userService.getAllUsers(companyId);
  },

  /**
   * Logout user (revoke refresh token)
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async logout(userId) {
    await userService.revokeRefreshToken(userId);
  }
};

module.exports = authController;
