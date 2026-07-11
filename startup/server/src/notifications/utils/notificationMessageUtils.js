function formatEntityRef(entityType, entityId) {
  return entityType ? `${entityType}#${entityId}` : `entity#${entityId}`;
}

function shouldSkipCreatorNotification(creatorUserId, actor) {
  return Boolean(actor?.id && creatorUserId === actor.id);
}

module.exports = {
  formatEntityRef,
  shouldSkipCreatorNotification
};
