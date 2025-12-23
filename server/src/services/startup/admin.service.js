const { Role, Permission, User, Company, MultiCompanyModule } = require('../../models');
const logger = require('../../../logger');
const { Op } = require('sequelize');
const { findModelByIdOrThrow, validateName, validateDescription } = require('../../utils/startup/modelHelpers');

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
  const trimmedName = validateName(name, { fieldName: 'Permission name' });
  const trimmedDescription = validateDescription(description);

  // Check for duplicate
  const existingPermission = await Permission.findOne({ where: { name: trimmedName } });
  if (existingPermission) {
    logger.warn(`Permission creation failed - Permission with name ${trimmedName} already exists`);
    throw new Error(`Permission with this name already exists ${trimmedName}.`);
  }

  // Create the permission
  const newPermission = await Permission.create({
    name: trimmedName,
    display_name: display_name,
    description: trimmedDescription,
    type: type
  });

  logger.info(`New permission created successfully: ${newPermission.id} - ${newPermission.name} - ${newPermission}`);
  return newPermission;
};


const fetchAllUsers = async () => {
  try {
    const users = await User.findAll({
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name']
        },
        {
          model: Role,
          as: 'role'
        }
      ]
    });
    return users;
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
    return roles.map(role => ({
      ...role.toJSON(),
      isGlobal: role.companyId === null
    }));
  } catch (error) {
    throw { status: 500, message: error.message };
  }
};

const getAllPermissions = async () => {
  try {
    const permissions = await Permission.findAll({
      attributes: ['id', 'name', 'display_name', 'description', 'type'], // Explicitly specify attributes that exist
      order: [['name', 'ASC']]
    });
    return permissions;
  } catch (error) {
    throw { status: 500, message: error.message };
  }
};

const removePermissionFromRole = async (roleId, permissionId, userId) => {
  try {
    const role = await findModelByIdOrThrow(Role, roleId, {}, 'Role');

    // Check if role is a default/global role (companyId is null)
    if (role.companyId === null) {
      // Only superadmins can modify default roles
      const user = await findModelByIdOrThrow(User, userId, { attributes: ['isSadmin'] }, 'User');
      if (!user.isSadmin) {
        throw { status: 403, message: 'Only superadmins can modify default system roles' };
      }
    }

    const permission = await findModelByIdOrThrow(Permission, permissionId, {}, 'Permission');
    if (!permission) {
      throw { status: 404, message: `Permission with id ${permissionId} not found` };
    }
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
      // Only superadmins can modify default roles
      const user = await findModelByIdOrThrow(User, userId, { attributes: ['isSadmin'] }, 'User');
      if (!user.isSadmin) {
        throw { status: 403, message: 'Only superadmins can modify default system roles' };
      }
    }

    // Find all permissions at once
    const permissions = await Permission.findAll({
      where: {
        id: permissionIdArray
      }
    });

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
  try {
    // Check if permission exists
    const permission = await findModelByIdOrThrow(Permission, permissionId, {}, 'Permission');
    if (!permission) {
      throw { status: 404, message: `Permission with id ${permissionId} not found` };
    }

    // Delete the permission (cascade will handle role-permission mappings due to onDelete: 'CASCADE')
    await permission.destroy();

    logger.info(`Permission deleted successfully: ${permissionId} - ${permission.name}`);
    return { message: `Permission "${permission.name}" deleted successfully` };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw {
      status: 500,
      message: error.message || `Error deleting permission with id ${permissionId}`
    };
  }
};

// User-Company Assignment methods
const getSadminUsers = async () => {
  try {
    const users = await User.findAll({
      where: {
        isSadmin: true,
        isActive: true
      },
      attributes: ['id', 'name', 'username'],
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name']
        }
      ],
      order: [['name', 'ASC']]
    });
    return users;
  } catch (error) {
    logger.error('Error fetching sadmin users', error);
    throw new Error(`Failed to fetch super admin users at  ${new Date()}`);
  }
};

const getAllCompanies = async () => {
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']]
    });
    return companies;
  } catch (error) {
    logger.error('Error fetching companies', error);
    throw new Error(`Failed to fetch companies at  ${new Date()}`);
  }
};

const assignUserToCompany = async (userId, companyId) => {
  try {
    // Validate user exists and is sadmin and active
    const user = await findModelByIdOrThrow(User, userId, {
      attributes: ['id', 'name', 'isSadmin', 'isActive']
    }, 'User');

    if (!user.isSadmin || !user.isActive) {
      throw { status: 400, message: 'Only active super admin users can be assigned to companies' };
    }

    // Validate company exists
    const company = await findModelByIdOrThrow(Company, companyId, {
      attributes: ['id', 'name']
    }, 'Company');

    // Check if assignment already exists
    const existingAssignment = await MultiCompanyModule.findOne({
      where: { userId, companyId }
    });

    if (existingAssignment) {
      throw { status: 409, message: 'User is already assigned to this company' };
    }

    // Create the assignment
    await MultiCompanyModule.create({ userId, companyId });

    logger.info(`User ${userId} assigned to company ${companyId}`);
    return {
      message: `User "${user.name}" successfully assigned to company "${company.name}"`,
      user,
      company
    };
  } catch (error) {
    logger.error('Error assigning user to company', error);
    throw error;
  }
};

const removeUserFromCompany = async (userId, companyId) => {
  try {
    // Validate user exists
    const user = await findModelByIdOrThrow(User, userId, {
      attributes: ['id', 'name']
    }, 'User');

    // Validate company exists
    const company = await findModelByIdOrThrow(Company, companyId, {
      attributes: ['id', 'name']
    }, 'Company');

    // Check if assignment exists
    const assignment = await MultiCompanyModule.findOne({
      where: { userId, companyId }
    });

    if (!assignment) {
      throw { status: 404, message: 'User is not assigned to this company' };
    }

    // Remove the assignment
    await assignment.destroy();

    logger.info(`User ${userId} removed from company ${companyId}`);
    return {
      message: `User "${user.name}" successfully removed from company "${company.name}"`,
      user,
      company
    };
  } catch (error) {
    logger.error('Error removing user from company', error);
    throw error;
  }
};

const getCompanyUsers = async (companyId) => {
  try {
    // Validate company exists
    await findModelByIdOrThrow(Company, companyId, {
      attributes: ['id', 'name']
    }, 'Company');

    const assignments = await MultiCompanyModule.findAll({
      where: { companyId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username', 'isSadmin', 'isActive'],
          where: {
            isSadmin: true,
            isActive: true
          }
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    return assignments.map(assignment => assignment.user).filter(Boolean);
  } catch (error) {
    logger.error('Error fetching company users', error);
    throw new Error(`Failed to fetch company users ${companyId}`);
  }
};

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
  assignUserToCompany,
  removeUserFromCompany,
  getCompanyUsers
};
