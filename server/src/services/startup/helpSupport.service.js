const { createTicketInterface } = require('../../../interfaces/startup/wallet/createTicket');
const logger = require('../../../logger');
const companyService = require('../startup/companyService');
const userService = require('../startup/userService');



const createHelpSupportTicket = async (payload) => {
  logger.info(`[HELP_SUPPORT_TICKET][SERVICE] Processing ticket for user ${payload.userId} in company ${payload.companyId}`);
  const { phone , username, name } = await userService.getUserById(payload.userId);
  const {name:company_name}= await companyService.getCompanyById(payload.companyId);
  const updated_payload ={
    ...payload,
    username,
    phone,
    name,
    company_name
  };
  const interfaceResult = await createTicketInterface(updated_payload);

  return {
    message: interfaceResult?.message,
    interfaceResult
  };
};

module.exports = {
  createHelpSupportTicket
};
