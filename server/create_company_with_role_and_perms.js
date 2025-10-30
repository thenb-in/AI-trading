'use strict';
const readline = require('readline');
const db = require('./src/models'); // Sequelize models index
const { Op } = require('sequelize');
const logger = require('./logger');
const { MODULE_PERMISSION_CONSTANTS, SYSTEM_ROLE_CONSTANTS } = require('./src/constants/permissions');
const env = require('./src/config/env');
const { YES } = require('./src/constants/standard_constants');
const { signup } = require('./src/services/startup/authService');

// Utility to get user input from terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const askQuestion = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

/**
 * Create roles in the system
 */
async function createRoles(transaction) {
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
 * Create a company
 */
async function createCompany(transaction, userRole) {
  const companyName = await askQuestion('Enter company name: ');
  logger.info(`Creating company: ${companyName}`);
  const company = await db.Company.create(
    {
      name: companyName || env.DEFAULT_COMPANY_NAME,
      mobileApp: false,
      desktopWeb: true,
      mobileWeb: false,
      roleId: userRole.id
    },
    { transaction }
  );
  logger.info(`Company created with ID: ${company.id}`);
  return company;
}

/**
 * Create permissions
 */
async function createPermissions(transaction) {
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

/**
 * Create a user and assign to company
 */
async function createUser(company) {
  const createUserAnswer = await askQuestion(
    'Do you want to create a user? (yes/no): '
  );
  if (createUserAnswer.toLowerCase() !== YES) {
    return null;
  }

  const username = await askQuestion('Enter username: ');
  const password = await askQuestion('Enter password: ');

  // get role with name super admin
  const superAdminRole = await db.Role.findOne({ where: { name: SYSTEM_ROLE_CONSTANTS.SUPER_ADMIN.name } });

  logger.info(`Creating user: ${username}`);
  const user = await signup(username,
    password,
    company.id,
    { name: username,
      role: superAdminRole.id
    }
  );


  // Assign user to company
  logger.info(
    `User ${username} created and assigned to company ID: ${company.id}`
  );
  return user;
}

/**
 * Main setup function
 */
async function main() {
  const transaction = await db.sequelize.transaction();
  try {
    const roles = await createRoles(transaction);
    const sadminRole = roles.find((r) => r.name === SYSTEM_ROLE_CONSTANTS.SUPER_ADMIN.name);
    const userRole = roles.find((r) => r.name === SYSTEM_ROLE_CONSTANTS.USER.name);

    const company = await createCompany(transaction, userRole);
    const permissions = await createPermissions(transaction);

    // Assign permissions to sadmin role without removing existing ones
    logger.info(
      `Ensuring ${permissions.length} permissions are assigned to sadmin role (non-destructive merge)...`
    );
    const existingRolePermissions = await sadminRole.getPermissions({ transaction });
    const existingPermissionNames = new Set(existingRolePermissions.map((p) => p.name));
    const permissionsToAdd = permissions.filter((p) => !existingPermissionNames.has(p.name));
    if (permissionsToAdd.length > 0) {
      await sadminRole.addPermissions(permissionsToAdd, { transaction });
      logger.info(`Added permissions to sadmin: ${permissionsToAdd.map((p) => p.name).join(', ')}`);
    } else {
      logger.info(`No new permissions to add to sadmin role: ${existingPermissionNames.join(', ')}`);
    }

    await transaction.commit();

    await createUser(company);

    logger.info(`Setup completed successfully for ${company.name}!`);
    rl.close();
  } catch (err) {
    logger.error(`Error occurred during setup: ${err.message} - Stack: ${err.stack}`);
    await transaction.rollback();
    rl.close();
  }
}

main();
