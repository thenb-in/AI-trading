const { UniqueConstraintError } = require('sequelize');
const logger = require('../../logger');
const groupOfCompaniesController = require('../controllers/groupOfCompaniesController');
const { sendSuccess, sendError } = require('../utils/response');
const { HTTP_STATUS_NOT_FOUND, HTTP_STATUS_CONFLICT } = require('../constants/http');

const isDuplicateName = (error) => error instanceof UniqueConstraintError;

async function getGroups(req, res) {
  try {
    const data = await groupOfCompaniesController.list();
    return sendSuccess(res, { data });
  } catch (error) {
    logger.error(`[group-of-companies] list failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function getOptions(req, res) {
  try {
    const data = await groupOfCompaniesController.options();
    return sendSuccess(res, { data });
  } catch (error) {
    logger.error(`[group-of-companies] options failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

// The users of the companies currently picked in the form, so the user selector
// only ever offers users of the group's companies. companyIds arrive as a
// comma-separated query param.
async function getUsersForCompanies(req, res) {
  try {
    const companyIds = String(req.query.companyIds || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const data = await groupOfCompaniesController.usersForCompanies(companyIds);
    return sendSuccess(res, { data });
  } catch (error) {
    logger.error(`[group-of-companies] users-for-companies failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function createGroup(req, res) {
  try {
    const group = await groupOfCompaniesController.create(req.body, req.user?.id);
    return sendSuccess(res, { data: group, message: `Group "${group.name}" created` });
  } catch (error) {
    if (isDuplicateName(error)) {
      return sendError(res, { statusCode: HTTP_STATUS_CONFLICT, message: `"${req.body?.name}" is already a group of companies` });
    }
    logger.error(`[group-of-companies] create "${req.body?.name}" failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function updateGroup(req, res) {
  const { id } = req.params;
  try {
    const group = await groupOfCompaniesController.update(id, req.body);
    if (!group) {
      return sendError(res, { statusCode: HTTP_STATUS_NOT_FOUND, message: `No group of companies ${id}` });
    }
    return sendSuccess(res, { data: group, message: `Group "${group.name}" updated` });
  } catch (error) {
    if (isDuplicateName(error)) {
      return sendError(res, { statusCode: HTTP_STATUS_CONFLICT, message: `"${req.body?.name}" is already a group of companies` });
    }
    logger.error(`[group-of-companies] update ${id} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function deleteGroup(req, res) {
  const { id } = req.params;
  try {
    const removed = await groupOfCompaniesController.remove(id);
    if (!removed) {
      return sendError(res, { statusCode: HTTP_STATUS_NOT_FOUND, message: `No group of companies ${id}` });
    }
    return sendSuccess(res, { message: `Group of companies ${id} deleted` });
  } catch (error) {
    logger.error(`[group-of-companies] delete ${id} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

module.exports = { getGroups, getOptions, getUsersForCompanies, createGroup, updateGroup, deleteGroup };
