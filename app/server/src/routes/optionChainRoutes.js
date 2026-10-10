'use strict';

// Option-chain / OI endpoints, migrated from the legacy marketController/market
// route pair (/nifty/snapshots) and the inline index.js /market/chain/* handlers.
// Mounted by buildApp() extraRoutes at `${prefix}/market` (see the mount snippet
// returned to the orchestrator for index.js / app_routes).
//
// Kept public to preserve the source behaviour exactly (the legacy routes had no
// auth); see FINDINGS — the framework convention would gate these with protect +
// a permission, deferred to the weave.
const { Router } = require('express');
const {
  getRecentOptionSnapshotsView,
  getLiveChainView,
  getBookmarksView,
  saveBookmarksView,
  getSpreadSummaryView,
  runChainBenchmarkView,
  getFeedStatusView,
} = require('../views/optionChainView');

const router = Router();

router.get('/nifty/snapshots', getRecentOptionSnapshotsView);
router.get('/chain/live', getLiveChainView);
router.get('/chain/bookmarks', getBookmarksView);
router.post('/chain/bookmarks', saveBookmarksView);
router.get('/chain/spreads/summary', getSpreadSummaryView);
router.post('/chain/benchmark', runChainBenchmarkView);
router.get('/chain/feed-status', getFeedStatusView);

module.exports = router;
