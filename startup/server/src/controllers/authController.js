const auth = require('../services/auth');
const authService = require('../services/authService');
const totpService = require('../services/totpService');
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
    return await auth.signup(username, password, companyId, userData);
  },

  /**
   * Login a user
   * @param {object} credentials - Login credentials (username, password)
   * @returns {Promise<object>} User data with tokens
   */
  async loginUser(credentials) {
    return await auth.loginUser(credentials);
  },

  /**
   * Reset password
   * @param {object} data - Reset password data (username, password, otp)
   * @returns {Promise<object>} Updated user
   */
  async resetPassword(data) {
    return await auth.resetPassword(data);
  },

  /**
   * Generate a TOTP secret (+ QR) for a user
   * @param {string} username - Username
   * @returns {Promise<object>} TOTP data (secret, qrCodeUrl, otpauthUrl)
   */
  async generateTotpSecret(username) {
    return await totpService.generateTotpSecret(username);
  },

  /**
   * Verify a TOTP code and enable 2FA for the user
   * @param {string} username - Username
   * @param {string} totpCode - Code from the authenticator app
   * @returns {Promise<object>} Verification result
   */
  async verifyAndEnableTotp(username, totpCode) {
    return await totpService.verifyAndEnableTotp(username, totpCode);
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
