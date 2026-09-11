const notificationService = require('../../../services/notificationService');
const { NOTIFICATION_TYPES, NOTIFICATION_NEW } = require('../../../constants/notifications');
const { RULE_CHANNEL, RULE_CHANNEL_LABEL, DELIVERY_STATUS } = require('../../../constants/notificationRules');
const { emitToUsers } = require('../../notificationEmitter');
const { formatNotification } = require('../../notificationFormatter');
const { addressOf, firstLine } = require('../../utils/deliveryUtils');


async function recordDelivery(channel, { rule, config, recipient, context }, outcome) {
  if (!recipient.userId) {
    return;
  }

  const row = await notificationService.record({
    userId: recipient.userId,
    companyId: rule.companyId,
    type: NOTIFICATION_TYPES.RULE,
    channel,
    status: outcome.status,
    log: firstLine(outcome.reason)
      || `${RULE_CHANNEL_LABEL[channel]} sent to ${addressOf(recipient)}`,
    title: config.title || config.subject || rule.name,
    message: config.body || '',
    meta: { ruleId: rule.id, link: context?.record?.link || null, to: addressOf(recipient) }
  });

  if (channel === RULE_CHANNEL.IN_APP && outcome.status === DELIVERY_STATUS.SENT) {
    emitToUsers([recipient.userId], NOTIFICATION_NEW, formatNotification(row));
  }
}

module.exports = { recordDelivery };
