const fs = require('fs');
const path = require('path');
const multer = require('multer');
const env = require('../config/env');
const { HTTP_STATUS_BAD_REQUEST } = require('../constants/http');
const { sendError } = require('../utils/response');


const MAX_RECOGNITION_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Wraps a multer instance so .single() / .array() / .fields() return middleware that
 * automatically sends JSON response on upload error (file size, type, etc.).
 */
function wrapWithErrorResponse(instance) {
  const single = instance.single.bind(instance);
  const array = instance.array?.bind(instance);
  const fields = instance.fields?.bind(instance);

  instance.single = (fieldName) => {
    const mw = single(fieldName);
    return (req, res, next) => {
      mw(req, res, (err) => {
        if (err) {
          const message = err.message || 'File upload failed';
          return sendError(res, { statusCode: HTTP_STATUS_BAD_REQUEST, message });
        }
        next();
      });
    };
  };
  if (array) {
    instance.array = (fieldName, maxCount) => {
      const mw = array(fieldName, maxCount);
      return (req, res, next) => {
        mw(req, res, (err) => {
          if (err) {
            const message = err.message || 'File upload failed';
            return sendError(res, { statusCode: HTTP_STATUS_BAD_REQUEST, message });
          }
          next();
        });
      };
    };
  }
  if (fields) {
    instance.fields = (fieldsConfig) => {
      const mw = fields(fieldsConfig);
      return (req, res, next) => {
        mw(req, res, (err) => {
          if (err) {
            const message = err.message || 'File upload failed';
            return sendError(res, { statusCode: HTTP_STATUS_BAD_REQUEST, message });
          }
          next();
        });
      };
    };
  }
  return instance;
}

function createMulterInstance(options = {}) {
  const { subfolder = '', fileSize = MAX_RECOGNITION_FILE_SIZE_BYTES } = options;
  const baseUploadDir = env.UPLOADS_DIR;
  const destinationDir = subfolder
    ? path.join(baseUploadDir, subfolder)
    : baseUploadDir;

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }
      cb(null, destinationDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  });

  return multer({
    storage,
    limits: { fileSize }
  });
}

function buildUploader(options = {}) {
  return wrapWithErrorResponse(createMulterInstance(options));
}

const defaultUploader = buildUploader();

function uploadFile(options = {}) {
  return buildUploader(options);
}

uploadFile.single = (...args) => defaultUploader.single(...args);
uploadFile.array = (...args) => defaultUploader.array(...args);
uploadFile.fields = (...args) => defaultUploader.fields(...args);

module.exports = uploadFile;

