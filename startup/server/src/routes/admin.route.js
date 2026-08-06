const express = require('express');
const adminController = require('../controllers/admin.controller');
const companySubscriptionController = require('../controllers/companySubscription.controller');
const headBaseController = require('../controllers/headBase.controller');
const subscriptionController = require('../controllers/subscription.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware.protect); // Protect all routes

router.get('/roles', adminController.getRoles);
router.post('/roles', adminController.createRole);

router.get('/permissions', adminController.getPermissions);
router.post('/permissions', adminController.createPermission);
router.delete('/permissions/:permission_id', adminController.deletePermission);



router.post('/role-permissions/add', adminController.addPermissionToRole);
router.post('/role-permissions/remove', adminController.removePermissionFromRole);

// User-Company Assignment routes
router.get('/users/support', adminController.getSupportUsers);
router.post('/assign-user', adminController.assignUserToCompany);
router.post('/remove-user', adminController.removeUserFromCompany);
router.get('/companies/:companyId/users', adminController.getCompanyUsers);

// Subscription routes
router.get('/subscriptions', subscriptionController.getSubscriptions);
router.post('/subscriptions', subscriptionController.createSubscription);
router.post('/subscription-permissions/update', subscriptionController.updateSubscriptionPermissionStatus);
router.post('/subscription-permissions/update-multiple', subscriptionController.updateMultipleSubscriptionPermissionStatuses);
router.get('/subscriptions/:subscription_id/export', subscriptionController.exportSubscription);
router.post('/subscriptions/import', subscriptionController.importSubscription);

// Company-Subscription routes
router.get('/companies/:companyId/subscriptions', companySubscriptionController.getCompanySubscriptions);
router.get('/subscriptions/available', companySubscriptionController.getAvailableSubscriptions);
router.put('/companies/:companyId/subscriptions', companySubscriptionController.setCompanySubscriptions);

// Head base — restate this company's head history to the wallet, so periods
// that predate activity logging are billed on what was actually there rather
// than on nothing. See services/headBaseService.
router.post('/head-base', headBaseController.buildHeadBase);

module.exports = router;
