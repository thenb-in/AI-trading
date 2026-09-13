const fs = require('fs');
const path = require('path');
const logger = require('../../logger');
const env = require('../config/env');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/permissions');
const allowedPermissions = require('../utils/allowedPermissions');
const nbnextDriveController = require('../controllers/nbnextDriveController');

const { NBNEXT_DRIVE } = MASTER_PERMISSION_CONSTANTS;

// `showAll` means "may act on other people's files", which is exactly what
// read_nbnext_drive grants. The delete/download permissions gate the action,
// not its scope — allowedPermissions matches on ANY of the names it is given,
// so including them here would let someone holding only delete_nbnext_drive
// delete everyone's files.
//
// req.user from auth only has { id, company_id } — look up role permissions properly.
async function userHasDrivePermission(userId, permissionNames) {
  if (!userId) {
    return false;
  }
  return allowedPermissions(userId, permissionNames);
}

// A tagged status means the service already described the problem in terms the
// caller can act on, so its message is passed through as-is. Anything untagged
// is a genuine server fault and keeps the "Internal server error" prefix.
function sendDriveError(res, error) {
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }
  return res.status(500).json({ error: `Internal server error: ${error.message}` });
}

async function getAllFiles(req, res) {
  try {
    const companyId = req.user?.company_id || null;
    const userId = req.user?.id || null;
    const showAll = await userHasDrivePermission(userId, [NBNEXT_DRIVE.read.name]);

    const result = await nbnextDriveController.getAllFiles(companyId, userId, showAll);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Get all files error', error);
    sendDriveError(res, error);
  }
}

async function getFileById(req, res) {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id || null;
    const userId = req.user?.id || null;
    const showAll = await userHasDrivePermission(userId, [NBNEXT_DRIVE.read.name]);

    const result = await nbnextDriveController.getFileById(parseInt(id, 10), companyId, userId, showAll);

    res.status(200).json(result);
  } catch (error) {
    logger.error(`Get file by id error: ${req.params.id}`, error);
    sendDriveError(res, error);
  }
}

async function getFilesByObject(req, res) {
  try {
    const companyId = req.user?.company_id || null;
    const { objectName, objectId, startDate, endDate } = req.query;
    if (!objectName || objectId === undefined || objectId === null || objectId === '') {
      return res.status(400).json({ error: `objectName and objectId query parameters are required get objectName: ${objectName} , objectId: ${objectId}` });
    }
    const result = await nbnextDriveController.getFilesByObject(
      companyId,
      objectName,
      String(objectId),
      startDate || null,
      endDate || null
    );
    res.status(200).json(result);
  } catch (error) {
    logger.error('Get files by object error', error);
    sendDriveError(res, error);
  }
}

async function createFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { objectName, objectId, endDate } = req.body;
    const createdBy = req.user?.id || null;
    const companyId = req.user?.company_id || null;

    const fileData = {
      fileName: req.file.originalname,
      filePath: path.relative(env.UPLOADS_DIR, req.file.path).replace(/\\/g, '/'),
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      objectName: objectName || null,
      objectId: objectId || null,
      endDate: endDate || null
    };

    const file = await nbnextDriveController.createFile(fileData, createdBy, companyId);

    res.status(201).json(file);
  } catch (error) {
    logger.error('Create file error', error);
    sendDriveError(res, error);
  }
}

async function deleteFile(req, res) {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id || null;
    const userId = req.user?.id || null;
    const showAll = await userHasDrivePermission(userId, [NBNEXT_DRIVE.read.name]);

    const result = await nbnextDriveController.deleteFile(parseInt(id, 10), companyId, userId, showAll);

    res.status(200).json(result);
  } catch (error) {
    logger.error(`Delete file error: ${req.params.id}`, error);
    sendDriveError(res, error);
  }
}

async function downloadFile(req, res) {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id || null;
    const userId = req.user?.id || null;
    const showAll = await userHasDrivePermission(userId, [NBNEXT_DRIVE.read.name]);

    const fileInfo = await nbnextDriveController.getFileStream(parseInt(id, 10), companyId, userId, showAll);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileInfo.fileName)}"`);
    res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');

    const fileStream = fs.createReadStream(fileInfo.filePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error(`Download file error: ${req.params.id}`, error);
    sendDriveError(res, error);
  }
}

module.exports = {
  getAllFiles,
  getFileById,
  getFilesByObject,
  createFile,
  deleteFile,
  downloadFile
};

