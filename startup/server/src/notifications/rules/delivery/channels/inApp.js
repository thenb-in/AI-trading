const allowedPermissions = require('../../../../utils/allowedPermissions');
const { MODULE_PERMISSION_CONSTANTS } = require('../../../../constants/permissions');
const { sent, skipped } = require('../../../utils/deliveryUtils');

/**
 * In-app: the row every channel writes is itself the bell entry, so this only decides
 * whether the recipient would ever see one.
 */
async function deliverInApp({ recipient }) {
  if (!recipient.userId) {
    return skipped('not_a_user');
  }

  const canSee = await allowedPermissions(
    recipient.userId,
    [MODULE_PERMISSION_CONSTANTS.VIEW_NOTIFICATION.name]
  );
  return canSee ? sent() : skipped('no_view_notification_permission');
}

module.exports = { deliverInApp };
