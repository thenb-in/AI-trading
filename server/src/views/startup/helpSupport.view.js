const logger = require('../../../logger');
const {
  HTTP_STATUS_CREATED,
  HTTP_STATUS_INTERNAL_ERROR
} = require('../../constants/startup/http');
const helpSupportController = require('../../controllers/startup/helpSupport.controller');
const { sendSuccess, sendError } = require('../../utils/startup/response');


const openHelpSupportTicket = async (req, res) => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.company_id;

    const ticketData = {
      ...req.body,
      attachments: Array.isArray(req.files) ? req.files : []
    };

    const result = await helpSupportController.openTicket({
      userId,
      companyId,
      ticketData
    });

    return sendSuccess(res, {
      statusCode: HTTP_STATUS_CREATED,
      data: result.interfaceResult,
      message: result.message || 'Support ticket request submitted successfully.'
    });
  } catch (error) {
    logger.error(`[HELP_SUPPORT_TICKET][VIEW] Failed to open ticket: ${error.message}`, error);
    return sendError(res, {
      statusCode: HTTP_STATUS_INTERNAL_ERROR,
      message: error.message || 'Failed to submit support ticket.'
    });
  }
};

module.exports = {
  openHelpSupportTicket
};
