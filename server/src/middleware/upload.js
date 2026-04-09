const fs = require('fs');
const path = require('path');
const multer = require('multer');
const env = require('../config/env');
const { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } = require('../constants/file_uploads');

function createUploadDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createStorage(uploadDir) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      createUploadDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
  });
}

const defaultUploadDir = path.join(__dirname, '../uploads');

const uploadSpreadsheet = multer({
  storage: createStorage(defaultUploadDir),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_FILE_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Only ${ALLOWED_FILE_EXTENSIONS.join(', ')} files are allowed for ${file.originalname}`), false);
    }
  }
});

const uploadImage = multer({
  storage: createStorage(defaultUploadDir),
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only image files (${ALLOWED_IMAGE_TYPES.join(', ')}) are allowed. Invalid file type: ${file.mimetype}`), false);
    }
  },
  limits: { fileSize: MAX_FILE_SIZE }
});

const uploadFile = multer({
  storage: createStorage(env.UPLOADS_DIR),
  limits: { fileSize: 100 * 1024 * 1024 }
});

module.exports = { uploadSpreadsheet, uploadImage, uploadFile };
