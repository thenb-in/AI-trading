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





const DEFAULT_SUBSCRIPTION_NAME = 'All';

/**
 * Seed the global "All" subscription and ensure it grants every permission.
 * Re-runs safely: existing subscription and existing permission rows are
 * preserved; only missing links are added. Status is upserted to 'subscribed'
 * so older rows that were 'not_subscribed' get promoted on re-seed.
 *
 * Then link the given company to this subscription via CompanySubscription —
 * without that link, verifyValidSubscribedPermission strips every permission
 * from users in that company.
 */
async function createDefaultSubscription(company, permissions, transaction) {
  const [subscription, created] = await db.Subscription.findOrCreate({
    where: { name: DEFAULT_SUBSCRIPTION_NAME, companyId: null },
    defaults: {
      name: DEFAULT_SUBSCRIPTION_NAME,
      description: 'Grants every permission. Seeded for first-run setup.',
      companyId: null
    },
    transaction
  });
  logger.info(`Default subscription "${DEFAULT_SUBSCRIPTION_NAME}" ${created ? 'created' : 'already exists'} (id=${subscription.id})`);

  const existingLinks = await db.SubscriptionPermission.findAll({
    where: { subscription_id: subscription.id },
    transaction
  });
  const existingByPermissionId = new Map(existingLinks.map((l) => [l.permission_id, l]));

  const linksToCreate = [];
  const linksToPromote = [];
  for (const permission of permissions) {
    const existing = existingByPermissionId.get(permission.id);
    if (!existing) {
      linksToCreate.push({
        subscription_id: subscription.id,
        permission_id: permission.id,
        status: 'subscribed'
      });
    } else if (existing.status !== 'subscribed') {
      linksToPromote.push(existing);
    }
  }

  if (linksToCreate.length > 0) {
    await db.SubscriptionPermission.bulkCreate(linksToCreate, { transaction });
    logger.info(`Linked ${linksToCreate.length} permissions to "${DEFAULT_SUBSCRIPTION_NAME}"`);
  }
  for (const link of linksToPromote) {
    link.status = 'subscribed';
    await link.save({ transaction });
  }
  if (linksToPromote.length > 0) {
    logger.info(`Promoted ${linksToPromote.length} permission links to 'subscribed' on "${DEFAULT_SUBSCRIPTION_NAME}"`);
  }
  if (linksToCreate.length === 0 && linksToPromote.length === 0) {
    logger.info(`"${DEFAULT_SUBSCRIPTION_NAME}" already grants all ${permissions.length} permissions`);
  }

  // TODO: only the Subscription + permission links belong in seed data. Auto-
  // subscribing the company to "All" should move into the e2e test setup —
  // production companies should pick a subscription explicitly, not inherit
  // every permission from seeding.
  const [, linkCreated] = await db.CompanySubscription.findOrCreate({
    where: { company_id: company.id, subscription_id: subscription.id },
    defaults: { company_id: company.id, subscription_id: subscription.id },
    transaction
  });
  logger.info(`Company ${company.name} ${linkCreated ? 'subscribed to' : 'already subscribed to'} "${DEFAULT_SUBSCRIPTION_NAME}"`);

  return subscription;
}

module.exports = {
  createDefaultRoles,
  createDefaultPermissions,
  createDefaultSubscription
};
