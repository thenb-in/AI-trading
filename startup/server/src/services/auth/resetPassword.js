const bcrypt = require('bcrypt');
const logger = require('../../../logger');
const { User } = require('../../models');
const { revokeRefreshToken } = require('../../utils/authUtils');
const totpService = require('../totpService');
const { assertPasswordPolicy } = require('./passwordPolicy');


const approveReset = async (user, otp) => {
  const hasOtp = Boolean(otp && otp.trim());

  if (!user.is_approved && !hasOtp) {
    logger.warn(`Password reset refused, account not approved: ${user.id}`);
    throw {
      status: 403,
      message: 'Your account is pending admin approval. You cannot change your password yet.'
    };
  }

  if (user.is_approved && user.last_active === null) {
    logger.info(`First login password reset: ${user.id} - approved immediately`);
    return true;
  }

  if (!hasOtp) {
    logger.info(`Password reset without OTP: ${user.id} - Requires admin approval`);
    return false;
  }

  try {
    await totpService.verifyTotpOnly(user.username, otp.trim());
    logger.info(`Password reset with valid OTP: ${user.id} - approved immediately`);
    return true;
  } catch (error) {
    logger.warn(`Invalid OTP for password reset: ${user.id} - ${error.message}`);
    throw { status: 400, message: 'Invalid authenticator code' };
  }
};

const resetPassword = async ({ username, password, otp }) => {
  username = String(username ?? '').trim();
  password = String(password ?? '').trim();
  assertPasswordPolicy(password);

  const user = await User.findOne({ where: { username } });
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  user.password = await bcrypt.hash(password, 10);
  user.is_approved = await approveReset(user, otp);
  if (user.is_approved) {
    user.last_active = new Date();
  }

  // Revoke all active refresh tokens
  await revokeRefreshToken(user.id);
  await user.save();
  logger.info(`Password reset: ${user.id} - approved: ${user.is_approved}`);
  return user;
};

module.exports = {
  resetPassword
};
