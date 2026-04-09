const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const { uploadFile } = require('../../middleware/upload');
const { getAllFiles, getFileById, getFilesByObject, createFile, deleteFile, downloadFile } = require('../../views/startup/nbnextDriveView');

const router = express.Router();

router.get('/', authMiddleware.protect, getAllFiles);
router.get('/by-object', authMiddleware.protect, getFilesByObject);
router.get('/:id', authMiddleware.protect, getFileById);
router.post('/', authMiddleware.protect, uploadFile.single('file'), createFile);
router.delete('/:id', authMiddleware.protect, deleteFile);
router.get('/:id/download', authMiddleware.protect, downloadFile);

module.exports = router;

