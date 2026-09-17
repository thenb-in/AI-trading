const logger = require('../../logger');
const announcementController = require('../controllers/announcementController');
const { sendSuccess, sendError } = require('../utils/response');
const { HTTP_STATUS_NOT_FOUND } = require('../constants/http');

async function getAnnouncements(req, res) {
  try {
    const { columns, data } = await announcementController.list(req.user?.company_id);
    return sendSuccess(res, { data: { columns, announcements: data } });
  } catch (error) {
    logger.error(`[announcements] list failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

// The banner every signed-in user reads. No permission gates it: an announcement
// is addressed to people, and being shown one is not reading the master.
async function getActiveAnnouncements(req, res) {
  try {
    const announcements = await announcementController.active(req.user?.company_id, req.user?.id);
    return sendSuccess(res, { data: { announcements } });
  } catch (error) {
    logger.error(`[announcements] active failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function createAnnouncement(req, res) {
  try {
    const announcement = await announcementController.create(req.body, req.user?.company_id, req.user?.id);
    return sendSuccess(res, { data: announcement, message: `${announcement.title} created` });
  } catch (error) {
    logger.error(`[announcements] create failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function updateAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const announcement = await announcementController.update(id, req.user?.company_id, req.body);
    if (!announcement) {
      return sendError(res, {
        statusCode: HTTP_STATUS_NOT_FOUND,
        message: `No announcement ${id} in this company`
      });
    }
    return sendSuccess(res, { data: announcement, message: `${announcement.title} updated` });
  } catch (error) {
    logger.error(`[announcements] update ${req.params?.id} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const removed = await announcementController.remove(id, req.user?.company_id);
    if (!removed) {
      return sendError(res, {
        statusCode: HTTP_STATUS_NOT_FOUND,
        message: `No announcement ${id} in this company`
      });
    }
    return sendSuccess(res, { message: `Announcement ${id} deleted` });
  } catch (error) {
    logger.error(`[announcements] delete ${req.params?.id} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

module.exports = {
  getAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};
