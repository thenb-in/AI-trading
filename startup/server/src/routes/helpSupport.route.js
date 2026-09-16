const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { MODULE_PERMISSION_CONSTANTS } = require('../constants/permissions');
const uploadFile = require('../middleware/uploadfile');
const helpSupportValidator = require('../validators/helpSupportValidator');
const { openHelpSupportTicket } = require('../views/helpSupport.view');
const helpSupportUpload = uploadFile({ subfolder: 'help-support' });

// The same permission that offers the Help button offers the endpoint behind it.
router.use(authMiddleware.protect, requirePermission(MODULE_PERMISSION_CONSTANTS.VIEW_HELP_AND_SUPPORT.name));

router.post(
  '/open-ticket',
  helpSupportUpload.array('attachments', 10),
  helpSupportValidator.openTicketValidation,
  openHelpSupportTicket
);

module.exports = router;
