const logger = require('../../../logger');
const { Permission } = require('../../models');
const { findModelByIdOrThrow, validateName, validateDescription } = require('../../utils/startup/modelHelpers');

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

const getAllPermissions = async () => {
  try {
    const permissions = await Permission.findAll({
      attributes: ['id', 'name', 'display_name', 'description', 'type'],
      order: [['name', 'ASC']]
    });
    return permissions;
  } catch (error) {
    throw { status: 500, message: error.message };
  }
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
  getAllPermissions,
  getPermissionById,
  getPermissionsByIds,
  deletePermission
};
