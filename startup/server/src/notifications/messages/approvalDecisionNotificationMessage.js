const { NOTIFICATION_TYPES } = require('../../constants/notifications');

function buildApprovalDecisionContent({
  entityLabel,
  decision,
  detail,
  actorDisplayName,
  title,
  message
}) {
  const isApproved = decision === 'approved';
  const pastVerb = isApproved ? 'approved' : 'rejected';
  const label = String(entityLabel).trim();
  const resolvedTitle = title || `${label} ${pastVerb}`;
  const resolvedMessage = message || (
    detail
      ? `${label} for ${detail} was ${pastVerb} by ${actorDisplayName}.`
      : `${label} was ${pastVerb} by ${actorDisplayName}.`
  );

  return {
    isApproved,
    pastVerb,
    label,
    type: isApproved ? NOTIFICATION_TYPES.APPROVAL_APPROVED : NOTIFICATION_TYPES.APPROVAL_REJECTED,
    resolvedTitle,
    resolvedMessage
  };
}

function buildApprovalDecisionMeta({
  entityType,
  entityId,
  label,
  decision,
  actor,
  detail
}) {
  return {
    entityType,
    entityId: entityId ?? null,
    entityLabel: label,
    decision,
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? null,
    detail
  };
}

module.exports = {
  buildApprovalDecisionContent,
  buildApprovalDecisionMeta
};
