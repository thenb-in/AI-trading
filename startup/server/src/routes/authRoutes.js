const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/permissions');
const { rateLimit, isFailure, sourceOf } = require('../middleware/rateLimit');
const {
  LOGIN_WINDOW_MS,
  LOGIN_MAX_FAILURES_PER_ACCOUNT,
  LOGIN_MAX_FAILURES_PER_SOURCE,
  RESET_WINDOW_MS,
  RESET_MAX_FAILURES,
  TOTP_WINDOW_MS,
  TOTP_MAX_FAILURES,
  SIGNUP_WINDOW_MS,
  SIGNUP_MAX_FAILURES,
  AVAILABILITY_WINDOW_MS,
  AVAILABILITY_MAX_REQUESTS
} = require('../constants/rateLimits');
const authValidator = require('../validators/authValidator');
const { signup, login, resetPassword, generateTotpSecret, verifyAndEnableTotp, approveUser, getAllUsers, getAllRoles, logout, checkAvailability } = require('../views/authView');
const { startSso, ssoCallback, ssoBackchannelLogout } = require('../sso');

const router = express.Router();
const { USER } = MASTER_PERMISSION_CONSTANTS;

// Who is being guessed at, and who is doing the guessing. An account is limited
// on its own so one under attack cannot lock out the office it shares an
// address with; the address is limited too, so working down a list of accounts
// from one machine runs out just the same.
const usernameOf = (req) => String(req.body?.username || '').trim().toLowerCase() || 'unknown';

const limitLoginPerAccount = rateLimit({
  name: 'login:account',
  windowMs: LOGIN_WINDOW_MS,
  max: LOGIN_MAX_FAILURES_PER_ACCOUNT,
  keyOf: usernameOf,
  countWhen: isFailure,
  subject: 'failed sign-in attempts for this account'
});

const limitLoginPerSource = rateLimit({
  name: 'login:source',
  windowMs: LOGIN_WINDOW_MS,
  max: LOGIN_MAX_FAILURES_PER_SOURCE,
  keyOf: sourceOf,
  countWhen: isFailure,
  subject: 'failed sign-in attempts from here'
});

const limitReset = rateLimit({
  name: 'reset',
  windowMs: RESET_WINDOW_MS,
  max: RESET_MAX_FAILURES,
  keyOf: usernameOf,
  countWhen: isFailure,
  subject: 'failed password resets for this account'
});

const limitTotp = rateLimit({
  name: 'totp',
  windowMs: TOTP_WINDOW_MS,
  max: TOTP_MAX_FAILURES,
  keyOf: sourceOf,
  countWhen: isFailure,
  subject: 'failed authenticator codes'
});

const limitSignup = rateLimit({
  name: 'signup',
  windowMs: SIGNUP_WINDOW_MS,
  max: SIGNUP_MAX_FAILURES,
  keyOf: sourceOf,
  countWhen: isFailure,
  subject: 'failed sign-up attempts from here'
});

// Every keystroke in the name field asks this, so it counts answers rather than
// failures — the point is to stop a stranger reading off the customer list, not
// to interrupt someone typing.
const limitAvailability = rateLimit({
  name: 'availability',
  windowMs: AVAILABILITY_WINDOW_MS,
  max: AVAILABILITY_MAX_REQUESTS,
  keyOf: sourceOf,
  subject: 'availability checks from here'
});

// Public routes
router.post('/signup', limitSignup, authValidator.signupValidation, signup);
// Source first, then account. A source that is already over its budget is
// refused before the account limiter ever sees the request, so someone working
// through invented usernames from one machine cannot keep minting a bucket per
// name after we have stopped answering them.
router.post('/login', limitLoginPerSource, limitLoginPerAccount, authValidator.loginValidation, login);
router.post('/reset-password', limitReset, authValidator.resetPasswordValidation, resetPassword);
// Public field availability check (company name / username) — used while typing.
// The username response also carries isTotpEnabled, which drives the reset flow.
router.get('/availability', limitAvailability, checkAvailability);

// TOTP (Google Authenticator 2FA) enrolment — signed-in only, for the user of the session.
router.post('/generate-totp-secret', authMiddleware.protect, limitTotp, generateTotpSecret);
router.post('/verify-totp', authMiddleware.protect, limitTotp, authValidator.verifyTotpValidation, verifyAndEnableTotp);


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
