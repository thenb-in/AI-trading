const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/permissions');
const { createCrudActivityLogs } = require('../middleware/activityLogMiddleware');
const { getPlaces, createPlace, updatePlace, deletePlace } = require('../views/geographyView');

const router = express.Router();
const { GEOGRAPHY } = MASTER_PERMISSION_CONSTANTS;

const geographyLogs = createCrudActivityLogs('Geography');

router.use(authMiddleware.protect);

router.get('/', requirePermission(GEOGRAPHY.read.name), getPlaces);
router.post('/', requirePermission(GEOGRAPHY.create.name), geographyLogs.create, createPlace);
router.put('/:id', requirePermission(GEOGRAPHY.update.name), geographyLogs.update, updatePlace);
router.delete('/:id', requirePermission(GEOGRAPHY.delete.name), geographyLogs.delete, deletePlace);

module.exports = router;
