const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const uploadFile = require('../../middleware/uploadfile');
const helpSupportValidator = require('../../validators/startup/helpSupportValidator');
const { openHelpSupportTicket } = require('../../views/startup/helpSupport.view');

const helpSupportUpload = uploadFile({ subfolder: 'help-support' });
const router = express.Router();

router.use(authMiddleware.protect);

router.post(
  '/open-ticket',
  helpSupportUpload.array('attachments', 10),
  helpSupportValidator.openTicketValidation,
  openHelpSupportTicket
);

module.exports = router;
