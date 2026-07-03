const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const uploadFile = require('../middleware/uploadfile');
const { MODULE_PERMISSION_CONSTANTS } = require('../constants/permissions');
const { getCompanyDetailsView, upsertCompanyDetailsView } = require('../views/companyDetailsView');

const { COMPANY, VIEW_COMPANY_SETTINGS } = MODULE_PERMISSION_CONSTANTS;
const logoUpload = uploadFile({ subfolder: 'company_logos' });

router.get(
  '/',
  protect,
  requirePermission([VIEW_COMPANY_SETTINGS.name, COMPANY.read.name]),
  getCompanyDetailsView
);

router.put(
  '/',
  protect,
  requirePermission(COMPANY.update.name),
  logoUpload.single('company_logo'),
  upsertCompanyDetailsView
);

module.exports = router;
