const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const uploadFile = require('../middleware/uploadfile');
const { getAllFiles, getFileById, getFilesByObject, createFile, deleteFile, downloadFile } = require('../views/nbnextDriveView');

const nbnextDriveUpload = uploadFile({ subfolder: 'nbnext-drive', fileSize: 100 * 1024 * 1024 });

const router = express.Router();

router.get('/', authMiddleware.protect, getAllFiles);
router.get('/by-object', authMiddleware.protect, getFilesByObject);
router.get('/:id', authMiddleware.protect, getFileById);
router.post('/', authMiddleware.protect, nbnextDriveUpload.single('file'), createFile);
router.delete('/:id', authMiddleware.protect, deleteFile);
router.get('/:id/download', authMiddleware.protect, downloadFile);

module.exports = router;

