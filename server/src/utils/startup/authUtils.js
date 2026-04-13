const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const userService = require('../../services/startup/userService');

/**
 * Generates a short-lived JWT access token containing user ID and company ID.
 * @param {Object} user - User object with id and company_id
 * @returns {string} Signed JWT access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, company_id: user.company_id },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRATION }
  );
};

/**
 * Generates a long-lived JWT refresh token containing user ID and company ID.
 * @param {Object} user - User object with id and company_id
 * @returns {Promise<string>} Signed JWT refresh token
 */
const generateRefreshToken = async (user) => {
  return jwt.sign(
    { id: user.id, company_id: user.company_id },
    env.REFRESH_TOKEN_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRATION }
  );
};

/**
 * Verifies and decodes a JWT token using the provided secret.
 * @param {string} token - JWT token string
 * @param {string} secret - Secret key used for verification
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is missing, expired, or invalid
 */
const verifyToken = (token, secret) => {
  if (!token) {
    throw new Error(`No token provided ${token}.`);
  }
  return jwt.verify(token, secret);
};

/**
 * Revokes a user's refresh token by delegating to the user service.
 * @param {string|number} userId - User ID whose token should be revoked
 * @returns {Promise<boolean>} True if revocation was successful
 */
const revokeRefreshToken = async (userId) => {
  return await userService.revokeRefreshToken(userId);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  revokeRefreshToken
};
