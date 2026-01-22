const fs = require('fs');
const path = require('path');
const { Op: _Op } = require('sequelize');
const logger = require('../../../logger');
const env = require('../../config/env');
const { NBNEXT_DRIVE_FILE_NOT_FOUND, NBNEXT_DRIVE_FILE_NOT_FOUND_ON_DISK } = require('../../constants/startup/errors');
const { NBnextDrive, User } = require('../../models');

const nbnextDriveService = {
  async getAllFiles(companyId, userId, showAll = false) {
    try {
      const where = {
        companyId
      };

      if (!showAll) {
        where.createdBy = userId;
      }

      const files = await NBnextDrive.findAll({
        where,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'fileName', 'filePath', 'fileSize', 'mimeType', 'objectName', 'objectId', 'createdBy', 'companyId', 'createdAt', 'updatedAt'],
        include: [
          {
            model: User,
            as: 'createdByUser',
            required: false,
            attributes: ['id', 'name']
          }
        ]
      });
      return files;
    } catch (error) {
      logger.error('Error fetching all files', error);
      throw new Error(`Failed to fetch files: ${error.message}`);
    }
  },

  async getFileById(id, companyId, userId, showAll = false) {
    try {
      const where = {
        id,
        companyId
      };

      if (!showAll) {
        where.createdBy = userId;
      }

      const file = await NBnextDrive.findOne({
        where,
        attributes: ['id', 'fileName', 'filePath', 'fileSize', 'mimeType', 'objectName', 'objectId', 'createdBy', 'companyId', 'createdAt', 'updatedAt'],
        include: [
          {
            model: User,
            as: 'createdByUser',
            required: false,
            attributes: ['id', 'name']
          }
        ]
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
      const file = await NBnextDrive.create({
        fileName: fileData.fileName,
        filePath: fileData.filePath,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        objectName: fileData.objectName || null,
        objectId: fileData.objectId || null,
        createdBy,
        companyId
      });
      return file;
    } catch (error) {
      logger.error('Error creating file', error);
      throw new Error(`Failed to create file: ${error.message}`);
    }
  },

  async deleteFile(id, companyId, userId, showAll = false) {
    try {
      const where = {
        id,
        companyId
      };

      if (!showAll) {
        where.createdBy = userId;
      }

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

  async getFileStream(id, companyId, userId, showAll = false) {
    try {
      const where = {
        id,
        companyId
      };

      if (!showAll) {
        where.createdBy = userId;
      }

      const file = await NBnextDrive.findOne({ where });

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
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }
};

module.exports = nbnextDriveService;

