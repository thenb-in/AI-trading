const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/permissions');
const { createCrudActivityLogs } = require('../middleware/activityLogMiddleware');
const {
  getAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../views/announcementView');

const router = express.Router();
const { ANNOUNCEMENT } = MASTER_PERMISSION_CONSTANTS;

const announcementLogs = createCrudActivityLogs('Announcement');

router.use(authMiddleware.protect);

// Being shown an announcement is not reading the master, so anyone signed in
// may ask what is running for them. Before '/:id' has no chance to catch it.
router.get('/active', getActiveAnnouncements);

router.get('/', requirePermission(ANNOUNCEMENT.read.name), getAnnouncements);
router.post('/', requirePermission(ANNOUNCEMENT.create.name), announcementLogs.create, createAnnouncement);
router.put('/:id', requirePermission(ANNOUNCEMENT.update.name), announcementLogs.update, updateAnnouncement);
router.delete('/:id', requirePermission(ANNOUNCEMENT.delete.name), announcementLogs.delete, deleteAnnouncement);

module.exports = router;
