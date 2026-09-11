const { DELIVERY_STATUS } = require('../../constants/notificationRules');

const sent = () => ({ status: DELIVERY_STATUS.SENT });
const skipped = (reason) => ({ status: DELIVERY_STATUS.SKIPPED, reason });
const failed = (reason) => ({ status: DELIVERY_STATUS.FAILED, reason });

/** Turn an interface's { sent, skipped, reason } into a delivery outcome. */
function fromInterfaceResult(result) {
  if (result.sent) {
    return sent();
  }
  return result.skipped ? skipped(result.reason) : failed(result.reason);
}

const addressOf = (recipient) => recipient.email || recipient.phone || recipient.name || 'nobody';

// A thrown reason drags its stack along, and the log column is read by people.
const firstLine = (reason) => String(reason || '').split('\n')[0].trim();

module.exports = { sent, skipped, failed, fromInterfaceResult, addressOf, firstLine };
