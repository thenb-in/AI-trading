const jwt = require('jsonwebtoken');
const companyService = require('../services/companyService');
const env = require('../config/env');
const logger = require('../../logger');

const generateAccessToken = async (user) => {
  const currentCompany = await companyService.getActiveCompanyForUser(user);
  const token = jwt.sign(
    { id: user.id, company_id: currentCompany.id },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRATION }
  );
  const decoded = jwt.decode(token);
  logger.debug(`Access token generated for user ${user.id}, expires at ${new Date(decoded.exp * 1000).toISOString()} (in ${env.JWT_ACCESS_EXPIRATION})`);
  return token;
};

const generateRefreshToken = async (user) => {
  const currentCompany = await companyService.getActiveCompanyForUser(user);
  const token = jwt.sign(
    { id: user.id, company_id: currentCompany.id },
    env.REFRESH_TOKEN_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRATION }
  );
  const decoded = jwt.decode(token);
  logger.debug(`Refresh token generated for user ${user.id}, expires at ${new Date(decoded.exp * 1000).toISOString()} (in ${env.JWT_REFRESH_EXPIRATION})`);
  return token;
};

const verifyToken = (token, secret) => {
  if (!token) {
    throw new Error(`No token provided ${token}.`);
  }
  return jwt.verify(token, secret);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken
};
