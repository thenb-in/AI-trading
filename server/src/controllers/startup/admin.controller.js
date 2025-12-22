const adminService = require('../../services/startup/admin.service');
const logger = require('../../../logger');


const createRole = async (req, res) => {
  // const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  // if (!hasPermission) {
  //   return res.status(404).json({ error: "You are not authorized to access this resource" });
  // }
  try {
    const { name, description } = req.body;
    const companyId = req.user.company_id;

    // All roles created from frontend are company-specific
    const newRole = await adminService.createRole(name, description, companyId);
    res.json({
      success: true,
      message: `Role "${newRole.name}" created successfully for your company!`,
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
    const userId = req.user.id;
    await adminService.addPermissionToRole(roleId, permissionIds, userId);
    res.json({
      success: true,
      message: `${permissionIds.length} Permissions added successfully!`
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
    const { roleId, permissionId } = req.body;
    const userId = req.user.id;
    const result = await adminService.removePermissionFromRole(roleId, permissionId, userId);
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

// User-Company Assignment endpoints
const getSadminUsers = async (req, res) => {
  try {
    const users = await adminService.getSadminUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Error fetching sadmin users', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAllCompanies = async (req, res) => {
  try {
    const companies = await adminService.getAllCompanies();
    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    logger.error('Error fetching companies', error);
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
  getSadminUsers,
  getAllCompanies,
  assignUserToCompany,
  removeUserFromCompany,
  getCompanyUsers
};
