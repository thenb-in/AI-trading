const express = require('express');
const adminController = require('../controllers/admin.controller');
const companySubscriptionController = require('../controllers/companySubscription.controller');
const headBaseController = require('../controllers/headBase.controller');
const subscriptionView = require('../views/subscription.view');
const subscriptionValidator = require('../validators/subscriptionValidator');
const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const requireSupportUser = require('../middleware/requireSupportUser');
const requireOwnCompanyOrSupport = require('../middleware/requireOwnCompanyOrSupport');
const {
  MASTER_PERMISSION_CONSTANTS,
  MODULE_PERMISSION_CONSTANTS
} = require('../constants/permissions');

// Seeing the role-permission screen is what these endpoints serve, so the
// module permission grants them alongside the specific one — an install whose
// roles predate the specific permissions keeps working.
const CAN_SEE_ROLES = [
  MASTER_PERMISSION_CONSTANTS.ROLE.read.name,
  MODULE_PERMISSION_CONSTANTS.VIEW_ROLE_PERMISSION_MODULE.name
];
const CAN_SEE_PERMISSIONS = [
  MASTER_PERMISSION_CONSTANTS.PERMISSION.read.name,
  MODULE_PERMISSION_CONSTANTS.VIEW_ROLE_PERMISSION_MODULE.name
];
const CAN_EDIT_ROLE_PERMISSIONS = [
  MASTER_PERMISSION_CONSTANTS.ROLE_PERMISSION.update.name,
  MODULE_PERMISSION_CONSTANTS.VIEW_ROLE_PERMISSION_MODULE.name
];

const router = express.Router();
router.use(authMiddleware.protect); // Protect all routes

router.get('/roles', requirePermission(CAN_SEE_ROLES), adminController.getRoles);
router.post('/roles', requirePermission(MASTER_PERMISSION_CONSTANTS.ROLE.create.name), adminController.createRole);

router.get('/permissions', requirePermission(CAN_SEE_PERMISSIONS), adminController.getPermissions);
router.post('/permissions', requirePermission(MASTER_PERMISSION_CONSTANTS.PERMISSION.create.name), adminController.createPermission);
// Clearing up the permission rows a build left behind is support staff's job,
// so the permission alone is not enough.
router.delete('/permissions/:permission_id', requireSupportUser, requirePermission(MASTER_PERMISSION_CONSTANTS.PERMISSION.delete.name), adminController.deletePermission);

router.post('/role-permissions/add', requirePermission(CAN_EDIT_ROLE_PERMISSIONS), adminController.addPermissionToRole);
router.post('/role-permissions/remove', requirePermission(CAN_EDIT_ROLE_PERMISSIONS), adminController.removePermissionFromRole);

// User-Company assignment — support staff only, across companies.
router.get('/users/support', requireSupportUser, adminController.getSupportUsers);
router.post('/assign-user', requireSupportUser, adminController.assignUserToCompany);
router.post('/remove-user', requireSupportUser, adminController.removeUserFromCompany);
router.get('/companies/:companyId/users', requireSupportUser, adminController.getCompanyUsers);
router.get('/companies/:companyId/assignable-users', requireSupportUser, adminController.getAssignableUsers);

// Subscription routes — authoring a plan and deciding who is on it is support
// staff's job, the same as the screen that shows them.

router.get('/subscriptions', requireSupportUser, subscriptionView.getSubscriptions);
router.post('/subscriptions', requireSupportUser, subscriptionValidator.createSubscriptionValidation, subscriptionView.createSubscription);
router.put('/subscriptions/:subscription_id/permissions', requireSupportUser, subscriptionValidator.updateSubscriptionPermissionsValidation, subscriptionView.updateSubscriptionPermissions);
router.get('/subscriptions/:subscription_id/export', requireSupportUser, subscriptionView.exportSubscription);
router.post('/subscriptions/import', requireSupportUser, subscriptionValidator.importSubscriptionValidation, subscriptionView.importSubscription);
router.post('/subscriptions/backfill-missing', requireSupportUser, subscriptionView.backfillSubscribedMasters);
router.post('/subscriptions/:subscription_id/push-to-wallet', requireSupportUser, subscriptionView.pushSubscriptionToWallet);

// Company-Subscription routes
// What your own company is subscribed to decides what you are shown, so every
// signed-in user reads their own — and only support staff read another's.
router.get('/companies/:companyId/subscriptions', requireOwnCompanyOrSupport, companySubscriptionController.getCompanySubscriptions);
router.get('/subscriptions/available', requireSupportUser, companySubscriptionController.getAvailableSubscriptions);
router.put('/companies/:companyId/subscriptions', requireSupportUser, companySubscriptionController.setCompanySubscriptions);

// Head base — restate this company's head history to the wallet, so periods
// that predate activity logging are billed on what was actually there rather
// than on nothing. See services/headBaseService.
router.post('/head-base', requireSupportUser, headBaseController.buildHeadBase);

module.exports = router;
