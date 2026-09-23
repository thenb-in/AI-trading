const logger = require('../../logger');
const recordCommentService = require('../services/recordCommentService');
const { MAX_COMMENT_LENGTH } = require('../constants/recordComments');
const allowedPermissions = require('../utils/allowedPermissions');
const { masterKeyOf } = require('../utils/masterKey');

/**
 * A comment is reached through its record, so it needs the same read
 * permission as opening that record would — not just being signed in.
 * `objectName` is whatever master the client passed, so the permission name
 * is built the same way `assertWorkflowMove` builds one for a dynamic master.
 */
const canReadObject = async (userId, objectName) => allowedPermissions(userId, [`read_${masterKeyOf(objectName)}`]);

/**
 * What the panel shows: every comment on this record, with its author's name
 * flattened onto the row so the client reads one shape rather than a nested
 * include.
 */
const listComments = async (companyId, objectName, objectId, userId) => {
  if (!(await canReadObject(userId, objectName))) {
    return { ok: false, forbidden: true, reason: `You need the read_${masterKeyOf(objectName)} permission to see comments on ${objectName} ${objectId}` };
  }
  const comments = await recordCommentService.getComments(companyId, objectName, objectId);
  return {
    ok: true,
    comments: comments.map((comment) => {
      const { createdByUser, ...rest } = comment.toJSON();
      return { ...rest, authorName: createdByUser?.name || createdByUser?.username || null };
    })
  };
};

const addComment = async ({ companyId, objectName, objectId, body, createdBy }) => {
  // Saying something on a record is the master's own right, separate from
  // opening the record: plenty of people should read a discussion without
  // joining it.
  const permission = `comment_${masterKeyOf(objectName)}`;
  if (!(await allowedPermissions(createdBy, [permission]))) {
    return { ok: false, forbidden: true, reason: `You need the ${permission} permission to comment on ${objectName} ${objectId}` };
  }
  const text = String(body || '').trim();
  if (!text) {
    return { ok: false, reason: `A comment on ${objectName} ${objectId} cannot be empty` };
  }
  if (text.length > MAX_COMMENT_LENGTH) {
    return { ok: false, reason: `A comment can be at most ${MAX_COMMENT_LENGTH} characters, this one is ${text.length}` };
  }

  const comment = await recordCommentService.createComment({ companyId, objectName, objectId, body: text, createdBy });
  const { createdByUser, ...rest } = comment.toJSON();
  logger.info(`Comment ${comment.id} added on ${objectName} ${objectId} by ${createdBy}`);
  return { ok: true, comment: { ...rest, authorName: createdByUser?.name || createdByUser?.username || null } };
};

/**
 * A comment is someone's own words, so its author always takes it back. Taking
 * down what someone else said is a different thing — delete_comment grants it,
 * on any record of any master, because moderating a discussion is one job
 * rather than one per master.
 */
const removeComment = async (id, companyId, userId) => {
  const comment = await recordCommentService.getCommentById(id, companyId);
  if (!comment) {
    return { ok: false, notFound: true, reason: `No comment ${id} in this company` };
  }
  const isAuthor = comment.createdBy === userId;
  if (!isAuthor && !(await allowedPermissions(userId, ['delete_comment']))) {
    return {
      ok: false,
      forbidden: true,
      reason: `Comment ${id} was written by someone else — taking it down needs the delete_comment permission`
    };
  }

  await recordCommentService.deleteComment(id, companyId);
  logger.info(`Comment ${id} on ${comment.objectName} ${comment.objectId} deleted by ${isAuthor ? `its author ${userId}` : `${userId}, who holds delete_comment`}`);
  return { ok: true };
};

module.exports = { listComments, addComment, removeComment };
