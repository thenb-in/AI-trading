const notificationService = require('../../services/notificationService');
const notificationRuleService = require('../../services/notificationRuleService');
const { RULE_CHANNEL_LABEL, DELIVERY_STATUS } = require('../../constants/notificationRules');

const chosen = (value) => (value && value !== 'all' ? value : undefined);
const readableLog = (row) => row.log || `${row.status} over ${row.channel}`;
const titleCase = (value) => String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);

async function getNotificationLogData(user, filters = {}) {
  const rows = await notificationService.listDeliveries(user.company_id, {
    startDate: filters.start_date,
    endDate: filters.end_date,
    userId: chosen(filters.user_id),
    status: chosen(filters.status),
    channel: chosen(filters.channel)
  });

  const rules = await notificationRuleService.listForCompany(user.company_id).catch(() => []);
  const ruleNameById = new Map((rules || []).map((rule) => [String(rule.id), rule.name]));

  const reportRows = rows.map((row) => ({
    user_name: row.user?.name || row.user?.username || '',
    sent_at: row.createdAt,
    channel: row.channel,
    channel_label: RULE_CHANNEL_LABEL[row.channel] || row.channel,
    status: row.status,
    status_label: titleCase(row.status),
    rule_name: ruleNameById.get(String(row.meta?.ruleId)) || '',
    title: row.title,
    log: readableLog(row),
    message: row.message
  }));

  const countOf = (status) => reportRows.filter((row) => row.status === status).length;

  return {
    rows: reportRows,
    totals: {
      population: reportRows.length,
      population_unit: 'deliveries',
      sent: countOf(DELIVERY_STATUS.SENT),
      failed: countOf(DELIVERY_STATUS.FAILED),
      skipped: countOf(DELIVERY_STATUS.SKIPPED)
    }
  };
}

module.exports = { getNotificationLogData };
