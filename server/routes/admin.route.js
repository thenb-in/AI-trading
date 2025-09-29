const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');



router.get('/roles', adminController.getRoles);
router.post('/roles', adminController.createRole);

router.get('/permissions', adminController.getPermissions);
router.post('/permissions', adminController.createPermission);



router.post('/role-permissions/add', adminController.addPermissionToRole);
router.post('/role-permissions/remove', adminController.removePermissionFromRole);




module.exports = router;
