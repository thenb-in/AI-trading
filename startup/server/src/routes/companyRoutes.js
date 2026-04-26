// routes/companyRoutes.js
const express = require('express');
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/settings', authMiddleware.protect, companyController.getCompanySettings);
router.put('/settings', authMiddleware.protect, companyController.updateCompanySettings);
router.post('/', authMiddleware.protect, companyController.createCompany);
router.post('/initial', authMiddleware.protect, companyController.createInitialCompany);
router.post('/join', authMiddleware.protect, companyController.joinCompany);
router.get('/my', authMiddleware.protect, companyController.myCompanies);
router.post('/switch', authMiddleware.protect, companyController.switchCompany);

module.exports = router;
