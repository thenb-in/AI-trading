const adminService = require('../services/admin.service');
const _allowedPermissions = require('../utils/allowedPermissions');
const logger = require('../logger');

const renderRoleForm = async (req, res) => {
  // const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  // if (!hasPermission) {
  //   return res.status(404).json({ error: "You are not authorized to access this resource" });
  // }
  try {
    res.render('role-form', { error: null, success: null, process: { env: process.env } });
  } catch (error) {
    logger.error(`Error rendering role form: ${error.message} - Stack: ${error.stack}`);
    res.status(500).render('role-form', { error: 'An error occurred while loading the form', success: null, process: { env: process.env } });
  }
};

const createRole = async (req, res) => {
  // const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  // if (!hasPermission) {
  //   return res.status(404).json({ error: "You are not authorized to access this resource" });
  // }
  try {
    const { name, description } = req.body;
    const newRole = await adminService.createRole(name, description);
    res.render('role-form', {
      error: null,
      success: `Role "${newRole.name}" created successfully!`,
      formData: { name: '', description: '' },
      process: { env: process.env }
    });
  } catch (error) {
    logger.error(`Error creating role: ${error.message} - Stack: ${error.stack}`);
    res.render('role-form', {
      error: error.message,
      success: null,
      formData: { name: req.body.name, description: req.body.description },
      process: { env: process.env }
    });
  }
};

const renderPermissionForm = async (req, res) => {
  // const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  // if (!hasPermission) {
  //   return res.status(404).json({ error: "You are not authorized to access this resource" });
  // }
  try {
    res.render('permission-form', { error: null, success: null, process: { env: process.env } });
  } catch (error) {
    logger.error(`Error rendering permission form: ${error.message} - Stack: ${error.stack}`);
    res.status(500).render('permission-form', { error: 'An error occurred while loading the form', success: null, process: { env: process.env } });
  }
};

const createPermission = async (req, res) => {
  // const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  // if (!hasPermission) {
  //   return res.status(404).json({ error: "You are not authorized to access this resource" });
  // }
  try {
    const { name, description } = req.body;
    const newPermission = await adminService.createPermission(name, description);
    res.render('permission-form', {
      error: null,
      success: `Permission "${newPermission.name}" created successfully!`,
      formData: { name: '', description: '' },
      process: { env: process.env }
    });
  } catch (error) {
    logger.error(`Error creating permission: ${error.message} - Stack: ${error.stack}`);
    res.render('permission-form', {
      error: error.message,
      success: null,
      formData: { name: req.body.name, description: req.body.description },
      process: { env: process.env }
    });
  }
};

const renderRolePermissionsPage = async (req, res) => {
  // const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  // if (!hasPermission) {
  //   return res.status(404).json({ error: "You are not authorized to access this resource" });
  // }
  try {
    // This page is now a full user management dashboard.
    const roles = await adminService.getRolesAndPermissions();
    const allPermissions = await adminService.getAllPermissions();
    res.render('role-permissions', {
      roles, // For the user role dropdowns
      allPermissions, // For the permission management section
      message: req.query.message,
      error: req.query.error,
      process: { env: process.env } // Pass environment variables to template
    });
  } catch (error) {
    logger.error(`Error loading user management page: ${error.message}`);
    res.status(500).render('role-permissions', {
      roles: [],
      allPermissions: [],
      error: 'Failed to load user management page.',
      process: { env: process.env } // Pass environment variables to template
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
    res.redirect('/api/v1/admin/role-permissions?message=Permission added successfully');
  } catch (error) {
    logger.error(`Error adding permission to role: ${error.message}`);
    res.redirect(`/api/v1/admin/role-permissions?error=${error.message}`);
  }
};

const removePermissionFromRole = async (req, res) => {
  // const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  // if (!hasPermission) {
  //   return res.status(404).json({ error: "You are not authorized to access this resource" });
  // }
  try {
    const { roleId, permissionId } = req.body;
    await adminService.removePermissionFromRole(roleId, permissionId);
    res.redirect('/api/v1/admin/role-permissions?message=Permission removed successfully');
  } catch (error) {
    res.redirect(`/api/v1/admin/role-permissions?error=${error.message}`);
  }
};

const renderUserManagementPage = async (req, res) => {
  // const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  // if (!hasPermission) {
  //   return res.status(404).json({ error: "You are not authorized to access this resource" });
  // }
  try {
    const users = await adminService.fetchAllUsers();
    const roles = await adminService.getRolesAndPermissions();
    res.render('user-management', { users, roles, process: { env: process.env } });
  } catch {
    res.status(500).render('user-management', { error: 'Failed to load user management page.' });
  }
};

module.exports = {
  renderRoleForm,
  createRole,
  renderPermissionForm,
  createPermission,
  renderRolePermissionsPage,
  addPermissionToRole,
  removePermissionFromRole,
  renderUserManagementPage
};
