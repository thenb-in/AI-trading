const qrcode = require('qrcode');
const speakeasy = require('speakeasy');
const logger = require('../../logger');
const env = require('../config/env');
// User is the primary model for this service
const { User } = require('../models');

/**
 * Verifies a TOTP code against the stored secret using the configured window tolerance.
 * @param {string} secret - Base32-encoded TOTP secret
 * @param {string} totpCode - 6-digit TOTP code from authenticator app
 * @param {string} username - Username for logging purposes
 * @throws {Error} If the TOTP code is invalid
 */
function verifyTotpCode(secret, totpCode, username) {
  const isValid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: totpCode,
    window: env.TOTP_WINDOW
  });
  if (!isValid) {
    logger.warn(`Invalid TOTP code for user: ${username}`);
    throw new Error(`Invalid TOTP code: ${totpCode}`);
  }
}

/**
 * Gives the signed-in user a new TOTP secret and the QR code their authenticator app scans.
 * Only reached signed in (the password has proved who is asking), so it may replace an
 * authenticator that is already set up — a lost or new phone. 2FA is off until the new
 * app's code is verified (verifyAndEnableTotp); the old app's codes stop working at once.
 * @param {string} userId - The signed-in user's id
 * @returns {Promise<{ secret: string, qrCodeUrl: string, otpauthUrl: string, message: string }>}
 * @throws {Error} If the user is not found (404)
 * @side_effects Stores totp_secret and sets is_totp_enabled=false on the User record
 */
const generateTotpSecret = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    logger.warn(`User not found for TOTP setup: ${userId}`);
    throw new Error(`User not found: ${userId}`);
  }
  logger.info(`Generating TOTP secret for user: ${user.username} (2FA was ${user.is_totp_enabled ? 'on' : 'off'})`);

  const secret = speakeasy.generateSecret({
    name: `${env.TOTP_ISSUER} (${user.username})`,
    issuer: env.TOTP_ISSUER
  });
  user.totp_secret = secret.base32;
  user.is_totp_enabled = false;
  await user.save();

  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
  logger.info(`TOTP secret generated and stored for user: ${user.username}`);
  return {
    secret: secret.base32,
    qrCodeUrl,
    otpauthUrl: secret.otpauth_url,
    message: 'TOTP secret generated successfully'
  };
};

/**
 * Verifies a TOTP code and enables 2FA for the signed-in user. Must be called after generateTotpSecret.
 * @param {string} userId - The signed-in user's id
 * @param {string} totpCode - TOTP code from authenticator app
 * @returns {Promise<{ success: boolean, message: string }>}
 * @throws {Error} If user not found, TOTP already enabled, no secret exists, or code is invalid
 * @side_effects Sets is_totp_enabled=true on the User record
 */
const verifyAndEnableTotp = async (userId, totpCode) => {
  const user = await User.findByPk(userId);
  if (!user) {
    logger.warn(`User not found for TOTP verification: ${userId}`);
    throw new Error(`User not found: ${userId}`);
  }
  const { username } = user;
  logger.info(`Verifying TOTP code for user: ${username}`);

  // First, check if user already has TOTP enabled
  if (user.is_totp_enabled) {
    logger.warn(`TOTP already enabled for user: ${username}`);
    const error = new Error(`TOTP is already enabled for this user:${username}`);
    error.statusCode = 400;
    throw error;
  }

  // Check if user has a TOTP secret
  if (!user.totp_secret) {
    logger.warn(`No TOTP secret found for user: ${username}`);
    throw new Error(`TOTP secret not found. Please generate a new secret.${username}`);
  }

  // Verify the TOTP code using the stored secret
  verifyTotpCode(user.totp_secret, totpCode, username);

  // Enable TOTP (secret is already stored)
  user.is_totp_enabled = true;
  await user.save();

  logger.info(`TOTP enabled successfully for user: ${username}`);
  return {
    success: true,
    message: 'TOTP enabled successfully'
  };
};

/**
 * Verifies a TOTP code without changing the user's 2FA status. Used during password resets
 * to allow immediate approval without admin intervention.
 * @param {string} username - Username
 * @param {string} totpCode - TOTP code from authenticator app
 * @returns {Promise<{ success: boolean, message: string }>}
 * @throws {Error} If user not found, TOTP not enabled, no secret exists, or code is invalid
 */
const verifyTotpOnly = async (username, totpCode) => {
  username = username?.trim();
  logger.info(`Verifying TOTP code for password reset: ${username}`);

  const user = await User.findOne({ where: { username } });
  if (!user) {
    logger.warn(`User not found for TOTP verification: ${username}`);
    throw new Error(`User not found: ${username}`);
  }

  // Check if user has TOTP enabled
  if (!user.is_totp_enabled) {
    logger.warn(`TOTP not enabled for user: ${username}`);
    throw new Error(`TOTP is not enabled for this user:${username}`);
  }

  // Check if user has a TOTP secret
  if (!user.totp_secret) {
    logger.warn(`No TOTP secret found for user: ${username}`);
    throw new Error(`TOTP secret not found for this user:${username}`);
  }

  // Verify the TOTP code using the stored secret
  verifyTotpCode(user.totp_secret, totpCode, username);

  logger.info(`TOTP verification successful for password reset: ${username}`);
  return {
    success: true,
    message: 'TOTP code verified successfully'
  };
};


module.exports = {
  generateTotpSecret,
  verifyAndEnableTotp,
  verifyTotpOnly
};
