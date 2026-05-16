const fs = require('fs');
const path = require('path');
const logger = require('../../logger');
const env = require('../config/env');
const { NBNEXT_DRIVE_FILE_NOT_FOUND, NBNEXT_DRIVE_FILE_NOT_FOUND_ON_DISK } = require('../constants/errors');
const nbnextDriveController = require('../controllers/nbnextDriveController');


async function getAllFiles(req, res) {
  try {
    const companyId = req.user?.company_id || null;
    const userId = req.user?.id || null;
    const showAll = req.user?.permissions?.some(p => p.name === 'read_nbnext_drive') || false;

    const result = await nbnextDriveController.getAllFiles(companyId, userId, showAll);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Get all files error', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

async function getFileById(req, res) {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id || null;
    const userId = req.user?.id || null;
    const showAll = req.user?.permissions?.some(p => p.name === 'read_nbnext_drive') || false;

    const result = await nbnextDriveController.getFileById(parseInt(id, 10), companyId, userId, showAll);

    res.status(200).json(result);
  } catch (error) {
    logger.error(`Get file by id error: ${req.params.id}`, error);
    if (error.message === NBNEXT_DRIVE_FILE_NOT_FOUND) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
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
    res.status(500).json({ error: `Internal server error: ${error.message}` });
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
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

async function deleteFile(req, res) {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id || null;
    const userId = req.user?.id || null;
    const showAll = req.user?.permissions?.some(p => p.name === 'read_nbnext_drive') || false;

    const result = await nbnextDriveController.deleteFile(parseInt(id, 10), companyId, userId, showAll);

    res.status(200).json(result);
  } catch (error) {
    logger.error(`Delete file error: ${req.params.id}`, error);
    if (error.message === NBNEXT_DRIVE_FILE_NOT_FOUND) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
  }
}

async function downloadFile(req, res) {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id || null;
    const userId = req.user?.id || null;
    const showAll = req.user?.permissions?.some(p => p.name === 'read_nbnext_drive') || false;

    const fileInfo = await nbnextDriveController.getFileStream(parseInt(id, 10), companyId, userId, showAll);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileInfo.fileName)}"`);
    res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');

    const fileStream = fs.createReadStream(fileInfo.filePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error(`Download file error: ${req.params.id}`, error);
    if (error.message === NBNEXT_DRIVE_FILE_NOT_FOUND || error.message === NBNEXT_DRIVE_FILE_NOT_FOUND_ON_DISK) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
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

