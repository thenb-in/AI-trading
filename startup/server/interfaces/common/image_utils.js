const env = require('../../src/config/env');
const { UNREGISTER_FACE_FOLDER } = require('../../src/constants/file_uploads');
const { ensureDirectoriesExist, storeTempFile, deleteTempFile, getPublicUrlForPath } = require('../../src/utils/fileUtils');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../logger');

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
async function getFileFromDir(fileName, companyId, subFolder = '') {
  const safeFileName = path.basename(fileName);
  const imagePath = path.join(
    env.UPLOADS_DIR,
    UNREGISTER_FACE_FOLDER,
    String(companyId || '').trim(),
    subFolder,
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
async function moveToUnregisterFaceFolder(filePath, companyId, subFolder = '') {
  if (!filePath) {
    return null;
  }
  if (!env.UPLOADS_DIR) {
    logger.warn(`[image_utils] UPLOADS_DIR not configured; skipping move to unregisterface for company=${companyId}`);
    return null;
  }

  try {
    const companyFolder = String(companyId || '').trim();
    const unregisterDir = path.join(env.UPLOADS_DIR, UNREGISTER_FACE_FOLDER, companyFolder, subFolder);
    await fs.mkdir(unregisterDir, { recursive: true });

    const fileName = path.basename(filePath);
    const destPath = path.join(unregisterDir, fileName);

    await fs.access(filePath);
    await fs.rename(filePath, destPath);
    logger.info(`[image_utils] Moved image to ${path.relative(env.UPLOADS_DIR, destPath)}`);
    return destPath;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.debug(`[image_utils] Image already removed, cannot move to unregisterface: ${filePath}`);
    } else {
      logger.warn(`[image_utils] Failed to move image to unregisterface: ${filePath} - ${error.message}`);
    }
    return null;
  }
}

module.exports = {
  prepareTempFolder,
  moveUploadedFileToTemp,
  buildUploadsPublicUrl,
  cleanupTempFiles,
  getFileFromDir,
  moveToUnregisterFaceFolder
};
