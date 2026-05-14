const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const logger = require('../../logger');
const env = require('../config/env');
const { NBNEXT_DRIVE_FILE_NOT_FOUND, NBNEXT_DRIVE_FILE_NOT_FOUND_ON_DISK } = require('../constants/errors');
const { NBnextDrive, User } = require('../models');
const { getDayRange } = require('../utils/dateUtils');

const NBNEXT_DRIVE_SUMMARY_ATTRIBUTES = ['id', 'fileName', 'filePath', 'fileSize', 'mimeType', 'objectName', 'objectId', 'createdBy', 'companyId', 'createdAt', 'updatedAt'];

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
        throw new Error(NBNEXT_DRIVE_FILE_NOT_FOUND);
      }

      return file;
    } catch (error) {
      logger.error(`Error fetching file by id: ${id}`, error);
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
        throw new Error(NBNEXT_DRIVE_FILE_NOT_FOUND);
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
        throw new Error(NBNEXT_DRIVE_FILE_NOT_FOUND);
      }

      const filePath = path.join(env.UPLOADS_DIR, file.filePath);

      if (!fs.existsSync(filePath)) {
        throw new Error(NBNEXT_DRIVE_FILE_NOT_FOUND_ON_DISK);
      }

      return {
        filePath,
        fileName: file.fileName,
        mimeType: file.mimeType
      };
    } catch (error) {
      logger.error(`Error getting file stream: ${id}`, error);
      if (error.message === NBNEXT_DRIVE_FILE_NOT_FOUND || error.message === NBNEXT_DRIVE_FILE_NOT_FOUND_ON_DISK) {
        throw error;
      }
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }
};

module.exports = nbnextDriveService;

