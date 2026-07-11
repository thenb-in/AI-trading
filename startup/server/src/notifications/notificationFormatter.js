const { VARIANT_BY_TYPE, DEFAULT_VARIANT } = require('../constants/notifications');

function variantForType(type) {
  return VARIANT_BY_TYPE[type] || DEFAULT_VARIANT;
}

function formatNotification(row) {
  const data = typeof row?.toJSON === 'function' ? row.toJSON() : row;
  return {
    id: String(data.id),
    companyId: data.companyId || data.company_id || null,
    variant: variantForType(data.type),
    title: data.title,
    message: data.message,
    read: Boolean(data.isRead),
    createdAt: data.createdAt || data.created_at || null
  };
}

function formatNotifications(rows = []) {
  return rows.map(formatNotification);
}

module.exports = { formatNotification, formatNotifications };
