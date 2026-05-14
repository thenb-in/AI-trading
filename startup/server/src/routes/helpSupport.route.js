const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const uploadFile = require('../middleware/uploadfile');
const helpSupportValidator = require('../validators/helpSupportValidator');
const { openHelpSupportTicket } = require('../views/helpSupport.view');
const helpSupportUpload = uploadFile({ subfolder: 'help-support' });

router.use(authMiddleware.protect);

router.post(
  '/open-ticket',
  helpSupportUpload.array('attachments', 10),
  helpSupportValidator.openTicketValidation,
  openHelpSupportTicket
);

module.exports = router;
