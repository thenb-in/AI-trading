const nbnextDriveFormatter = require('../data_formatters/nbnext_drive_formatter');
const nbnextDriveService = require('../services/nbnextDriveService');

const nbnextDriveController = {
  async getAllFiles(companyId, userId, showAll) {
    const files = await nbnextDriveService.getAllFiles(companyId, userId, showAll);
    return nbnextDriveFormatter.formatNBnextDriveResponse(files);
  },

  async getFileById(id, companyId, userId, showAll) {
    const file = await nbnextDriveService.getFileById(id, companyId, userId, showAll);
    return nbnextDriveFormatter.formatSingleNBnextDriveResponse(file);
  },

  async getFilesByObject(companyId, objectName, objectId, startDate, endDate) {
    const files = await nbnextDriveService.getFilesByObject(companyId, objectName, objectId, startDate, endDate);
    return nbnextDriveFormatter.formatNBnextDriveResponse(files);
  },

  async createFile(fileData, createdBy, companyId) {
    return await nbnextDriveService.createFile(fileData, createdBy, companyId);
  },

  async deleteFile(id, companyId, userId, showAll) {
    return await nbnextDriveService.deleteFile(id, companyId, userId, showAll);
  },

  async getFileStream(id, companyId, userId, showAll) {
    return await nbnextDriveService.getFileStream(id, companyId, userId, showAll);
  }
};

module.exports = nbnextDriveController;

