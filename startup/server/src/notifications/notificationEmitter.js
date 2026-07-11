const { getAppServerIo } = require('../socket/client_appserver');
const { userRoom } = require('../socket/utils/rooms');
const logger = require('../../logger');
const { NOTIFICATION_LOG_PREFIX } = require('../constants/notifications');

function emitToUsers(userIds, event, payload) {
  const io = getAppServerIo();
  if (!io) {
    logger.debug(`${NOTIFICATION_LOG_PREFIX} no socket io instance; skipping emit for event=${event}`);
    return;
  }
  for (const userId of userIds) {
    io.to(userRoom(userId)).emit(event, payload);
  }
}

module.exports = { emitToUsers };
