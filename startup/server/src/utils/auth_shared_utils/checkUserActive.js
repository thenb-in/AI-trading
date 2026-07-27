const logger = require('../../../logger');
const userService = require('../../services/userService');
const { isSsoManagedAccount } = require('../../config/ssoUserAccess');


const checkUserActive = async (userId) => {
  const { isActive, user } = await userService.checkUserActive(userId);
  if (!isActive) {
    logger.error(`User inactive or not found ${user ? user.username : userId}`);
    return { isActive: false, ssoManaged: false };
  }
  return { isActive: true, ssoManaged: isSsoManagedAccount(user) };
};


module.exports = {
  checkUserActive
};
