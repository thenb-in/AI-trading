const logger = require('../../../../../logger');
const { RULE_CHANNEL } = require('../../../../constants/notificationRules');
const { failed } = require('../../../utils/deliveryUtils');
const { recordDelivery } = require('../recordDelivery');
const { deliverInApp } = require('./inApp');
const { deliverMail } = require('./mail');
const { deliverWhatsapp } = require('./whatsapp');

const DELIVERERS = {
  [RULE_CHANNEL.IN_APP]: deliverInApp,
  [RULE_CHANNEL.EMAIL]: deliverMail,
  [RULE_CHANNEL.WHATSAPP]: deliverWhatsapp
};

/**
 * Deliver one channel to one recipient, never throwing. Every attempt is written down,
 * and a log that could not be written must not lose the delivery it was describing.
 */
async function deliver(channel, args) {
  const deliverer = DELIVERERS[channel];
  if (!deliverer) {
    return failed(`unknown channel ${channel}`);
  }

  let outcome;
  try {
    outcome = await deliverer(args);
  } catch (error) {
    outcome = failed(error.message);
  }

  try {
    await recordDelivery(channel, args, outcome);
  } catch (error) {
    logger.error(
      `[notification-rules] rule ${args.rule?.id} ${channel} delivery could not be logged: ${error.message}`,
      error
    );
  }
  return outcome;
}

module.exports = { deliver };
