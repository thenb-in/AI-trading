const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAllActivities,
  getActivitiesByHead,
  getActivitiesByHeadAndObjectId,
  createActivity
} = require('../views/activityView');

const router = express.Router();

// Protected routes - require authentication
router.get('/', authMiddleware.protect, getAllActivities);
router.get('/head/:head', authMiddleware.protect, getActivitiesByHead);
router.get('/head/:head/object/:objectId', authMiddleware.protect, getActivitiesByHeadAndObjectId);
router.post('/', authMiddleware.protect, createActivity);

module.exports = router;

