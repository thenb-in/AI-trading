const fs = require('fs').promises;
const path = require('path');
const logger = require('../../logger');

/**
 * Ensure directory and optional subfolder exist. Returns path to subfolder or uploadsDir.
 */
async function ensureDirectoriesExist(uploadsDir, subFolder) {
  await fs.mkdir(uploadsDir, { recursive: true });
  if (!subFolder) {
    return uploadsDir;
  }
  const targetDir = path.join(uploadsDir, subFolder);
  await fs.mkdir(targetDir, { recursive: true });
  return targetDir;
}

/**
 * Move multer temp file to target dir with a generated name. Returns path info.
 */
async function storeTempFile(file, targetDir, options = {}) {
  const prefix = options.prefix ?? '';
  const defaultExtension = options.defaultExtension ?? '.jpg';
  const subFolder = options.subFolder ?? path.basename(targetDir);
  const timestamp = Date.now();
  const ext = path.extname(file.originalname) || defaultExtension;
  const fileName = `${prefix}${timestamp}${ext}`;
  const filePath = path.join(targetDir, fileName);
  await fs.rename(file.path, filePath);
  const relativePath = path.join(subFolder, fileName).replace(/\\/g, '/');
  return { filePath, fileName, relativePath };
}

/**
 * Build public URL for a relative path under uploads (e.g. for APIs that need image URL).
 */
function getPublicUrlForPath(relativePath, uploadsPathSegment, serverUrl) {
  if (!serverUrl) {
    throw new Error(`Server URL is required for getPublicUrlForPath. Received: ${serverUrl}`);
  }
  const base = serverUrl.replace(/\/$/, '');
  const segment = uploadsPathSegment.replace(/^\/|\/$/g, '');
  const rel = relativePath.replace(/^\//, '');
  return `${base}/${segment}/${rel}`;
}

/**
 * Safely delete a file. Ignores ENOENT.
 */
async function deleteTempFile(filePath) {
  if (!filePath) {
    return;
  }
  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
    logger.debug(`[fileUtils] Deleted temp file: ${filePath}`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      logger.warn(`[fileUtils] Failed to delete temp file: ${filePath} - ${err.message}`);
    }
  }
}

module.exports = {
  ensureDirectoriesExist,
  storeTempFile,
  getPublicUrlForPath,
  deleteTempFile
};
