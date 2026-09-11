const logger = require('../../../../logger');
const companyService = require('../../../services/companyService');
const { DELIVERY_STATUS } = require('../../../constants/notificationRules');
const { resolveRecipients } = require('./recipients');
const { buildContext, renderRule } = require('./renderer');
const { deliver } = require('./channels');

const emptySummary = () => ({ sent: 0, skipped: 0, failed: 0, reasons: {} });

const BUCKET = {
  [DELIVERY_STATUS.SENT]: 'sent',
  [DELIVERY_STATUS.SKIPPED]: 'skipped',
  [DELIVERY_STATUS.FAILED]: 'failed'
};

function summarize(deliveries) {
  return deliveries.reduce((totals, { status, reason }) => {
    totals[BUCKET[status]] += 1;
    if (status !== DELIVERY_STATUS.SENT && reason) {
      totals.reasons[reason] = (totals.reasons[reason] || 0) + 1;
    }
    return totals;
  }, emptySummary());
}

/**
 * Send everything one rule has to say about one thing that happened: its enabled channels,
 * to everyone it is addressed to, and a tally of how each of those deliveries went.
 */
async function notifyByRule(rule, trigger = {}) {
  const company = await companyService.getCompanyById(rule.companyId).catch(() => null);
  const context = buildContext({ company, record: trigger.record });
  const rendered = renderRule(rule, context);
  const channels = Object.keys(rendered);

  if (!channels.length) {
    logger.warn(`[notification-rules] rule ${rule.id} (${rule.name}) has no enabled channel; nothing sent`);
    return emptySummary();
  }

  // A test names its own recipient: the rule may address nobody the tester belongs to.
  const recipients = trigger.recipients ?? await resolveRecipients(rule, { record: trigger.record });
  if (!recipients.length) {
    logger.warn(`[notification-rules] rule ${rule.id} (${rule.name}) resolved no recipients; nothing sent`);
    return { ...emptySummary(), reasons: { no_recipients: 1 } };
  }

  const deliveries = [];
  for (const recipient of recipients) {
    for (const channel of channels) {
      deliveries.push(await deliver(channel, {
        rule,
        config: rendered[channel],
        recipient,
        context
      }));
    }
  }

  const summary = summarize(deliveries);
  const reasons = Object.entries(summary.reasons)
    .map(([reason, count]) => `${count} x ${reason}`)
    .join('; ');
  logger.info(
    `[notification-rules] rule ${rule.id} (${rule.name}) over ${channels.join(', ')}: ${summary.sent} sent, ${summary.skipped} skipped, ${summary.failed} failed${reasons ? ` -- ${reasons}` : ''}`
  );
  return summary;
}

module.exports = { notifyByRule };
