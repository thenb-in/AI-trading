const {
  MODULE_PERMISSION_CONSTANTS,
  MASTER_PERMISSION_CONSTANTS,
  REPORT_PERMISSION_CONSTANTS,
  SYSTEM_ROLE_CONSTANTS
} = require('../../src/constants/permissions');
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
 * Collect all permissions from all constant sources
 * Handles nested structures and detects duplicates
 */
function collectAllPermissions() {
  const allPermissions = [];
  const seenNames = new Map(); // Track duplicates: name -> [sources]

  // Collect module permissions
  Object.values(MODULE_PERMISSION_CONSTANTS).forEach((permission) => {
    if (permission && permission.name) {
      if (seenNames.has(permission.name)) {
        seenNames.get(permission.name).push('MODULE_PERMISSION_CONSTANTS');
      } else {
        seenNames.set(permission.name, ['MODULE_PERMISSION_CONSTANTS']);
        allPermissions.push({
          name: permission.name,
          display_name: permission.display_name,
          description: permission.description,
          type: 'module'
        });
      }
    }
  });

  // Collect report permissions
  Object.values(REPORT_PERMISSION_CONSTANTS).forEach((permission) => {
    if (permission && permission.name) {
      if (seenNames.has(permission.name)) {
        seenNames.get(permission.name).push('REPORT_PERMISSION_CONSTANTS');
      } else {
        seenNames.set(permission.name, ['REPORT_PERMISSION_CONSTANTS']);
        allPermissions.push({
          name: permission.name,
          display_name: permission.display_name,
          description: permission.description,
          type: 'report'
        });
      }
    }
  });

  // Collect master permissions (nested structure)
  Object.values(MASTER_PERMISSION_CONSTANTS).forEach((master) => {
    if (master && typeof master === 'object') {
      Object.values(master).forEach((permission) => {
        if (permission && permission.name) {
          if (seenNames.has(permission.name)) {
            seenNames.get(permission.name).push('MASTER_PERMISSION_CONSTANTS');
          } else {
            seenNames.set(permission.name, ['MASTER_PERMISSION_CONSTANTS']);
            allPermissions.push({
              name: permission.name,
              display_name: permission.display_name,
              description: permission.description,
              type: 'master'
            });
          }
        }
      });
    }
  });

  // Log warnings for duplicates
  seenNames.forEach((sources, name) => {
    if (sources.length > 1) {
      logger.warn(`Duplicate permission name detected: "${name}" found in ${sources.join(', ')}. Skipping duplicates.`);
    }
  });

  return allPermissions;
}

/**
 * Create permissions
 */
async function createDefaultPermissions(transaction) {
  const permissionsArray = collectAllPermissions();
  logger.info(`Collecting ${permissionsArray.length} unique permissions from all constants...`);

  // find permissions which are not already created
  const existingPermissions = await db.Permission.findAll({
    where: { name: { [Op.in]: permissionsArray.map((p) => p.name) } },
    transaction
  });
  const existingPermissionsNames = existingPermissions.map((p) => p.name);
  const permissionsToCreate = permissionsArray.filter((p) => !existingPermissionsNames.includes(p.name));

  if (permissionsToCreate.length > 0) {
    logger.info(`Permissions to create: ${permissionsToCreate.map((p) => p.name).join(', ')}`);
    const permissions = await db.Permission.bulkCreate(permissionsToCreate, {
      transaction,
      returning: true
    });
    logger.info(`Extra permissions created: ${permissions.map((p) => p.name).join(', ')}`);
    // Return all permissions (existing + newly created)
    return [...existingPermissions, ...permissions];
  }
  logger.info(`Permissions were already created: ${existingPermissionsNames.join(', ')}`);
  return existingPermissions;
}





module.exports = {
  createDefaultRoles,
  createDefaultPermissions
}
