const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/permissions');
const { createCrudActivityLogs } = require('../middleware/activityLogMiddleware');
const { namingSeriesCreateValidation, namingSeriesUpdateValidation } = require('../validators/namingSeriesValidator');
const { getSeries, getMasterForSeries, createSeries, updateSeries, deleteSeries } = require('../views/namingSeriesView');

const router = express.Router();
const { NAMING_SERIES } = MASTER_PERMISSION_CONSTANTS;

const seriesLogs = createCrudActivityLogs('NamingSeries');

router.use(authMiddleware.protect);

router.get('/master-for-series', requirePermission(NAMING_SERIES.read.name), getMasterForSeries);
router.get('/', requirePermission(NAMING_SERIES.read.name), getSeries);
router.post('/', requirePermission(NAMING_SERIES.create.name), namingSeriesCreateValidation, seriesLogs.create, createSeries);
router.put('/:id', requirePermission(NAMING_SERIES.update.name), namingSeriesUpdateValidation, seriesLogs.update, updateSeries);
router.delete('/:id', requirePermission(NAMING_SERIES.delete.name), seriesLogs.delete, deleteSeries);

module.exports = router;
