const notificationService = require('../../../services/notificationService');
const { sendMail } = require('../../../../interfaces/mailer/mailerInterface');
const { sendWhatsappMessage } = require('../../../../interfaces/whatsapp/whatsappInterface');
const { NOTIFICATION_TYPES, NOTIFICATION_NEW } = require('../../../constants/notifications');
const { RULE_CHANNEL, DELIVERY_STATUS } = require('../../../constants/notificationRules');
const { renderNamedValues } = require('./renderer');
const { emitToUsers } = require('../../notificationEmitter');
const { formatNotification } = require('../../notificationFormatter');

const skipped = (reason) => ({ status: DELIVERY_STATUS.SKIPPED, reason });
const sent = () => ({ status: DELIVERY_STATUS.SENT });
const failed = (reason) => ({ status: DELIVERY_STATUS.FAILED, reason });

/** Turn an interface's { sent, skipped, reason } into a delivery outcome. */
const fromInterfaceResult = (result) => {
  if (result.sent) {
    return sent();
  }
  return result.skipped ? skipped(result.reason) : failed(result.reason);
};

/**
 * In-app: a row on the bell plus a live socket push.
 *
 */
async function deliverInApp({ rule, config, recipient, context }) {
  if (!recipient.userId) {
    return skipped('not_a_user');
  }

  const row = await notificationService.create({
    userId: recipient.userId,
    companyId: rule.companyId,
    type: NOTIFICATION_TYPES.RULE,
    title: config.title || rule.name,
    message: config.body,
    meta: { ruleId: rule.id, link: context?.record?.link || null }
  });
  if (!row) {
    return skipped('no_view_notification_permission');
  }

  emitToUsers([recipient.userId], NOTIFICATION_NEW, formatNotification(row));
  return sent();
}

async function deliverEmail({ rule, config, recipient }) {
  if (!recipient.email) {
    return skipped('no_email_address');
  }
  const result = await sendMail({
    to: recipient.email,
    subject: config.subject || rule.name,
    body: config.body
  });
  return fromInterfaceResult(result);
}

// The rule carries the approved template's name; the rendered message is its one variable.
async function deliverWhatsapp({ rule, config, recipient, context }) {
  if (!recipient.phone) {
    return skipped('no_phone_number');
  }
  if (!config.template_name) {
    return skipped('no_template_name');
  }

  const raw = rule.channels?.[RULE_CHANNEL.WHATSAPP] || {};
  const result = await sendWhatsappMessage({
    phone: recipient.phone,
    templateName: config.template_name,
    header: renderNamedValues(raw.header, context),
    body: renderNamedValues(raw.body, context),
    text: config.body?.trim()
  });
  return fromInterfaceResult(result);
}

const DELIVERERS = {
  [RULE_CHANNEL.IN_APP]: deliverInApp,
  [RULE_CHANNEL.EMAIL]: deliverEmail,
  [RULE_CHANNEL.WHATSAPP]: deliverWhatsapp
};

/**
 * Deliver one channel to one recipient, never throwing.
 */
async function deliver(channel, args) {
  const deliverer = DELIVERERS[channel];
  if (!deliverer) {
    return failed(`unknown channel ${channel}`);
  }
  try {
    return await deliverer(args);
  } catch (error) {
    return failed(error.message);
  }
}

module.exports = { deliver };
