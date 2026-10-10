// Zerodha auth (OAuth) + diagnostics routes.
//
// Mounted by buildApp() extraRoutes at the API root (/api/v1) — see the mount
// snippet returned to the orchestrator for index.js.
//
// login + callback are PUBLIC (no `protect`): the Zerodha OAuth redirect and
// its callback are hit by the user's / Zerodha's browser with no app session.
// This matches the source, where the whole app was unauthenticated. The rest
// are called from authenticated app screens, so they carry `protect`.
const express = require('express');

const { protect } = require('@startup/src/middleware/authMiddleware');
const views = require('../views/zerodhaAuthView');

const router = express.Router();

// PUBLIC — OAuth redirect + callback
router.get('/auth/zerodha/login', views.loginView);
router.get('/zerodha/callback', views.callbackView);

// Authenticated reads
router.get('/zerodha/profile', protect, views.profileView);
router.get('/zerodha/instruments', protect, views.instrumentsView);
router.get('/zerodha/ltp/:token', protect, views.ltpView);
router.get('/debug/nifty', protect, views.debugNiftyView);
router.get('/debug/nifty-indices', protect, views.debugNiftyIndicesView);

module.exports = router;
