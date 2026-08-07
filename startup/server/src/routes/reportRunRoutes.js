const express = require('express');

const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { MODULE_PERMISSION_CONSTANTS } = require('../constants/permissions');
const {
  listRuns,
  getRun,
  getRunPayload,
  cancelRun,
  deleteRun
} = require('../controllers/reportRunController');

const router = express.Router();
const { VIEW_REPORT_MODULE } = MODULE_PERMISSION_CONSTANTS;

// Seeing a saved run is seeing a report, so it takes the same permission as
// running one. Every handler is company-scoped on top of this.
router.use(authMiddleware.protect, requirePermission(VIEW_REPORT_MODULE.name));

router.get('/', listRuns);
router.get('/:id', getRun);
router.get('/:id/payload', getRunPayload);
// Stopping your own run is part of running one, so no separate permission.
router.post('/:id/cancel', cancelRun);
router.delete('/:id', deleteRun);

module.exports = router;
