const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const controller = require('../controllers/dataAccess.controller');

router.get('/:userId', authMiddleware.protect, controller.getUserDataAccess);
router.post('/', authMiddleware.protect, controller.setUserDataAccess);

module.exports = router;


