const logger = require('../../../logger');
const userService = require('../../services/userService');
const { MASTER_PERMISSION_CONSTANTS } = require('../../constants/permissions');
const notificationService = require('../../services/notificationService');
const { NOTIFICATION_NEW } = require('../../constants/notifications');
const { buildLoginNotificationPayload } = require('../messages/loginNotificationMessage');
const { emitToUsers } = require('../notificationEmitter');
const { formatNotification } = require('../notificationFormatter');

async function notifyCompanyAdminsOfLogin({ companyId, actor }) {
  try {
    if (!companyId || !actor?.id) {
      return;
    }

    const approverIds = await userService.getActiveUserIdsByPermissionName(
      companyId,
      MASTER_PERMISSION_CONSTANTS.USER.approve.name,
      { excludeUserId: actor.id }
    );
    if (approverIds.length === 0) {
      return;
    }

    const payload = buildLoginNotificationPayload(actor);

    for (const userId of approverIds) {
      const row = await notificationService.create({ userId, companyId, ...payload });
      if (!row) {
        continue;
      }
      emitToUsers([userId], NOTIFICATION_NEW, formatNotification(row));
    }

    logger.info(`[notifications] login by ${actor.id} -> notified ${approverIds.length} user approver(s) of company ${companyId}`);
  } catch (err) {
    logger.error(`[notifications] notifyCompanyAdminsOfLogin failed: ${err.message}`, err);
  }
}

module.exports = { notifyCompanyAdminsOfLogin };
