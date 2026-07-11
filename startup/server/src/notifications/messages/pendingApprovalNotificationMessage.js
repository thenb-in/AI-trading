function buildPendingApprovalContent({ entityLabel, detail, actorName }) {
  const label = String(entityLabel).trim();
  const labelLower = label.toLowerCase();
  const resolvedTitle = detail ? `${label} pending` : `${label} pending approval`;
  const resolvedMessage = detail
    ? `${actorName} submitted ${labelLower} for ${detail} — pending your approval.`
    : `${actorName} submitted a ${labelLower} request — pending your approval.`;

  return {
    label,
    resolvedTitle,
    resolvedMessage
  };
}

function buildPendingApprovalMeta({ entityType, entityId, label, detail, actorUserId, actorName }) {
  return {
    entityType,
    entityId: entityId ?? null,
    entityLabel: label,
    detail,
    actorId: actorUserId ?? null,
    actorName
  };
}

module.exports = {
  buildPendingApprovalContent,
  buildPendingApprovalMeta
};
