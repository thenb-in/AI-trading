const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const env = require('../../config/env');
const authMiddleware = require('../../middleware/authMiddleware');
const { getAllFiles, getFileById, getFilesByObject, createFile, deleteFile, downloadFile } = require('../../views/startup/nbnextDriveView');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = env.UPLOADS_DIR;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

router.get('/', authMiddleware.protect, getAllFiles);
router.get('/by-object', authMiddleware.protect, getFilesByObject);
router.get('/:id', authMiddleware.protect, getFileById);
router.post('/', authMiddleware.protect, upload.single('file'), createFile);
router.delete('/:id', authMiddleware.protect, deleteFile);
router.get('/:id/download', authMiddleware.protect, downloadFile);

module.exports = router;

