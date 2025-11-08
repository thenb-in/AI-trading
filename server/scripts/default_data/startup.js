const { MODULE_PERMISSION_CONSTANTS, SYSTEM_ROLE_CONSTANTS } = require('../../src/constants/permissions');
const db = require('../../src/models'); // Sequelize models index
const { Op } = require('sequelize');
const logger = require('../../logger');


/**
 * Create roles in the system
 */
async function createDefaultRoles(transaction) {
    const rolesArray = Object.values(SYSTEM_ROLE_CONSTANTS).map((role) => ({
      name: role.name,
      description: role.description
    }));
    logger.info(`Creating ${rolesArray.length} roles...`);
  
    // find roles which are not already created
    const existingRoles = await db.Role.findAll({ where: { name: { [Op.in]: rolesArray.map((r) => r.name) } } });
    const existingRolesNames = existingRoles.map((r) => r.name);
    const rolesToCreate = rolesArray.filter((r) => !existingRolesNames.includes(r.name));
    if (rolesToCreate.length > 0) {
      const roles = await db.Role.bulkCreate(rolesToCreate, {
        transaction,
        returning: true
      });
      logger.info(`Extra roles created: ${roles.map((r) => r.name).join(', ')}`);
      return roles;
    }
    logger.info(`Roles were already created: ${existingRolesNames.join(', ')}`);
    return existingRoles;
}




/**
 * Create permissions
 */
async function createDefaultPermissions(transaction) {
  const permissionsArray = Object.values(MODULE_PERMISSION_CONSTANTS).map((permission) => ({
    name: permission.name,
    display_name: permission.display_name,
    description: permission.description,
    type: 'module'
  }));
  logger.info(`Creating ${permissionsArray.length} permissions...`);
  // find permissions which are not already created
  const existingPermissions = await db.Permission.findAll({ where: { name: { [Op.in]: permissionsArray.map((p) => p.name) } } });
  const existingPermissionsNames = existingPermissions.map((p) => p.name);
  const permissionsToCreate = permissionsArray.filter((p) => !existingPermissionsNames.includes(p.name));
  logger.info(`Permissions to create: ${permissionsToCreate.map((p) => p.name).join(', ')}`);
  if (permissionsToCreate.length > 0) {
    const permissions = await db.Permission.bulkCreate(permissionsToCreate, {
      transaction,
      returning: true
    });
    logger.info(`Extra permissions created: ${permissions.map((p) => p.name).join(', ')}`);
    return permissions;
  }
  logger.info(`Permissions were already created: ${existingPermissionsNames.join(', ')}`);
  return existingPermissions;
}





module.exports = {
  createDefaultRoles,
  createDefaultPermissions
}
