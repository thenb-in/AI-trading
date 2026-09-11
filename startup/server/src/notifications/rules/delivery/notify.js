const logger = require('../../../../logger');
const notificationRuleService = require('../../../services/notificationRuleService');
const { deliverRule } = require('./deliverRule');

// A rule is addressed by its name, and the caller brings the data its message maps
// from.
async function notify({ companyId, ruleName, record } = {}) {
  try {
    if (!companyId || !ruleName) {
      return null;
    }

    const rule = await notificationRuleService.findActiveByName(companyId, ruleName);
    return rule ? await deliverRule(rule, { record }) : null;
  } catch (error) {
    logger.error(`[notification-rules] notify ${ruleName} failed: ${error.message}`, error);
    return null;
  }
}

module.exports = { notify };
