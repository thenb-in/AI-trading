const {
  RULE_CHANNEL_LABEL,
  RECIPIENT_MODE,
  NO_RECIPIENTS_LABEL,
  COMPANY_RECIPIENT_LABEL
} = require('../../constants/notificationRules');
const permissionService = require('../../services/permissionService');
const { formatResponse } = require('../../data_formatters/formatResponse');
const notificationRuleColumns = require('../../constants/columns/notificationRuleColumns');
const { getRecipientSource } = require('./delivery/recipientSourceRegistry');

const plural = (items, one, many) => `${items.length} ${items.length > 1 ? many : one}`;

function recipientsLabel(recipients = {}, roleNames = {}) {
  const listFor = (mode) => recipients[mode] || [];
  const permissions = listFor(RECIPIENT_MODE.PERMISSION);
  const users = listFor(RECIPIENT_MODE.USERS);
  const addresses = listFor(RECIPIENT_MODE.ADDRESSES);

  // An app's own audiences read the same way: "2 employees", from the label it
  // registered, so the grid never has to know what an app keeps.
  const builtIn = new Set(Object.values(RECIPIENT_MODE));
  const appParts = Object.entries(recipients)
    .filter(([mode, value]) => !builtIn.has(mode) && Array.isArray(value) && value.length > 0)
    .flatMap(([mode, value]) => {
      const source = getRecipientSource(mode);
      const label = source?.label || mode;
      const named = value.filter((entry) => !source?.valueLabels?.[entry]);
      return [
        ...value.filter((entry) => source?.valueLabels?.[entry]).map((entry) => source.valueLabels[entry]),
        named.length > 0 && plural(named, label, `${label}s`)
      ].filter(Boolean);
    });

  const parts = [
    recipients[RECIPIENT_MODE.COMPANY] && COMPANY_RECIPIENT_LABEL,
    ...listFor(RECIPIENT_MODE.ROLE).map((id) => roleNames[String(id)] || `role ${id}`),
    permissions.length && `anyone who can ${permissions.join(' or ').replace(/_/g, ' ')}`,
    users.length && plural(users, 'user', 'users'),
    addresses.length && plural(addresses, 'address', 'addresses'),
    ...appParts
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
    recipientsLabel: recipientsLabel(rule.recipients, roleNames),
    channelsLabel: Object.entries(channels)
      .filter(([, config]) => config?.enabled)
      .map(([channel]) => RULE_CHANNEL_LABEL[channel] || channel)
      .join(', '),
    createdByName: rule.createdByUser?.name || null,
    createdAt: rule.createdAt || null,

    // What the form edits — rule_name is the raw permission its dropdown stores.
    rule_name: rule.name,
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
