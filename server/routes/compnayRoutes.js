// routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/settings',authMiddleware.protect, companyController.getCompanySettings);
router.put('/settings',authMiddleware.protect, companyController.updateCompanySettings);

module.exports = router;
