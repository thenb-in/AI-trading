const nbnextDriveFormatter = require('../../dataFormatters/startup/nbnextDriveFormatter');
const nbnextDriveService = require('../../services/startup/nbnextDriveService');

const nbnextDriveController = {
  async getAllFiles(companyId, userId, showAll) {
    const files = await nbnextDriveService.getAllFiles(companyId, userId, showAll);
    return nbnextDriveFormatter.formatNBnextDriveResponse(files);
  },

  async getFileById(id, companyId, userId, showAll) {
    const file = await nbnextDriveService.getFileById(id, companyId, userId, showAll);
    return nbnextDriveFormatter.formatSingleNBnextDriveResponse(file);
  },

  async getFilesByObject(companyId, objectName, objectId) {
    const files = await nbnextDriveService.getFilesByObject(companyId, objectName, objectId);
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

