const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const logger = require('../../logger');
const env = require('../config/env');
const { NBnextDrive, User } = require('../models');
const { getDayRange } = require('../utils/dateUtils');

const NBNEXT_DRIVE_SUMMARY_ATTRIBUTES = ['id', 'fileName', 'filePath', 'fileSize', 'mimeType', 'objectName', 'objectId', 'permissionName', 'createdBy', 'companyId', 'createdAt', 'updatedAt'];

const NBNEXT_DRIVE_INCLUDE_CREATED_BY = {
  model: User,
  as: 'createdByUser',
  required: false,
  attributes: ['id', 'name']
};

// Builds the `where` clause for a single-file lookup that respects the
// "show only my files vs. show everyone in the company" toggle.
function ownedDriveFileWhere(id, companyId, userId, showAll) {
  const where = { id, companyId };
  if (!showAll) {
    where.createdBy = userId;
  }
  return where;
}

// A missing file is a client error, not a server fault, so it is tagged with
// the status the view should return — the repo's usual `error.status` contract.
// The message names the id and the scope that was searched: when the "my files
// only" filter is what hid a file that plainly exists, the 404 says so instead
// of leaving an engineer guessing.
function driveFileNotFound(id, showAll) {
  const error = new Error(`NBnext Drive file ${id} not found${showAll ? ' in this company' : ' among the files you uploaded'}`);
  error.status = 404;
  return error;
}

function driveFileMissingOnDisk(file, filePath) {
  const error = new Error(`NBnext Drive file ${file.id} (${file.fileName}) is recorded in the database but its contents are missing from disk at ${filePath}`);
  error.status = 404;
  return error;
}

const nbnextDriveService = {
  async getAllFiles(companyId, userId, showAll = false) {
    try {
      const where = { companyId };
      if (!showAll) {
        where.createdBy = userId;
      }

      return await NBnextDrive.findAll({
        where,
        order: [['createdAt', 'DESC']],
        attributes: NBNEXT_DRIVE_SUMMARY_ATTRIBUTES,
        include: [NBNEXT_DRIVE_INCLUDE_CREATED_BY]
      });
    } catch (error) {
      logger.error('Error fetching all files', error);
      throw new Error(`Failed to fetch files: ${error.message}`);
    }
  },

  async getFileById(id, companyId, userId, showAll = false) {
    try {
      const file = await NBnextDrive.findOne({
        where: ownedDriveFileWhere(id, companyId, userId, showAll),
        attributes: NBNEXT_DRIVE_SUMMARY_ATTRIBUTES,
        include: [NBNEXT_DRIVE_INCLUDE_CREATED_BY]
      });

      if (!file) {
        throw driveFileNotFound(id, showAll);
      }

      return file;
    } catch (error) {
      logger.error(`Error fetching file by id: ${id}`, error);
      if (error.status) {
        throw error;
      }
      throw new Error(`Failed to fetch file: ${error.message}`);
    }
  },

  async createFile(fileData, createdBy, companyId) {
    try {
      const payload = {
        fileName: fileData.fileName,
        filePath: fileData.filePath,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        objectName: fileData.objectName || null,
        objectId: fileData.objectId || null,
        permissionName: fileData.permissionName || null,
        createdBy,
        companyId
      };
      // When the upload is scoped to a report period, stamp createdAt to the
      // period's end date so the existing date-range filter on getFilesByObject
      // returns the file for that period instead of only "today".
      if (fileData.endDate) {
        const { end_date } = getDayRange(fileData.endDate, fileData.endDate);
        payload.createdAt = end_date;
      }
      const file = await NBnextDrive.create(payload);
      return file;
    } catch (error) {
      logger.error('Error creating file', error);
      throw new Error(`Failed to create file: ${error.message}`);
    }
  },

  async deleteFile(id, companyId, userId, showAll = false) {
    try {
      const where = ownedDriveFileWhere(id, companyId, userId, showAll);
      const file = await NBnextDrive.findOne({ where });

      if (!file) {
        throw driveFileNotFound(id, showAll);
      }

      const filePath = path.join(env.UPLOADS_DIR, file.filePath);

      await NBnextDrive.destroy({ where });

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted file from disk: ${filePath}`);
      }

      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      logger.error(`Error deleting file: ${id}`, error);
      if (error.status) {
        throw error;
      }
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  },

  async getFilesByObject(companyId, objectName, objectId, startDate, endDate) {
    try {
      const where = {
        companyId,
        objectName: objectName || null,
        objectId: objectId ? String(objectId) : null
      };

      if (startDate && endDate) {
        const { start_date, end_date } = getDayRange(startDate, endDate);
        where.createdAt = { [Op.between]: [start_date, end_date] };
      } else if (startDate) {
        const { start_date } = getDayRange(startDate, startDate);
        where.createdAt = { [Op.gte]: start_date };
      } else if (endDate) {
        const { end_date } = getDayRange(endDate, endDate);
        where.createdAt = { [Op.lte]: end_date };
      }

      const files = await NBnextDrive.findAll({
        where,
        order: [['createdAt', 'DESC']],
        attributes: NBNEXT_DRIVE_SUMMARY_ATTRIBUTES,
        include: [NBNEXT_DRIVE_INCLUDE_CREATED_BY]
      });
      return files;
    } catch (error) {
      logger.error('Error fetching files by object', error);
      throw new Error(`Failed to fetch files: ${error.message}`);
    }
  },

  async getFileStream(id, companyId, userId, showAll = false) {
    try {
      const file = await NBnextDrive.findOne({
        where: ownedDriveFileWhere(id, companyId, userId, showAll)
      });

      if (!file) {
        throw driveFileNotFound(id, showAll);
      }

      const filePath = path.join(env.UPLOADS_DIR, file.filePath);

      if (!fs.existsSync(filePath)) {
        throw driveFileMissingOnDisk(file, filePath);
      }

      return {
        filePath,
        fileName: file.fileName,
        mimeType: file.mimeType
      };
    } catch (error) {
      logger.error(`Error getting file stream: ${id}`, error);
      if (error.status) {
        throw error;
      }
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }
};

module.exports = nbnextDriveService;

