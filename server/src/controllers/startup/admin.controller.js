const adminService = require('../../services/startup/admin.service');
const _allowedPermissions = require('../../utils/startup/allowedPermissions');
const logger = require('../../../logger');


const createRole = async (req, res) => {
  // const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  // if (!hasPermission) {
  //   return res.status(404).json({ error: "You are not authorized to access this resource" });
  // }
  try {
    const { name, description } = req.body;
    const newRole = await adminService.createRole(name, description);
    res.json({
      success: true,
      message: `Role "${newRole.name}" created successfully!`,
      data: newRole
    });
  } catch (error) {
    logger.error('Error creating role', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};



const createPermission = async (req, res) => {
  // const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  // if (!hasPermission) {
  //   return res.status(404).json({ error: "You are not authorized to access this resource" });
  // }
  try {
    const { name, description ,type} = req.body;
    const newPermission = await adminService.createPermission(name, name, description, type);
    res.json({
      success: true,
      message: `Permission "${newPermission.name}" created successfully!`,
      data: newPermission
    });
  } catch (error) {
    logger.error('Error creating permission', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};



const addPermissionToRole = async (req, res) => {
  // const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  // if (!hasPermission) {
  //   return res.status(404).json({ error: "You are not authorized to access this resource" });
  // }
  try {
    const { roleId, permissionIds } = req.body;
    await adminService.addPermissionToRole(roleId, permissionIds);
    res.json({
      success: true,
      message: `${permissionIds.length} Permissions added successfully!`
    });
  } catch (error) {
    logger.error('Error adding permission to role', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const removePermissionFromRole = async (req, res) => {
  // const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  // if (!hasPermission) {
  //   return res.status(404).json({ error: "You are not authorized to access this resource" });
  // }
  try {
    const { roleId, permissionId } = req.body;
    const result = await adminService.removePermissionFromRole(roleId, permissionId);
    res.json({
      success: true,
      message: `${result.message}`
    });
  } catch (error) {
    logger.error('Error removing permission from role', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


// New API endpoints for React components
const getRoles = async (req, res) => {
  try {
    const roles = await adminService.getRolesAndPermissions();
    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    logger.error('Error fetching roles', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getPermissions = async (req, res) => {
  try {
    const permissions = await adminService.getAllPermissions();
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    logger.error('Error fetching permissions', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const deletePermission = async (req, res) => {
  try {
    const { permissionId } = req.params;
    const result = await adminService.deletePermission(permissionId);
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    logger.error('Error deleting permission', error);
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createRole,

  createPermission,
  addPermissionToRole,
  removePermissionFromRole,
  getRoles,
  getPermissions,
  deletePermission
};
