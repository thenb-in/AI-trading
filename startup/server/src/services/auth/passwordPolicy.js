const { VALIDATION_MIN_PASSWORD_LENGTH } = require('../../constants/auth');


const assertPasswordPolicy = (password) => {
  if (!password || password.length < VALIDATION_MIN_PASSWORD_LENGTH) {
    throw { status: 400, message: `Password must be at least ${VALIDATION_MIN_PASSWORD_LENGTH} characters` };
  }
  if (!/[A-Z]/.test(password)) {
    throw { status: 400, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    throw { status: 400, message: 'Password must contain at least one number' };
  }
};

module.exports = {
  assertPasswordPolicy
};
