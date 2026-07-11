const {
  NOTIFICATION_TYPES,
  NOTIFICATION_UNKNOWN_USER_LABEL,
  NOTIFICATION_LOGIN_TITLE
} = require('../../constants/notifications');

function buildLoginNotificationPayload(actor) {
  const actorName = actor.name || NOTIFICATION_UNKNOWN_USER_LABEL;
  return {
    type: NOTIFICATION_TYPES.USER_LOGIN,
    title: NOTIFICATION_LOGIN_TITLE,
    message: `${actorName} just logged in.`,
    meta: { actorId: actor.id, actorName: actor.name || null }
  };
}

module.exports = { buildLoginNotificationPayload };
