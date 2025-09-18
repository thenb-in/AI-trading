const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');


router.get('/roles', adminController.renderRoleForm);
router.post('/roles', adminController.createRole);

router.get('/permissions', adminController.renderPermissionForm);
router.post('/permissions', adminController.createPermission);

router.get('/role-permissions', adminController.renderRolePermissionsPage);

router.post('/role-permissions/add', adminController.addPermissionToRole);
router.post('/role-permissions/remove', adminController.removePermissionFromRole);

router.get('/user-management', adminController.renderUserManagementPage);


module.exports = router;
