const auth = require('../services/auth');
const authService = require('../services/authService');
const totpService = require('../services/totpService');
const userService = require('../services/userService');
const { disconnectUser } = require('../socket/utils/presence');

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
   * Reset password.
   *
   * A new password means the old one is no longer trusted, so whatever the old
   * one was signed in on is ended — by the same call the user's own Logout and
   * an administrator's sign-out make, so "signed out" means one thing here.
   *
   * @param {object} data - Reset password data (username, password, otp)
   * @returns {Promise<object>} Updated user
   */
  async resetPassword(data) {
    const user = await auth.resetPassword(data);
    await authController.logout(user.id);
    return user;
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
   * Roles a sign-up may pick: global ones, plus the company's own
   * @param {string} [companyId] - Company the sign-up is for
   * @returns {Promise<array>} List of roles
   */
  async getAllRoles(companyId) {
    return await authService.getAllRoles(companyId);
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
   * End every session this user has. One operation whoever asked for it — the
   * user pressing Logout, or an administrator signing them out from the user
   * screen — so being signed out means the same thing either way.
   *
   * The refresh token goes, so nothing can come back on it; tokens already
   * issued stop being accepted (isTokenSuperseded reads the same cutoff), so an
   * access token still in a tab is no longer worth anything; and the live
   * sockets are dropped, so open tabs stop being fed.
   *
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async logout(userId) {
    await userService.invalidateSessions(userId);
    disconnectUser(userId);
  }
};

module.exports = authController;
