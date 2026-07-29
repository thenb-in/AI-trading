const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const authValidator = require('../validators/authValidator');
const { signup, login, resetPassword, generateTotpSecret, verifyAndEnableTotp, approveUser, getAllUsers, getAllRoles, logout, checkAvailability } = require('../views/authView');
const { startSso, ssoCallback, ssoBackchannelLogout } = require('../sso');

const router = express.Router();

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


// NOTE: the public self-serve onboarding endpoints (/plans, /payment/order,
// /onboard, /razorpay/webhook) are NOT framework routes. They belong to the
// app that sells subscriptions — see app/server/src/routes/onboardingRoutes.js,
// which mounts them onto this same /auth prefix.
router.post('/logout', authMiddleware.protect, logout);
// Protected routes (admin only)
router.post('/approve/:userId', authMiddleware.protect, authValidator.approveUserValidation, approveUser);
router.get('/users', authMiddleware.protect, getAllUsers);

router.get('/roles', getAllRoles);
module.exports = router;
