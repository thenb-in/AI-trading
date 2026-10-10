// Backtests, seasonality and candle-store endpoints (migrated from the legacy
// inline index.js handlers). Mounted by buildApp() extraRoutes at
// /api/v1/market (see the mount snippet returned to the orchestrator).
//
// route = protect -> requirePermission -> view. YT-backtest and seasonality
// screens are gated by their own app module permissions (spliced into
// app_permissions.js). The candle-store reads are generic chart infrastructure
// consumed by several screens, so they are gated by authentication only.
const express = require('express');

const { protect } = require('@startup/src/middleware/authMiddleware');
const requirePermission = require('@startup/src/middleware/requirePermission');
const { MODULE_PERMISSION_CONSTANTS } = require('../constants/permissions');
const {
  runYtBacktestView,
  latestYtReportView,
  ytReportCsvView,
  seasonalityView,
  tiltStateView,
  setTiltView,
  resampledCandlesView,
  candleStatusView
} = require('../views/backtestView');

const router = express.Router();

const { VIEW_YT_BACKTEST_MODULE, VIEW_SEASONALITY_MODULE } = MODULE_PERMISSION_CONSTANTS;

// YT year backtest
router.post('/yt/backtest/year', protect, requirePermission(VIEW_YT_BACKTEST_MODULE.name), runYtBacktestView);
router.get('/yt/backtest/year', protect, requirePermission(VIEW_YT_BACKTEST_MODULE.name), latestYtReportView);
router.get('/yt/backtest/year/csv', protect, requirePermission(VIEW_YT_BACKTEST_MODULE.name), ytReportCsvView);

// Financial-year seasonality + live tilt switch
router.get('/seasonality', protect, requirePermission(VIEW_SEASONALITY_MODULE.name), seasonalityView);
router.get('/seasonality/tilt', protect, requirePermission(VIEW_SEASONALITY_MODULE.name), tiltStateView);
router.post('/seasonality/tilt', protect, requirePermission(VIEW_SEASONALITY_MODULE.name), setTiltView);

// Candle store (DB) — generic chart reads, authenticated
router.get('/candles/resampled', protect, resampledCandlesView);
router.get('/candles/status', protect, candleStatusView);

module.exports = router;
