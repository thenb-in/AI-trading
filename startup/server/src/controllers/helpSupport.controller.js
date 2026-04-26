const logger = require('../../logger');
const helpSupportService = require('../services/helpSupport.service');

const openTicket = async ({ userId, companyId, ticketData }) => {
  logger.info(`[HELP_SUPPORT_TICKET][CONTROLLER] Open ticket request from user ${userId} company ${companyId}`);

  return helpSupportService.createHelpSupportTicket({
    userId,
    companyId,
    ...ticketData
  });
};

module.exports = {
  openTicket
};
