const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getCompanyProfileView, updateCompanyProfileView } = require('../views/companyProfileView');

const router = express.Router();

router.use(authMiddleware.protect);

router.get('/', getCompanyProfileView);
router.put('/', updateCompanyProfileView);

module.exports = router;

