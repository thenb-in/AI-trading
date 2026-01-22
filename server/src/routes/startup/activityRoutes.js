const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const { getAllActivities, getActivitiesByHead, createActivity } = require('../../views/startup/activityView');

const router = express.Router();

// Protected routes - require authentication
router.get('/', authMiddleware.protect, getAllActivities);
router.get('/head/:head', authMiddleware.protect, getActivitiesByHead);
router.post('/', authMiddleware.protect, createActivity);

module.exports = router;

