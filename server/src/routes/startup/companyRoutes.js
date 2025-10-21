// routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const companyController = require('../../controllers/startup/companyController');
const authMiddleware = require('../../middleware/authMiddleware');

router.get('/settings', authMiddleware.protect, companyController.getCompanySettings);
router.put('/settings', authMiddleware.protect, companyController.updateCompanySettings);
router.post('/', authMiddleware.protect, companyController.createCompany);
router.get('/my', authMiddleware.protect, companyController.myCompanies);
router.post('/switch', authMiddleware.protect, companyController.switchCompany);

module.exports = router;
