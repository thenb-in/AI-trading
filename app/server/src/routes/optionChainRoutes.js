'use strict';

// Option-chain / OI endpoints, migrated from the legacy marketController/market
// route pair (/nifty/snapshots) and the inline index.js /market/chain/* handlers.
// Mounted by buildApp() extraRoutes at `${prefix}/market` (see the mount snippet
// returned to the orchestrator for index.js / app_routes).
//
// The source routes were public; conforming to the authed admin shell they now
// require protect + the Option Chain module permission (view_option_chain_module).
const { Router } = require('express');

const { protect } = require('@startup/src/middleware/authMiddleware');
const requirePermission = require('@startup/src/middleware/requirePermission');
const { MODULE_PERMISSION_CONSTANTS } = require('../constants/permissions');
const {
  getRecentOptionSnapshotsView,
  getLiveChainView,
  getBookmarksView,
  saveBookmarksView,
  getSpreadSummaryView,
  runChainBenchmarkView,
  getFeedStatusView
} = require('../views/optionChainView');

const router = Router();

const optionChain = requirePermission(MODULE_PERMISSION_CONSTANTS.OPTION_CHAIN.name);

router.get('/nifty/snapshots', protect, optionChain, getRecentOptionSnapshotsView);
router.get('/chain/live', protect, optionChain, getLiveChainView);
router.get('/chain/bookmarks', protect, optionChain, getBookmarksView);
router.post('/chain/bookmarks', protect, optionChain, saveBookmarksView);
router.get('/chain/spreads/summary', protect, optionChain, getSpreadSummaryView);
router.post('/chain/benchmark', protect, optionChain, runChainBenchmarkView);
router.get('/chain/feed-status', protect, optionChain, getFeedStatusView);

module.exports = router;
