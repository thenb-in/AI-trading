const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const authValidator = require('../validators/authValidator');
const { signup, login, resetPassword, identifyForgotPasswordMethod, approveUser, getAllUsers, getAllRoles, logout, checkAvailability } = require('../views/authView');
const { startSso, ssoCallback, ssoBackchannelLogout } = require('../sso');
const { getPlans, onboard, razorpayWebhook } = require('../onboarding/onboarding.view');
const { createOrder } = require('../razorpay/razorpay.view');

const router = express.Router();

// Public routes
router.post('/signup', authValidator.signupValidation, signup);
router.post('/login', authValidator.loginValidation, login);
router.post('/reset-password', authValidator.resetPasswordValidation, resetPassword);
router.post('/forgot-password/identify', authValidator.forgotPasswordIdentifyValidation, identifyForgotPasswordMethod);
// Public field availability check (company name / username) — used while typing
router.get('/availability', checkAvailability);


// OIDC RP (Wallet IdP)
router.get('/sso/start', startSso);
router.get('/sso/callback', ssoCallback);
router.post('/sso/backchannel-logout', express.urlencoded({ extended: false }), ssoBackchannelLogout);


// Public self-serve onboarding (plan catalogue + Razorpay order + create company/admin/plan)
router.get('/plans', getPlans);
router.post('/payment/order', createOrder);
router.post('/onboard', onboard);
// Razorpay server-to-server webhook (payment.captured / order.paid). Public:
// authenticated by HMAC signature over the raw body, not a session.
router.post('/razorpay/webhook', razorpayWebhook);
router.post('/logout', authMiddleware.protect, logout);
// Protected routes (admin only)
router.post('/approve/:userId', authMiddleware.protect, authValidator.approveUserValidation, approveUser);
router.get('/users', authMiddleware.protect, getAllUsers);

router.get('/roles', getAllRoles);
module.exports = router;
