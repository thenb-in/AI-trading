const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/permissions');
const authValidator = require('../validators/authValidator');
const { signup, login, resetPassword, generateTotpSecret, verifyAndEnableTotp, approveUser, getAllUsers, getAllRoles, logout, checkAvailability } = require('../views/authView');
const { startSso, ssoCallback, ssoBackchannelLogout } = require('../sso');

const router = express.Router();
const { USER } = MASTER_PERMISSION_CONSTANTS;

// Public routes
router.post('/signup', authValidator.signupValidation, signup);
router.post('/login', authValidator.loginValidation, login);
router.post('/reset-password', authValidator.resetPasswordValidation, resetPassword);
// Public field availability check (company name / username) — used while typing.
// The username response also carries isTotpEnabled, which drives the reset flow.
router.get('/availability', checkAvailability);

// TOTP (Google Authenticator 2FA) enrolment
router.post('/generate-totp-secret', authValidator.generateTotpSecretValidation, generateTotpSecret);
router.post('/verify-totp', authValidator.verifyTotpValidation, verifyAndEnableTotp);


// OIDC RP (Wallet IdP)
router.get('/sso/start', startSso);
router.get('/sso/callback', ssoCallback);
router.post('/sso/backchannel-logout', express.urlencoded({ extended: false }), ssoBackchannelLogout);


router.post('/logout', authMiddleware.protect, logout);
router.post('/approve/:userId', authMiddleware.protect, requirePermission(USER.approve.name), authValidator.approveUserValidation, approveUser);
router.get('/users', authMiddleware.protect, requirePermission(USER.read.name), getAllUsers);

// The role list names every role in the company, and fills the role picker on
// the user screens. It was answering anyone at all, signed in or not.
router.get('/roles', authMiddleware.protect, getAllRoles);
module.exports = router;
