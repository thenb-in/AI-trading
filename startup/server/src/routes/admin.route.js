const express = require('express');
const adminController = require('../controllers/admin.controller');
const companySubscriptionController = require('../controllers/companySubscription.controller');
const headBaseController = require('../controllers/headBase.controller');
const subscriptionView = require('../views/subscription.view');
const subscriptionValidator = require('../validators/subscriptionValidator');
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


router.get('/subscriptions', subscriptionView.getSubscriptions);
router.post('/subscriptions', subscriptionValidator.createSubscriptionValidation, subscriptionView.createSubscription);
router.put('/subscriptions/:subscription_id/permissions', subscriptionValidator.updateSubscriptionPermissionsValidation, subscriptionView.updateSubscriptionPermissions);
router.get('/subscriptions/:subscription_id/export', subscriptionView.exportSubscription);
router.post('/subscriptions/import', subscriptionValidator.importSubscriptionValidation, subscriptionView.importSubscription);
router.post('/subscriptions/:subscription_id/push-to-wallet', subscriptionView.pushSubscriptionToWallet);

// Company-Subscription routes
router.get('/companies/:companyId/subscriptions', companySubscriptionController.getCompanySubscriptions);
router.get('/subscriptions/available', companySubscriptionController.getAvailableSubscriptions);
router.put('/companies/:companyId/subscriptions', companySubscriptionController.setCompanySubscriptions);

// Head base — restate this company's head history to the wallet, so periods
// that predate activity logging are billed on what was actually there rather
// than on nothing. See services/headBaseService.
router.post('/head-base', headBaseController.buildHeadBase);

module.exports = router;
