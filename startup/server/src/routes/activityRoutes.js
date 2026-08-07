const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAllActivities,
  getActivitiesByHead,
  getActivitiesByHeadAndObjectId,
  undoBatch,
  createActivity
} = require('../views/activityView');

const router = express.Router();

// Protected routes - require authentication
router.get('/', authMiddleware.protect, getAllActivities);
router.get('/head/:head', authMiddleware.protect, getActivitiesByHead);
router.get('/head/:head/object/:objectId', authMiddleware.protect, getActivitiesByHeadAndObjectId);

// Undo: "my recent actions", and the delete-what-it-created reversal of one.
// No requirePermission here — undo checks the permission of the delete it is
// about to run, which varies by object (see undoService).
router.post('/undo/:batchId', authMiddleware.protect, undoBatch);
router.post('/', authMiddleware.protect, createActivity);

module.exports = router;

