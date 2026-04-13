const fs = require('fs');
const path = require('path');
const multer = require('multer');
const env = require('../config/env');
const { HTTP_STATUS_BAD_REQUEST } = require('../constants/startup/http');
const { sendError } = require('../utils/startup/response');


const MAX_RECOGNITION_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Wraps a multer instance so .single() / .array() / .fields() return middleware that
 * automatically sends JSON response on upload error (file size, type, etc.).
 */
/**
 * Wraps a multer instance so that .single(), .array(), and .fields() methods
 * automatically catch upload errors and return a JSON error response instead of crashing.
 * @param {Object} instance - Multer instance to wrap
 * @returns {Object} The same instance with wrapped methods
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

/**
 * Creates a configured multer instance with disk storage and optional subfolder/size settings.
 * Files are stored with a timestamped unique name in the configured uploads directory.
 * @param {Object} options - Configuration options
 * @param {string} [options.subfolder=''] - Subdirectory within the uploads dir
 * @param {number} [options.fileSize=10485760] - Max file size in bytes (default 10MB)
 * @returns {Object} Configured multer instance
 */
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

/**
 * Builds a multer uploader instance with error-response wrapping.
 * @param {Object} options - Options passed to createMulterInstance
 * @returns {Object} Multer instance with wrapped error handling
 */
function buildUploader(options = {}) {
  return wrapWithErrorResponse(createMulterInstance(options));
}

const defaultUploader = buildUploader();

/**
 * Creates a new file upload middleware with custom options.
 * Also exposes .single(), .array(), .fields() from the default uploader for convenience.
 * @param {Object} options - Multer configuration options (subfolder, fileSize)
 * @returns {Object} Multer instance
 */
function uploadFile(options = {}) {
  return buildUploader(options);
}

uploadFile.single = (...args) => defaultUploader.single(...args);
uploadFile.array = (...args) => defaultUploader.array(...args);
uploadFile.fields = (...args) => defaultUploader.fields(...args);

module.exports = uploadFile;

