const logger = require('../../../logger');
const activityService = require('../../services/startup/activityService');
const authService = require('../../services/startup/authService');
const multiCompanyService = require('../../services/startup/multiCompanyService');
const totpService = require('../../services/startup/totpService');

const authController = {
  /**
   * Sign up a new user
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {object} userData - User data (phone, name, role)
   * @returns {Promise<object>} Created user
   */
  async signup(username, password,  userData) {
    return await authService.signup( username?.trim(), password?.trim(), userData);
  },

  /**
   * Login a user
   * @param {object} credentials - Login credentials (username, password)
   * @returns {Promise<object>} User data with tokens
   */
  async loginUser(credentials) {
    const loginResult = await authService.loginUser(credentials);
    const { user } = loginResult;
    // Create activity entry for login
    let walletResponse;
    try {
      walletResponse = await activityService.createActivity(
        'User',
        `User ${user.username} logged in successfully`,
        'User Login',
        user.id,
        user.id,
        user.company?.id,
        0 //type (create/update/delete)
      );
      logger.info(`Login activity created successfully for user ${user.id}`);
      // Check if wallet is insufficient and add to login result
      if (walletResponse && walletResponse.insufficientWallet === true) {
        loginResult.insufficientWallet = true;
        if (walletResponse.message) {
          loginResult.walletMessage = walletResponse.message;
        }
      }
    } catch (activityError) {
      // Log error but don't fail login if activity creation fails
      logger.error(`Failed to create login activity for user ${user.id}`, activityError);
      logger.error('Activity error details', activityError);
    }

    return loginResult;
  },

  /**
   * Reset password
   * @param {object} data - Reset password data (username, password, isFirstLogin, otp)
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
  },

  /**
   * Generate TOTP secret for a user
   * @param {string} username - Username
   * @returns {Promise<object>} TOTP data (secret, qrCodeUrl, otpauthUrl)
   */
  async generateTotpSecret(username) {
    return await totpService.generateTotpSecret(username);
  },

  /**
   * Verify TOTP code and enable 2FA
   * @param {string} username - Username
   * @param {string} totpCode - TOTP code from authenticator app
   * @returns {Promise<object>} Verification result
   */
  async verifyAndEnableTotp(username, totpCode) {
    return await totpService.verifyAndEnableTotp(username, totpCode);
  }
};

module.exports = authController;
