const {
  RULE_CHANNEL_LABEL,
  SUBJECT_RECIPIENT_LABEL,
  RECIPIENT_MODE,
  NO_RECIPIENTS_LABEL,
  COMPANY_RECIPIENT_LABEL
} = require('../../constants/notificationRules');
const permissionService = require('../../services/permissionService');
const { formatResponse } = require('../../data_formatters/formatResponse');
const notificationRuleColumns = require('../../constants/columns/notificationRuleColumns');
const { plural } = require('../../utils/formattingUtils');

function recipientsLabel(recipients = {}, roleNames = {}, onlyTheSubject = false) {
  if (onlyTheSubject) {
    return SUBJECT_RECIPIENT_LABEL;
  }

  const listFor = (mode) => recipients[mode] || [];
  const permissions = listFor(RECIPIENT_MODE.PERMISSION);
  const users = listFor(RECIPIENT_MODE.USERS);
  const addresses = listFor(RECIPIENT_MODE.ADDRESSES);

  const parts = [
    recipients[RECIPIENT_MODE.COMPANY] && COMPANY_RECIPIENT_LABEL,
    ...listFor(RECIPIENT_MODE.ROLE).map((id) => roleNames[String(id)] || `role ${id}`),
    permissions.length && `anyone who can ${permissions.join(' or ').replace(/_/g, ' ')}`,
    users.length && plural(users.length, 'user', 'users'),
    addresses.length && plural(addresses.length, 'address', 'addresses')
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : NO_RECIPIENTS_LABEL;
}

function formatNotificationRule(row, { roleNames = {}, permissionLabels = new Map() } = {}) {
  const rule = typeof row?.toJSON === 'function' ? row.toJSON() : row;
  const channels = rule.channels || {};

  return {
    id: rule.id,
    name: permissionLabels.get(rule.name) || rule.name,
    is_active: rule.isActive,
    recipientsLabel: recipientsLabel(rule.recipients, roleNames, rule.onlyTheSubject),
    channelsLabel: Object.entries(channels)
      .filter(([, config]) => config?.enabled)
      .map(([channel]) => RULE_CHANNEL_LABEL[channel] || channel)
      .join(', '),
    createdByName: rule.createdByUser?.name || null,
    createdAt: rule.createdAt || null,

    // What the form edits — rule_name is the raw permission its dropdown stores.
    rule_name: rule.name,
    only_the_subject: Boolean(rule.onlyTheSubject),
    recipients: rule.recipients || {},
    channels
  };
}

async function formatNotificationRules(rows = [], { roleNames = {} } = {}) {
  const permissions = await permissionService.getAllPermissions();
  const permissionLabels = new Map(
    permissions.map(({ name, display_name: label }) => [name, label || name])
  );
  return formatResponse(rows, notificationRuleColumns, (row) =>
    formatNotificationRule(row, { roleNames, permissionLabels }));
}

module.exports = { formatNotificationRule, formatNotificationRules };
