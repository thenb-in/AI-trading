const nbnextDriveFormatter = require('../data_formatters/nbnext_drive_formatter');
const nbnextDriveService = require('../services/nbnextDriveService');

/**
 * Controller layer for NBnext Drive file operations.
 * Delegates to nbnextDriveService and formats responses via nbnextDriveFormatter.
 */
const nbnextDriveController = {
  /**
   * Retrieves all files for a company, optionally filtered by user ownership.
   * @param {string} companyId - Company scope
   * @param {string|number} userId - Requesting user's ID
   * @param {boolean} showAll - If true, return all company files regardless of uploader
   * @returns {Promise<Array<Object>>} Formatted file list
   */
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

