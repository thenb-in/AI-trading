const nbnextDriveColumns = require('../../columns/startup/nbnextDriveColumns');

function formatFileSize(bytes) {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatNBnextDriveResponse(files) {
  const rows = files.map(file => {
    const fileData = file.toJSON ? file.toJSON() : file;
    return {
      id: fileData.id,
      fileName: fileData.fileName,
      filePath: fileData.filePath,
      fileSize: formatFileSize(fileData.fileSize),
      createdByName: fileData.createdByUser?.name || null,
      createdAt: fileData.createdAt || null,
      updatedAt: fileData.updatedAt || null
    };
  });

  return {
    columns: nbnextDriveColumns,
    data: rows
  };
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

