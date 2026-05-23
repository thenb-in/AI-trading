const logger = require('../../logger');
const adminService = require('../services/admin.service');
const userService = require('../services/userService');
const { ONLY_SUPERADMINS_CAN_CREATE_GLOBAL_ROLES } = require('../constants/errors');


const createRole = async (req, res) => {
  try {
    const { name, description, isGlobal } = req.body;

    if (isGlobal) {
      const user = await userService.getUserById(req.user.id);
      if (!user.isSupportUser) {
        return res.status(403).json({
          success: false,
          message: ONLY_SUPERADMINS_CAN_CREATE_GLOBAL_ROLES
        });
      }
    }

    const companyId = isGlobal ? null : req.user.company_id;
    const newRole = await adminService.createRole(name, description, companyId);
    res.json({
      success: true,
      message: isGlobal
        ? `Global role "${newRole.name}" created successfully!`
        : `Role "${newRole.name}" created successfully for your company!`,
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
    const { role_id, permission_ids } = req.body;
    const userId = req.user.id;
    await adminService.addPermissionToRole(role_id, permission_ids, userId);
    res.json({
      success: true,
      message: `${permission_ids.length} Permissions added successfully!`
    });
  } catch (error) {
    logger.error('Error adding permission to role', error);
    const statusCode = error.status || 400;
    res.status(statusCode).json({
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
    const { role_id, permission_id } = req.body;
    const userId = req.user.id;
    const result = await adminService.removePermissionFromRole(role_id, permission_id, userId);
    res.json({
      success: true,
      message: `${result.message}`
    });
  } catch (error) {
    logger.error('Error removing permission from role', error);
    const statusCode = error.status || 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};


// New API endpoints for React components
const getRoles = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const roles = await adminService.getRolesAndPermissions(companyId);
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
    const { permission_id } = req.params;
    const result = await adminService.deletePermission(permission_id);
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

// User-Company Assignment endpoints
const getSupportUsers = async (req, res) => {
  try {
    const users = await adminService.getSupportUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Error fetching support users', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const assignUserToCompany = async (req, res) => {
  try {
    const { userId, companyId } = req.body;

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        message: `User ID and Company ID are required ,get ${userId} and  ${companyId}`
      });
    }

    const result = await adminService.assignUserToCompany(userId, companyId);
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    logger.error('Error assigning user to company', error);
    const statusCode = error.status || 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

const removeUserFromCompany = async (req, res) => {
  try {
    const { userId, companyId } = req.body;

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        message: `User ID and Company ID are required ,get ${userId} and  ${companyId}`
      });
    }

    const result = await adminService.removeUserFromCompany(userId, companyId);
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    logger.error('Error removing user from company', error);
    const statusCode = error.status || 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

const getCompanyUsers = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: `Company ID is required ${companyId}`
      });
    }

    const users = await adminService.getCompanyUsers(companyId);
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Error fetching company users', error);
    res.status(500).json({
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
  deletePermission,
  getSupportUsers,
  assignUserToCompany,
  removeUserFromCompany,
  getCompanyUsers
};
