const logger = require('../../../logger');
const userService = require('../../services/userService');
const { NOTIFICATION_NEW, NOTIFICATION_TYPES, NOTIFICATION_FALLBACK_ACTOR_NAME } = require('../../constants/notifications');
const notificationService = require('../../services/notificationService');
const {
  buildPendingApprovalContent,
  buildPendingApprovalMeta
} = require('../messages/pendingApprovalNotificationMessage');
const { formatEntityRef } = require('../utils/notificationMessageUtils');
const { emitToUsers } = require('../notificationEmitter');
const { formatNotification } = require('../notificationFormatter');

async function loadActorName(actorUserId) {
  if (!actorUserId) {
    return NOTIFICATION_FALLBACK_ACTOR_NAME;
  }
  try {
    const user = await userService.getUserById(actorUserId);
    return user?.name || NOTIFICATION_FALLBACK_ACTOR_NAME;
  } catch {
    return NOTIFICATION_FALLBACK_ACTOR_NAME;
  }
}

async function notifyApproverUsers({
  approverIds,
  companyId,
  content,
  entityType,
  entityId,
  actorUserId,
  actorName,
  detail
}) {
  for (const userId of approverIds) {
    const row = await notificationService.create({
      userId,
      companyId,
      type: NOTIFICATION_TYPES.APPROVAL_PENDING,
      title: content.resolvedTitle,
      message: content.resolvedMessage,
      meta: buildPendingApprovalMeta({
        entityType,
        entityId,
        label: content.label,
        detail,
        actorUserId,
        actorName
      })
    });
    emitToUsers([userId], NOTIFICATION_NEW, formatNotification(row));
  }
}

async function runNotifyApproversOfPendingRequest({
  companyId,
  permissionName,
  actorUserId = null,
  entityLabel,
  entityType = null,
  entityId = null,
  detail = null
}) {
  if (!companyId || !permissionName || !entityLabel) {
    return;
  }

  const approverIds = await userService.getActiveUserIdsByPermissionName(
    companyId,
    permissionName,
    { excludeUserId: actorUserId }
  );
  if (approverIds.length === 0) {
    return;
  }

  const actorName = await loadActorName(actorUserId);
  const content = buildPendingApprovalContent({ entityLabel, detail, actorName });

  await notifyApproverUsers({
    approverIds,
    companyId,
    content,
    entityType,
    entityId,
    actorUserId,
    actorName,
    detail
  });

  const entityRef = formatEntityRef(entityType, entityId);
  logger.info(
    `[notifications] ${entityRef} pending by ${actorUserId || 'unknown'} -> notified ${approverIds.length} approver(s)`
  );
}

/** Notify users with the approve permission that a new request awaits action (non-blocking). */
function notifyApproversOfPendingRequest(params) {
  setImmediate(() => {
    runNotifyApproversOfPendingRequest(params).catch((err) => {
      logger.error(`[notifications] notifyApproversOfPendingRequest failed: ${err.message}`, err);
    });
  });
}

module.exports = { notifyApproversOfPendingRequest };
