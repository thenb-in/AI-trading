'use strict';

// Method 2 routes — the 8-factor engine, the trade lifecycle, and the
// year backtests (Method 2 / Method 3 / Method 2 + discipline).
//
// Mounted by buildApp() extraRoutes at /api/v1/market (see the mount snippet
// returned to the orchestrator for index.js). Every route is authenticated;
// the page-facing endpoints also require the Method 2 module permission
// (view_method2_module — add via app_permissions.js so it is seeded). The
// pulse heartbeat is polled from every page's effects widget, so it is gated
// by authentication only.
const express = require('express');

const { protect } = require('@startup/src/middleware/authMiddleware');
const requirePermission = require('@startup/src/middleware/requirePermission');
const v = require('../views/method2View');

const router = express.Router();

const method2 = requirePermission('view_method2_module');

// ── Live analysis + lifecycle ────────────────────────────────────────────────
router.get('/method2', protect, method2, v.getMethod2View);
router.get('/method2/pulse', protect, v.getPulseView);
// NOTE (migration weave): /method2/autotrade (GET+POST), /method2/catchup and
// /method2/gtt are owned by executionRoutes (they gate on the AUTO_EXECUTION
// master permission and drive executionService). They were duplicated here from
// the legacy monolith; removed to avoid a route collision at /api/v1/market.
router.get('/method2/daybook', protect, method2, v.getDaybookView);

// ── Year backtests ───────────────────────────────────────────────────────────
router.post('/method2/backtest/year', protect, method2, v.runMethod2YearView);
router.get('/method2/backtest/year', protect, method2, v.latestMethod2YearView);
router.get('/method2/backtest/year/csv', protect, method2, v.method2YearCsvView);

router.post('/method3/backtest/year', protect, method2, v.runMethod3YearView);
router.get('/method3/backtest/year', protect, method2, v.latestMethod3YearView);
router.get('/method3/backtest/year/csv', protect, method2, v.method3YearCsvView);

router.post('/method2plus/backtest/year', protect, method2, v.runMethod2PlusYearView);
router.get('/method2plus/backtest/year', protect, method2, v.latestMethod2PlusYearView);
router.get('/method2plus/backtest/year/csv', protect, method2, v.method2PlusYearCsvView);

module.exports = router;
