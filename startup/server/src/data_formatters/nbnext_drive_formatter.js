const nbnextDriveColumns = require('../constants/columns/nbnextDriveColumns');
const { formatResponse } = require('./formatResponse');

function formatFileSize(bytes) {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function mapFileRow(data) {
  return {
    id: data.id,
    fileName: data.fileName,
    objectName:data.objectName,
    filePath: data.filePath,
    fileSize: formatFileSize(data.fileSize),
    mimeType: data.mimeType || null,
    createdByName: data.createdByUser?.name || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null
  };
}

function formatNBnextDriveResponse(files) {
  return formatResponse(files, nbnextDriveColumns, mapFileRow);
}

function formatSingleNBnextDriveResponse(file) {
  const fileData = file.toJSON ? file.toJSON() : file;
  return {
    id: fileData.id,
    fileName: fileData.fileName,
    filePath: fileData.filePath,
    fileSize: formatFileSize(fileData.fileSize),
    fileSizeBytes: fileData.fileSize,
    mimeType: fileData.mimeType || null,
    objectName: fileData.objectName || null,
    objectId: fileData.objectId || null,
    createdByName: fileData.createdByUser?.name || null,
    createdAt: fileData.createdAt || null,
    updatedAt: fileData.updatedAt || null
  };
}

module.exports = {
  formatNBnextDriveResponse,
  formatSingleNBnextDriveResponse
};
