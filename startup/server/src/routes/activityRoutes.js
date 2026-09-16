const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/permissions');
const {
  getAllActivities,
  getActivitiesByHead,
  getActivitiesByHeadAndObjectId,
  undoBatch,
  createActivity
} = require('../views/activityView');

const router = express.Router();
const { ACTIVITY } = MASTER_PERMISSION_CONSTANTS;

// The whole company's log, and a whole master's, are the Activity Logs screen —
// they take its permission.
router.get('/', authMiddleware.protect, requirePermission(ACTIVITY.read.name), getAllActivities);
router.get('/head/:head', authMiddleware.protect, requirePermission(ACTIVITY.read.name), getActivitiesByHead);

// One record's own history is the History button on that record's modal, which
// anyone who can open the record is offered. Reading it back is no more than
// the record they are already looking at.
router.get('/head/:head/object/:objectId', authMiddleware.protect, getActivitiesByHeadAndObjectId);

// Undo: "my recent actions", and the delete-what-it-created reversal of one.
// No requirePermission here — undo checks the permission of the delete it is
// about to run, which varies by object (see undoService).
router.post('/undo/:batchId', authMiddleware.protect, undoBatch);
router.post('/', authMiddleware.protect, requirePermission(ACTIVITY.create.name), createActivity);

module.exports = router;

