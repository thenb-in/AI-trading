const { Role, Permission, User, Company } = require('../models');
const logger = require('../logger');

const checkRoleExists = async (name) => {
  const existingRole = await Role.findOne({ where: { name: name.trim() } });
  return existingRole;
};

const createRole = async (name, description) => {
  // Input validation
  if (!name || typeof name !== 'string') {
    throw new Error('Role name is required and must be a string');
  }

  const trimmedName = name.trim();

  // Length validation
  if (trimmedName.length === 0) {
    throw new Error('Role name cannot be empty');
  }

  if (trimmedName.length < 2) {
    throw new Error('Role name must be at least 2 characters long');
  }

  if (trimmedName.length > 50) {
    throw new Error('Role name cannot exceed 50 characters');
  }

  // Character validation - only allow letters, numbers, spaces, and hyphens
  const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  if (!nameRegex.test(trimmedName)) {
    throw new Error('Role name can only contain letters, numbers, spaces, hyphens, and underscores');
  }

  // Description validation (optional)
  let trimmedDescription = null;
  if (description) {
    if (typeof description !== 'string') {
      throw new Error('Description must be a string');
    }

    trimmedDescription = description.trim();

    if (trimmedDescription.length > 500) {
      throw new Error('Description cannot exceed 500 characters');
    }
  }

  // Check for duplicate
  const existingRole = await checkRoleExists(trimmedName);
  if (existingRole) {
    throw new Error('Role with this name already exists');
  }

  // Create the role
  const newRole = await Role.create({
    name: trimmedName,
    description: trimmedDescription
  });

  return newRole;
};

const createPermission = async (name, description) => {
  // Input validation
  if (!name || typeof name !== 'string') {
    logger.warn('Name is invalid');
    throw new Error('Permission name is required and must be a string');
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    logger.warn('Empty permission name provided after trimming');
    throw new Error('Permission name cannot be empty');
  }

  if (trimmedName.length < 2) {
    logger.warn('Permission name too short - Must be at least 2 characters');
    throw new Error('Permission name must be at least 2 characters long');
  }

  if (trimmedName.length > 50) {
    logger.warn('Permission name too long - Exceeds 50 character limit');
    throw new Error('Permission name cannot exceed 50 characters');
  }

  // Character validation
  const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  if (!nameRegex.test(trimmedName)) {
    logger.warn('Invalid characters in permission name - Only letters, numbers, spaces, hyphens, and underscores allowed');
    throw new Error('Permission name can only contain letters, numbers, spaces, hyphens, and underscores');
  }

  // Description validation (optional)
  let trimmedDescription = null;
  if (description) {
    if (typeof description !== 'string') {
      logger.warn('Invalid permission description format - Must be a string');
      throw new Error('Description must be a string');
    }

    trimmedDescription = description.trim();

    if (trimmedDescription.length > 500) {
      logger.warn('Permission description too long - Exceeds 500 character limit');
      throw new Error('Description cannot exceed 500 characters');
    }
  }

  // Check for duplicate
  const existingPermission = await Permission.findOne({ where: { name: trimmedName } });
  if (existingPermission) {
    logger.warn('Permission creation failed - Permission with this name already exists');
    throw new Error('Permission with this name already exists');
  }

  // Create the permission
  const newPermission = await Permission.create({
    name: trimmedName,
    description: trimmedDescription
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
        },
        {
          model: UserPAT,
          as: 'userPats',
          attributes: ['id', 'pat', 'createdAt']
        }
      ]
    });
    return users;
  } catch (error) {
    throw { status: 500, message: error.message };
  }
};

const getRolesAndPermissions = async () => {
  try {
    const roles = await Role.findAll({
      include: {
        model: Permission,
        as: 'permissions',
        through: { attributes: [] } // Don't include the join table attributes
      },
      order: [['name', 'ASC']]
    });
    return roles;
  } catch (error) {
    throw { status: 500, message: error.message };
  }
};

const getAllPermissions = async () => {
  try {
    const permissions = await Permission.findAll({ order: [['name', 'ASC']] });
    return permissions;
  } catch (error) {
    throw { status: 500, message: error.message };
  }
};

const removePermissionFromRole = async (roleId, permissionId) => {
  try {
    const role = await Role.findByPk(roleId);
    if (!role) {
      throw { status: 404, message: 'Role not found' };
    }
    const permission = await Permission.findByPk(permissionId);
    if (!permission) {
      throw { status: 404, message: 'Permission not found' };
    }
    await role.removePermission(permission);
    return { message: 'Permission removed from role successfully' };
  } catch (error) {
    throw { status: 500, message: error.message };
  }
};

const addPermissionToRole = async (roleId, permissionIds) => {
  try {
    // Ensure permissionIds is an array
    const permissionIdArray = Array.isArray(permissionIds) ? permissionIds : [permissionIds];

    const role = await Role.findByPk(roleId);
    if (!role) {
      throw { status: 404, message: 'Role not found' };
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
      throw { status: 404, message: `Permissions not found: ${missingIds.join(', ')}` };
    }

    // Add all permissions at once
    await role.addPermissions(permissions);

    return {
      message: `Successfully added ${permissions.length} permission(s) to role`
    };
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw { status: 409, message: 'One or more permissions are already assigned to this role' };
    }
    throw {
      status: error.status || 500,
      message: error.message || 'Error adding permissions to role'
    };
  }
};

module.exports = {
  createRole,
  createPermission,
  fetchAllUsers,
  getRolesAndPermissions,
  getAllPermissions,
  removePermissionFromRole,
  addPermissionToRole
};
