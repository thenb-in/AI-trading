const logger = require('../../../../logger');
const userService = require('../../../services/startup/userService');

const checkUserActive = async (userId) => {
  const { isActive, user } = await userService.checkUserActive(userId);
  if (!isActive) {
    logger.error(`User inactive or not found ${user ? user.username : userId}`);
    return false;
  }
  return true;
};


module.exports = {
  checkUserActive
};
