const express = require('express');
const router = express.Router();
const { getCompanyProfileView, updateCompanyProfileView } = require('../views/companyProfileView');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware.protect);

router.get('/', getCompanyProfileView);
router.put('/', updateCompanyProfileView);

module.exports = router;

