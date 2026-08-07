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

  // Reset REPLACES an existing local password, it does not create one. An
  // account with no password has only ever signed in through SSO, and this
  // endpoint is public — without the guard anyone knowing a username could
  // plant a password on such an account, handing themselves a way in that
  // Wallet knows nothing about, and knock it back to pending approval in the
  // process. Being SSO-LINKED is not itself a reason to refuse: an account that
  // already has a local password keeps both ways in, so it may reset that
  // password like any other.
  if (!user.password) {
    logger.warn(`Local password reset refused for SSO-only account: ${user.id}`);
    throw {
      status: 403,
      message: 'This account signs in with SSO. Reset your password with sso.'
    };
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
