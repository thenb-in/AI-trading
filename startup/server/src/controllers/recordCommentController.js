const logger = require('../../logger');
const recordCommentService = require('../services/recordCommentService');
const { MAX_COMMENT_LENGTH } = require('../constants/recordComments');

/**
 * What the panel shows: every comment on this record, with its author's name
 * flattened onto the row so the client reads one shape rather than a nested
 * include.
 */
const listComments = async (companyId, objectName, objectId) => {
  const comments = await recordCommentService.getComments(companyId, objectName, objectId);
  return comments.map((comment) => {
    const { createdByUser, ...rest } = comment.toJSON();
    return { ...rest, authorName: createdByUser?.name || createdByUser?.username || null };
  });
};

const addComment = async ({ companyId, objectName, objectId, body, createdBy }) => {
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
 * A comment is someone's own words, so only they take them back. Removing what
 * someone else said is not an editing right — it is a different thing, and
 * nothing in the product asks for it yet.
 */
const removeComment = async (id, companyId, userId) => {
  const comment = await recordCommentService.getCommentById(id, companyId);
  if (!comment) {
    return { ok: false, notFound: true, reason: `No comment ${id} in this company` };
  }
  if (comment.createdBy !== userId) {
    return {
      ok: false,
      forbidden: true,
      reason: `Comment ${id} was written by someone else, and a comment can only be deleted by its author`
    };
  }

  await recordCommentService.deleteComment(id, companyId);
  logger.info(`Comment ${id} deleted by its author ${userId}`);
  return { ok: true };
};

module.exports = { listComments, addComment, removeComment };
