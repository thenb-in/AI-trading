const express = require('express');
const router = express.Router();
const companyProfileController = require('../controllers/companyProfileController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware.protect);

router.get('/', companyProfileController.getCompanyProfile);
router.put('/', companyProfileController.updateCompanyProfile);

module.exports = router;

