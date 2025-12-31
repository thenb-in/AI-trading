const { Op } = require('sequelize');
const logger = require('../../../logger');
// Role is the primary model for this service
// Permission is needed for includes in getRolesAndPermissions
const { Role, Permission } = require('../../models');
const { findModelByIdOrThrow, validateName, validateDescription } = require('../../utils/startup/modelHelpers');
const companyService = require('./companyService');
const permissionService = require('./permissionService');
const userService = require('./userService');

const checkRoleExists = async (name, companyId = null) => {
  const whereClause = { name: name.trim() };
  if (companyId) {
    whereClause.companyId = companyId;
  } else {
    whereClause.companyId = null;
  }
  const existingRole = await Role.findOne({ where: whereClause });
  return existingRole;
};

const createRole = async (name, description, companyId = null) => {
  const trimmedName = validateName(name, { fieldName: 'Role name' });
  const trimmedDescription = validateDescription(description);

  // Check for duplicate
  const existingRole = await checkRoleExists(trimmedName, companyId);
  if (existingRole) {
    const roleType = companyId ? 'company-specific' : 'global';
    throw new Error(`Role with name "${trimmedName}" already exists as a ${roleType} role`);
  }

  // Create the role
  const newRole = await Role.create({
    name: trimmedName,
    description: trimmedDescription,
    companyId: companyId
  });

  logger.info(`Created role "${trimmedName}" with companyId: ${companyId || 'null (global)'}`);
  return newRole;
};

const createPermission = async (name, display_name, description, type) => {
  // Use permissionService for Permission operations
  return await permissionService.createPermission(name, display_name, description, type);
};


const fetchAllUsers = async () => {
  try {
    // Use userService to get users, but we need to include role info
    const companies = await companyService.getAllCompanies();
    const allUsers = [];

    for (const company of companies) {
      const { users } = await userService.getAllUsers(company.id);
      allUsers.push(...users);
    }

    return allUsers;
  } catch (error) {
    throw { status: 500, message: error.message };
  }
};

const getRolesAndPermissions = async (companyId) => {
  try {
    // All users see global roles (default roles) + company-specific roles
    const whereClause = {
      [Op.or]: [
        { companyId: null }, // Global/default roles (visible to all users)
        { companyId: companyId } // Company-specific roles
      ]
    };

    // Permission is imported at top level for includes
    const roles = await Role.findAll({
      where: whereClause,
      include: {
        model: Permission,
        as: 'permissions',
        through: { attributes: [] }, // Don't include the join table attributes
        attributes: ['id', 'name', 'description', 'type'] // Explicitly specify attributes that exist
      },
      order: [['name', 'ASC']]
    });

    // Add isGlobal flag to each role for frontend
    return roles.map(role => {
      const roleJson = role.toJSON();
      // Check companyId before toJSON() or from the JSON object
      const isGlobal = (role.companyId === null || roleJson.companyId === null);
      // Ensure permissions are included (they should be from the include)
      const result = {
        ...roleJson,
        isGlobal,
        permissions: roleJson.permissions || []
      };
      return result;
    });
  } catch (error) {
    throw { status: 500, message: error.message };
  }
};

const getAllPermissions = async () => {
  // Use permissionService for Permission operations
  return await permissionService.getAllPermissions();
};

const removePermissionFromRole = async (roleId, permissionId, userId) => {
  try {
    const role = await findModelByIdOrThrow(Role, roleId, {}, 'Role');

    // Check if role is a default/global role (companyId is null)
    if (role.companyId === null) {
      // Only superadmins can modify default roles - use userService
      const user = await userService.getUserById(userId);
      if (!user.isSadmin) {
        throw { status: 403, message: 'Only superadmins can modify default system roles' };
      }
    }

    // Use permissionService for Permission operations
    const permission = await permissionService.getPermissionById(permissionId);
    await role.removePermission(permission);
    return { message: 'Permission removed from role successfully' };
  } catch (error) {
    throw { status: error.status || 500, message: error.message };
  }
};

const addPermissionToRole = async (roleId, permissionIds, userId) => {
  try {
    // Ensure permissionIds is an array
    const permissionIdArray = Array.isArray(permissionIds) ? permissionIds : [permissionIds];

    const role = await findModelByIdOrThrow(Role, roleId, {}, 'Role');

    // Check if role is a default/global role (companyId is null)
    if (role.companyId === null) {
      // Only superadmins can modify default roles - use userService
      const user = await userService.getUserById(userId);
      if (!user.isSadmin) {
        throw { status: 403, message: 'Only superadmins can modify default system roles' };
      }
    }

    // Use permissionService for Permission operations
    const permissions = await permissionService.getPermissionsByIds(permissionIdArray);

    // Check if all permissions were found
    if (permissions.length !== permissionIdArray.length) {
      const foundIds = permissions.map(p => p.id);
      const missingIds = permissionIdArray.filter(id => !foundIds.includes(id));
      throw { status: 404, message: `Permissions with ids ${missingIds.join(', ')} not found` };
    }

    // Add all permissions at once
    await role.addPermissions(permissions);

    return {
      message: `Successfully added ${permissions.length} permission(s) to role`
    };
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw { status: 409, message: `One or more permissions are already assigned to role with id ${roleId}` };
    }
    throw {
      status: error.status || 500,
      message: error.message || `Error adding permissions to role with id ${roleId}`
    };
  }
};

const deletePermission = async (permissionId) => {
  // Use permissionService for Permission operations
  return await permissionService.deletePermission(permissionId);
};

// User-Company Assignment methods
const getSadminUsers = async () => {
  try {
    // Use companyService to get all companies, then multiCompanyService for each
    const companies = await companyService.getAllCompanies();
    const allUsers = [];

    for (const company of companies) {
      const { users } = await userService.getAllUsers(company.id);
      const sadminUsers = users.filter(user => user.isSadmin && user.isActive);
      allUsers.push(...sadminUsers);
    }

    // Sort by name
    return allUsers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } catch (error) {
    logger.error('Error fetching sadmin users', error);
    throw new Error(`Failed to fetch super admin users at  ${new Date()}`);
  }
};

const getAllCompanies = async () => {
  try {
    // Use companyService instead of direct model access
    return await companyService.getAllCompanies();
  } catch (error) {
    logger.error('Error fetching companies', error);
    throw new Error(`Failed to fetch companies at  ${new Date()}`);
  }
};


const getCompanyUsers = async (companyId) => {
  try {
    // Validate company exists - use companyService
    await companyService.getCompanySettings(companyId);

    // MultiCompanyModule operations should use multiCompanyService
    return await userService.getAllUsers(companyId);
  } catch (error) {
    logger.error('Error fetching company users', error);
    throw new Error(`Failed to fetch company users ${companyId}`);
  }
};

/**
 * Get reusable include configuration for User with Role and Permissions
 * @returns {array} Sequelize include configuration
 */
const getUserWithRoleInclude = () => [
  // todo: this should be removed. make it like a structure?
  {
    model: Role,
    as: 'role',
    include: [{
      model: Permission,
      as: 'permissions',
      through: { attributes: [] },
      attributes: ['id', 'name', 'description', 'type']
    }]
  }
];

module.exports = {
  createRole,
  createPermission,
  fetchAllUsers,
  getRolesAndPermissions,
  getAllPermissions,
  removePermissionFromRole,
  addPermissionToRole,
  deletePermission,
  getSadminUsers,
  getAllCompanies,
  getCompanyUsers,
  getUserWithRoleInclude
};
