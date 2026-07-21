const logger = require('../../../logger');
const userService = require('../../services/userService');
const notificationService = require('../../services/notificationService');
const {
  buildApprovalDecisionContent,
  buildApprovalDecisionMeta
} = require('../messages/approvalDecisionNotificationMessage');
const {
  formatEntityRef,
  shouldSkipCreatorNotification
} = require('../utils/notificationMessageUtils');
const { NOTIFICATION_NEW, NOTIFICATION_FALLBACK_ACTOR_NAME } = require('../../constants/notifications');
const { emitToUsers } = require('../notificationEmitter');
const { formatNotification } = require('../notificationFormatter');

async function loadActor(actorUserId) {
  if (!actorUserId) {
    return null;
  }
  try {
    const user = await userService.getUserById(actorUserId);
    return { id: user.id, name: user.name };
  } catch {
    return { id: actorUserId, name: null };
  }
}

async function runNotifyCreatorOfApprovalDecision({
  companyId,
  creatorUserId,
  actorUserId = null,
  entityLabel,
  entityType = null,
  entityId = null,
  decision,
  detail = null,
  title = null,
  message = null
}) {
  if (!companyId || !creatorUserId || !entityLabel || !decision) {
    return;
  }

  const actor = await loadActor(actorUserId);
  if (shouldSkipCreatorNotification(creatorUserId, actor)) {
    return;
  }

  const actorDisplayName = actor?.name || NOTIFICATION_FALLBACK_ACTOR_NAME;
  const content = buildApprovalDecisionContent({
    entityLabel,
    decision,
    detail,
    actorDisplayName,
    title,
    message
  });

  const row = await notificationService.create({
    userId: creatorUserId,
    companyId,
    type: content.type,
    title: content.resolvedTitle,
    message: content.resolvedMessage,
    meta: buildApprovalDecisionMeta({
      entityType,
      entityId,
      label: content.label,
      decision,
      actor,
      detail
    })
  });

  emitToUsers([creatorUserId], NOTIFICATION_NEW, formatNotification(row));

  const entityRef = formatEntityRef(entityType, entityId);
  logger.info(
    `[notifications] ${entityRef} ${content.pastVerb} by ${actor?.id || 'unknown'} -> notified creator ${creatorUserId}`
  );
}

/** Notify the request creator when their item is approved or rejected (non-blocking). */
function notifyCreatorOfApprovalDecision(params) {
  setImmediate(() => {
    runNotifyCreatorOfApprovalDecision(params).catch((err) => {
      logger.error(`[notifications] notifyCreatorOfApprovalDecision failed: ${err.message}`, err);
    });
  });
}

module.exports = { notifyCreatorOfApprovalDecision };
