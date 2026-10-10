const subscriptionService = require('../services/subscription');
const userService = require('../services/userService');
const { HTTP_STATUS_FORBIDDEN } = require('../constants/http');
const {
  ONLY_SUPERADMINS_CAN_CREATE_GLOBAL_SUBSCRIPTIONS,
  ONLY_SUPERADMINS_CAN_IMPORT_GLOBAL_SUBSCRIPTIONS,
  ONLY_SUPERADMINS_CAN_MODIFY_GLOBAL_SUBSCRIPTIONS
} = require('../constants/errors');

const subscriptionController = {
  async createSubscription(user_id,company_id,name,description,isGlobal,permissions) {
    if (isGlobal && !(await userService.isSupportUser(user_id))) {
      throw { status: HTTP_STATUS_FORBIDDEN, message: ONLY_SUPERADMINS_CAN_CREATE_GLOBAL_SUBSCRIPTIONS };
    }
    const scope = isGlobal ? null : company_id;
    return subscriptionService.createSubscription(name, description, scope, permissions, user_id);
  },

  async getSubscriptions(companyId) {
    return subscriptionService.getSubscriptionsAndPermissions(companyId);
  },

  async updateSubscriptionPermissions({ subscriptionId, permissions, isGlobal, userId }) {
    if (isGlobal && !(await userService.isSupportUser(userId))) {
      throw { status: HTTP_STATUS_FORBIDDEN, message: ONLY_SUPERADMINS_CAN_MODIFY_GLOBAL_SUBSCRIPTIONS };
    }
    return subscriptionService.updateSubscriptionPermissions(subscriptionId, permissions, userId);
  },

  async exportSubscription(subscriptionId) {
    return subscriptionService.exportSubscription(subscriptionId);
  },

  async importSubscription({ userId, companyId, payload }) {
    if (payload?.isGlobal && !(await userService.isSupportUser(userId))) {
      throw { status: HTTP_STATUS_FORBIDDEN, message: ONLY_SUPERADMINS_CAN_IMPORT_GLOBAL_SUBSCRIPTIONS };
    }
    return subscriptionService.importSubscription(payload, companyId, userId);
  },

  async pushToWallet(subscriptionId, userId) {
    return subscriptionService.pushSubscriptionToWalletById(subscriptionId, userId);
  },

  async backfillSubscribedMasters({ apply }) {
    return subscriptionService.backfillSubscribedMasters({ apply });
  }
};

module.exports = subscriptionController;
