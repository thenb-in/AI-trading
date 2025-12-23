const jwt = require('jsonwebtoken');
const userService = require('../../services/startup/userService');
const env = require('../../config/env');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, company_id: user.company_id },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRATION }
  );
};

const generateRefreshToken = async (user) => {
  return jwt.sign(
    { id: user.id, company_id: user.company_id },
    env.REFRESH_TOKEN_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRATION }
  );
};

const verifyToken = (token, secret) => {
  if (!token) {
    throw new Error(`No token provided ${token}.`);
  }
  return jwt.verify(token, secret);
};

const revokeRefreshToken = async (userId) => {
  return await userService.revokeRefreshToken(userId);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  revokeRefreshToken
};
