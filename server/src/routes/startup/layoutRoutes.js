const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middleware/authMiddleware');
const LayoutController = require('../../controllers/startup/layoutController');

// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// Layout routes
router.get('/document/:document_name', LayoutController.getLayoutsByDocument);  // todo: do we need this?
router.get('/layout/:layout_id', LayoutController.getLayoutById);
router.post('/create-or-update-layout', LayoutController.createOrUpdateLayout);
router.delete('/layout/:layout_id', LayoutController.deleteLayout);
router.post('/set-default', LayoutController.setDefaultLayout);
router.post('/unset-default', LayoutController.unsetDefaultLayout);

module.exports = router;
