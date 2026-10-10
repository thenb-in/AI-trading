// Market read endpoints for the Market dashboard (Method 1 / chart + signals)
// and the shared header/pulse widgets.
//
// Mounted by buildApp() extraRoutes at the API prefix (see the mount snippet
// returned to the orchestrator for app_routes.js). Legacy paths are preserved
// exactly — `/market/...` and `/options/nifty` — so the client contract is
// unchanged.
//
// route = protect -> requirePermission -> view. The dashboard is a MODULE (not
// a master), gated by its own app module permission (view_market_module)
// spliced into app_permissions.js.
const express = require('express');

const { protect } = require('@startup/src/middleware/authMiddleware');
const requirePermission = require('@startup/src/middleware/requirePermission');
const { MODULE_PERMISSION_CONSTANTS } = require('../constants/permissions');
const view = require('../views/marketView');

const router = express.Router();

const marketPerm = requirePermission(MODULE_PERMISSION_CONSTANTS.MARKET_DASHBOARD.name);

router.get('/options/nifty', protect, marketPerm, view.getNiftyOptionsView);

router.get('/market/nifty/candles', protect, marketPerm, view.getNiftyCandlesView);
router.get('/market/nifty/indicators', protect, marketPerm, view.getNiftyIndicatorsView);
router.get('/market/banknifty/indicators', protect, marketPerm, view.getBankNiftyIndicatorsView);
router.get('/market/nifty/bias', protect, marketPerm, view.getNiftyBiasView);
router.get('/market/nifty/pcr', protect, marketPerm, view.getNiftyPcrView);
router.get('/market/nifty/signal', protect, marketPerm, view.getNiftySignalView);
router.get('/market/nifty', protect, marketPerm, view.getNiftyView);
router.get('/market/banknifty', protect, marketPerm, view.getBankNiftyView);
router.get('/market/vix', protect, marketPerm, view.getVixView);
router.get('/market/session', protect, marketPerm, view.getSessionView);
router.get('/market/nifty/supertrend', protect, marketPerm, view.getNiftySuperTrendView);
router.get('/market/nifty/macd', protect, marketPerm, view.getNiftyMacdView);
router.get('/market/nifty/volume', protect, marketPerm, view.getNiftyVolumeView);
router.get('/market/nifty/oi-change', protect, marketPerm, view.getNiftyOiChangeView);
router.get('/market/nifty/max-pain', protect, marketPerm, view.getNiftyMaxPainView);
router.get('/market/nifty/cpr', protect, marketPerm, view.getNiftyCprView);
router.get('/market/nifty/oi-sr', protect, marketPerm, view.getNiftyOiSrView);
router.get('/market/candles', protect, marketPerm, view.getCandlesView);
router.get('/market/chart-analysis', protect, marketPerm, view.getChartAnalysisView);
router.get('/market/spot-summary', protect, marketPerm, view.getSpotSummaryView);
router.get('/market/trade-mode', protect, marketPerm, view.getTradeModeView);
router.post('/market/trade-mode', protect, marketPerm, view.setTradeModeView);

module.exports = router;
