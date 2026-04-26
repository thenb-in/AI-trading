const fs = require('fs').promises;
const path = require('path');
const env = require('../../src/config/env');
const { ensureDirectoriesExist, storeTempFile, deleteTempFile, getPublicUrlForPath } = require('../../src/utils/fileUtils');


async function prepareTempFolder(subFolder) {
  if (!env.UPLOADS_DIR) {
    throw new Error(`UPLOADS_DIR is not configured in environment variables ${env.UPLOADS_DIR}`);
  }
  return ensureDirectoriesExist(env.UPLOADS_DIR, subFolder);
}

async function moveUploadedFileToTemp(file, targetDir, options = {}) {
  return storeTempFile(file, targetDir, options);
}

function buildUploadsPublicUrl(relativePath, uploadsPathSegment) {
  return getPublicUrlForPath(relativePath, uploadsPathSegment, env.SERVER_URL);
}

async function cleanupTempFiles(filePaths = []) {
  for (const filePath of filePaths) {
    await deleteTempFile(filePath);
  }
}
async function getFileFromDir(fileName, SUB_FOLDER_NAME,companyId) {
  const safeFileName = path.basename(fileName);
  const imagePath = path.join(
    env.UPLOADS_DIR,
    SUB_FOLDER_NAME,
    String(companyId || '').trim(),
    safeFileName
  );

  await fs.access(imagePath);
  const fileStats = await fs.stat(imagePath);

  const extension = path.extname(safeFileName).toLowerCase();
  const mimeByExt = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
  };

  return {
    path: imagePath,
    originalname: safeFileName,
    filename: path.basename(imagePath),
    size: fileStats.size,
    mimetype: mimeByExt[extension] || 'application/octet-stream'
  };
}
module.exports = {
  prepareTempFolder,
  moveUploadedFileToTemp,
  buildUploadsPublicUrl,
  cleanupTempFiles,
  getFileFromDir
};
