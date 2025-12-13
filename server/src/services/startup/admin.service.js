const { Role, Permission, User, Company } = require('../../models');
const logger = require('../../../logger');

const checkRoleExists = async (name) => {
  const existingRole = await Role.findOne({ where: { name: name.trim() } });
  return existingRole;
};

const createRole = async (name, description) => {
  // Input validation
  if (!name || typeof name !== 'string') {
    throw new Error(`Role name is required and must be a string ${name}.`);
  }

  const trimmedName = name.trim();

  // Length validation
  if (trimmedName.length === 0) {
    throw new Error(`Role name cannot be empty ${trimmedName}.`);
  }

  if (trimmedName.length < 2) {
    throw new Error(`Role name must be at least 2 characters long ${trimmedName}.`);
  }

  if (trimmedName.length > 50) {
    throw new Error(`Role name cannot exceed 50 characters ${trimmedName.length}.`);
  }

  // Character validation - only allow letters, numbers, spaces, and hyphens
  const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  if (!nameRegex.test(trimmedName)) {
    throw new Error(`Role name can only contain letters, numbers, spaces, hyphens, and underscores ${trimmedName}.`);
  }

  // Description validation (optional)
  let trimmedDescription = null;
  if (description) {
    if (typeof description !== 'string') {
      throw new Error(`Description must be a string ${description}.`);
    }

    trimmedDescription = description.trim();

    if (trimmedDescription.length > 500) {
      throw new Error(`Description cannot exceed 500 characters ${trimmedDescription}.`);
    }
  }

  // Check for duplicate
  const existingRole = await checkRoleExists(trimmedName);
  if (existingRole) {
    throw new Error(`Role with name already exists ${trimmedName}.`);
  }

  // Create the role
  const newRole = await Role.create({
    name: trimmedName,
    description: trimmedDescription
  });

  return newRole;
};

const createPermission = async (name, display_name, description,type) => {
  // Input validation
  if (!name || typeof name !== 'string') {
    logger.warn(`Name is invalid (${name}, ${typeof name}) - Must be a string`);
    throw new Error(`Permission name is required and must be a string ${name}.`);
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    logger.warn(`Empty permission name provided after trimming (${trimmedName})`);
    throw new Error(`Permission name cannot be empty ${trimmedName}.`);
  }

  if (trimmedName.length < 2) {
    logger.warn(`Permission name too short (${trimmedName.length} chars) - Must be at least 2 characters`);
    throw new Error(`Permission name must be at least 2 characters long ${trimmedName}.`);
  }

  if (trimmedName.length > 50) {
    logger.warn(`Permission name too long (${trimmedName.length} chars) - Exceeds 50 character limit`);
    throw new Error(`Permission name cannot exceed 50 characters ${trimmedName}.`);
  }

  // Character validation
  const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  if (!nameRegex.test(trimmedName)) {
    logger.warn(`Invalid characters in permission name (${trimmedName}) - Only letters, numbers, spaces, hyphens, and underscores allowed`);
    throw new Error(`Permission name can only contain letters, numbers, spaces, hyphens, and underscores ${trimmedName}.`);
  }

  // Description validation (optional)
  let trimmedDescription = null;
  if (description) {
    if (typeof description !== 'string') {
      logger.warn(`Invalid permission description format (${typeof description}) - Must be a string`);
      throw new Error(`Description must be a string ${description}.`);
    }

    trimmedDescription = description.trim();

    if (trimmedDescription.length > 500) {
      logger.warn(`Permission description too long (${trimmedDescription.length} chars) - Exceeds 500 character limit`);
      throw new Error(`Description cannot exceed 500 characters ${trimmedDescription}.`);
    }
  }

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

const getRolesAndPermissions = async () => {
  try {
    const roles = await Role.findAll({
      include: {
        model: Permission,
        as: 'permissions',
        through: { attributes: [] }, // Don't include the join table attributes
        attributes: ['id', 'name', 'description', 'type'] // Explicitly specify attributes that exist
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
    const permissions = await Permission.findAll({
      attributes: ['id', 'name', 'display_name', 'description', 'type'], // Explicitly specify attributes that exist
      order: [['name', 'ASC']]
    });
    return permissions;
  } catch (error) {
    throw { status: 500, message: error.message };
  }
};

const removePermissionFromRole = async (roleId, permissionId) => {
  try {
    const role = await Role.findByPk(roleId);
    if (!role) {
      throw { status: 404, message: `Role with id ${roleId} not found` };
    }
    const permission = await Permission.findByPk(permissionId);
    if (!permission) {
      throw { status: 404, message: `Permission with id ${permissionId} not found` };
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
      throw { status: 404, message: `Role with id ${roleId} not found` };
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
    const permission = await Permission.findByPk(permissionId);
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

module.exports = {
  createRole,
  createPermission,
  fetchAllUsers,
  getRolesAndPermissions,
  getAllPermissions,
  removePermissionFromRole,
  addPermissionToRole,
  deletePermission
};
