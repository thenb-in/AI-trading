const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { MASTER_PERMISSION_CONSTANTS, MODULE_PERMISSION_CONSTANTS } = require('../constants/permissions');

const { COMPANY } = MASTER_PERMISSION_CONSTANTS;
const { VIEW_COMPANY_SETTINGS } = MODULE_PERMISSION_CONSTANTS;

// Public: signup asks whether an organization exists before offering to join it.
router.get('/exists/:companyId', companyController.companyExists);
router.get('/settings', authMiddleware.protect, requirePermission(VIEW_COMPANY_SETTINGS.name), companyController.getCompanySettings);
router.put('/settings', authMiddleware.protect, requirePermission(COMPANY.update.name), companyController.updateCompanySettings);
router.post('/', authMiddleware.protect, requirePermission(COMPANY.create.name), companyController.createCompany);
router.get('/my', authMiddleware.protect, companyController.myCompanies);
router.post('/switch', authMiddleware.protect, companyController.switchCompany);

module.exports = router;
