const logger = require('../../logger');
// User is here for the include below: a comment is worth little without the
// name of whoever left it.
const { RecordComment, User } = require('../models');

const COMMENT_ATTRIBUTES = ['id', 'body', 'objectName', 'objectId', 'createdBy', 'companyId', 'createdAt', 'updatedAt'];

const INCLUDE_AUTHOR = {
  model: User,
  as: 'createdByUser',
  required: false,
  attributes: ['id', 'name', 'username']
};

/** One record's comments, oldest first — a thread reads downwards. */
const getComments = async (companyId, objectName, objectId) => {
  const comments = await RecordComment.findAll({
    where: { companyId, objectName, objectId: String(objectId) },
    attributes: COMMENT_ATTRIBUTES,
    include: [INCLUDE_AUTHOR],
    order: [['created_at', 'ASC']]
  });
  logger.debug(`Read ${comments.length} comments on ${objectName} ${objectId} for company ${companyId}`);
  return comments;
};

const createComment = async ({ companyId, objectName, objectId, body, createdBy }) => {
  const comment = await RecordComment.create({
    companyId,
    objectName,
    objectId: String(objectId),
    body,
    createdBy
  });
  return RecordComment.findByPk(comment.id, { attributes: COMMENT_ATTRIBUTES, include: [INCLUDE_AUTHOR] });
};

const getCommentById = async (id, companyId) => RecordComment.findOne({
  where: { id, companyId },
  attributes: COMMENT_ATTRIBUTES
});

const deleteComment = async (id, companyId) => RecordComment.destroy({ where: { id, companyId } });

module.exports = {
  getComments,
  createComment,
  getCommentById,
  deleteComment
};
