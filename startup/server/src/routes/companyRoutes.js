const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middleware/authMiddleware');

// Public: signup asks whether an organization exists before offering to join it.
router.get('/exists/:companyId', companyController.companyExists);
router.get('/settings', authMiddleware.protect, companyController.getCompanySettings);
router.put('/settings', authMiddleware.protect, companyController.updateCompanySettings);
router.post('/', authMiddleware.protect, companyController.createCompany);
router.get('/my', authMiddleware.protect, companyController.myCompanies);
router.post('/switch', authMiddleware.protect, companyController.switchCompany);

module.exports = router;
