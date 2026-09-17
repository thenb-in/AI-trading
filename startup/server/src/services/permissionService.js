const logger = require('../../logger');
const { Permission } = require('../models');
const { findModelByIdOrThrow, validateName, validateDescription } = require('../utils/modelHelpers');
const { formatPermissions } = require('../data_formatters/permission_formatter');
const { isDeclaredPermission } = require('../constants/permissionCatalog');

const createPermission = async (name, display_name, description, type) => {
  const trimmedName = validateName(name, { fieldName: 'Permission name' });
  const trimmedDescription = validateDescription(description);

  const existingPermission = await Permission.findOne({ where: { name: trimmedName } });
  if (existingPermission) {
    logger.warn(`Permission creation failed - Permission with name ${trimmedName} already exists`);
    throw new Error(`Permission with this name already exists ${trimmedName}.`);
  }

  const newPermission = await Permission.create({
    name: trimmedName,
    display_name: display_name,
    description: trimmedDescription,
    type: type
  });

  logger.info(`New permission created successfully: ${newPermission.id} - ${newPermission.name} - ${newPermission}`);
  return newPermission;
};


const createMissingPermissions = async (permissions) => {
  const byName = new Map();
  for (const permission of permissions || []) {
    if (permission?.name && !byName.has(permission.name)) {
      byName.set(permission.name, {
        name: permission.name,
        display_name: permission.display_name || permission.name,
        description: permission.description || null,
        type: permission.type || null
      });
    }
  }
  if (byName.size === 0) {
    return [];
  }
  const existing = await Permission.findAll({ where: { name: [...byName.keys()] }, attributes: ['name'] });
  for (const row of existing) {
    byName.delete(row.name);
  }
  if (byName.size === 0) {
    return [];
  }
  const created = [...byName.keys()];
  await Permission.bulkCreate([...byName.values()]);
  logger.info(`Created ${created.length} missing permission(s): ${created.join(', ')}`);
  return created;
};

const getAllPermissions = async () => {
  const permissions = await Permission.findAll({
    attributes: ['id', 'name', 'display_name', 'description', 'type'],
    order: [['name', 'ASC']]
  });
  return formatPermissions(permissions);
};

const getPermissionById = async (permissionId) => {
  return await findModelByIdOrThrow(Permission, permissionId, {}, 'Permission');
};

const getPermissionsByIds = async (permissionIds) => {
  const permissionIdArray = Array.isArray(permissionIds) ? permissionIds : [permissionIds];
  const permissions = await Permission.findAll({
    where: {
      id: permissionIdArray
    }
  });
  return permissions;
};

const deletePermission = async (permissionId) => {
  try {
    const permission = await findModelByIdOrThrow(Permission, permissionId, {}, 'Permission');
    if (!permission) {
      throw { status: 404, message: `Permission with id ${permissionId} not found` };
    }

    // Only the rows nothing asks for go. A permission the constants declare is
    // one the code checks for at runtime — deleting it would lock everyone out
    // of whatever it guards, and the next seed would put it straight back.
    if (isDeclaredPermission(permission.name)) {
      throw {
        status: 400,
        message: `Permission "${permission.name}" is declared in the permission constants and cannot be deleted. `
          + `Remove it from the constants first, then delete it here.`
      };
    }

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
  createPermission,
  createMissingPermissions,
  getAllPermissions,
  getPermissionById,
  getPermissionsByIds,
  deletePermission
};
