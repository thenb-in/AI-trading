const {
  findUserWithRole,
  findUserWithRoleById,
  issueTokensAndPersist,
  buildLoginPayload,
  verifyCredentials,
  loginUser
} = require('./login');
const { signup } = require('./signup');
const { resetPassword } = require('./resetPassword');

module.exports = {
  signup,
  loginUser,
  verifyCredentials,
  resetPassword,
  findUserWithRole,
  findUserWithRoleById,
  issueTokensAndPersist,
  buildLoginPayload
};
