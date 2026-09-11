const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const requirePermission = require('../../middleware/requirePermission');
const { MASTER_PERMISSION_CONSTANTS } = require('../../constants/permissions');
const { createCrudActivityLogs } = require('../../middleware/activityLogMiddleware');
const { notificationRuleValidation } = require('./notificationRuleValidator');
const {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  sendRuleNow
} = require('./notificationRuleView');

const router = express.Router();
const { NOTIFICATION_RULE } = MASTER_PERMISSION_CONSTANTS;

const ruleLogs = createCrudActivityLogs('NotificationRule');

router.use(authMiddleware.protect);

router.get('/', requirePermission(NOTIFICATION_RULE.read.name), getRules);
router.post('/', requirePermission(NOTIFICATION_RULE.create.name), notificationRuleValidation, ruleLogs.create, createRule);
router.put('/:id', requirePermission(NOTIFICATION_RULE.update.name), notificationRuleValidation, ruleLogs.update, updateRule);
router.delete('/:id', requirePermission(NOTIFICATION_RULE.delete.name), ruleLogs.delete, deleteRule);
router.post('/:id/send-now', requirePermission(NOTIFICATION_RULE.update.name), sendRuleNow);

module.exports = router;
