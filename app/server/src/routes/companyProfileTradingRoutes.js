// Company-level trading config (broker refs, symbols, session, modes, tunables).
// Mounted by buildApp() extraRoutes at /api/v1/company-profile/trading (see the
// mount snippet returned to the orchestrator for index.js).
//
// route = protect -> requirePermission -> view. The trading config is a slice of
// the company's CompanyProfile, so it is gated by its own app permission
// (COMPANY_TRADING_CONFIG) spliced into app_permissions.js.
const express = require('express');

const { protect } = require('@startup/src/middleware/authMiddleware');
const requirePermission = require('@startup/src/middleware/requirePermission');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/permissions');
const { getTradingConfigView, updateTradingConfigView } = require('../views/companyProfileTradingView');

const router = express.Router();

const { COMPANY_TRADING_CONFIG } = MASTER_PERMISSION_CONSTANTS;

router.get('/', protect, requirePermission(COMPANY_TRADING_CONFIG.read.name), getTradingConfigView);
router.put('/', protect, requirePermission(COMPANY_TRADING_CONFIG.update.name), updateTradingConfigView);

module.exports = router;
