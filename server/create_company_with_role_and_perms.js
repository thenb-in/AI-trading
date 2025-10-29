'use strict';
const bcrypt = require('bcrypt');
const readline = require('readline');
const db = require('./src/models'); // Sequelize models index
const logger = require('./logger');
const { ROLE_CONSTANTS, PERMISSION_CONSTANTS, SETUP_CONSTANTS } = require('./src/constants');

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
  const rolesArray = [
    {
      name: ROLE_CONSTANTS.SADMIN,
      description: ROLE_CONSTANTS.SADMIN_DESCRIPTION
    },
    {
      name: ROLE_CONSTANTS.ADMIN,
      description: ROLE_CONSTANTS.ADMIN_DESCRIPTION
    },
    {
      name: ROLE_CONSTANTS.USER,
      description: ROLE_CONSTANTS.USER_DESCRIPTION
    }
  ];
  logger.info(`Creating ${rolesArray.length} roles...`);

  const roles = await db.Role.bulkCreate(rolesArray, {
    transaction,
    returning: true
  });
  logger.info(`Roles created: ${roles.map((r) => r.name).join(', ')}`);
  return roles;
}

/**
 * Create a company
 */
async function createCompany(transaction, userRole) {
  const companyName = await askQuestion('Enter company name: ');
  logger.info(`Creating company: ${companyName}`);
  const company = await db.Company.create(
    {
      name: companyName || SETUP_CONSTANTS.DEFAULT_COMPANY_NAME,
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
  const permissionsArray = [
    {
      name: PERMISSION_CONSTANTS.APPROVE_USER,
      description: PERMISSION_CONSTANTS.APPROVE_USER_DESC
    },
    {
      name: PERMISSION_CONSTANTS.DEACTIVATE_USER,
      description: PERMISSION_CONSTANTS.DEACTIVATE_USER_DESC
    },
    {
      name: PERMISSION_CONSTANTS.GET_COMPANY_SETTINGS,
      description: PERMISSION_CONSTANTS.GET_COMPANY_SETTINGS_DESC
    },
    // {
    //   name: 'View AdminLayout',
    //   description: 'Permission to access admin layout view'
    // },
    {
      name: PERMISSION_CONSTANTS.ADD_ROLE,
      description: PERMISSION_CONSTANTS.ADD_ROLE_DESC
    },
    {
      name: PERMISSION_CONSTANTS.LINK_ROLE_PERMISSION,
      description: PERMISSION_CONSTANTS.LINK_ROLE_PERMISSION_DESC
    },
    {
      name: PERMISSION_CONSTANTS.IS_ADMIN,
      description: PERMISSION_CONSTANTS.IS_ADMIN_DESC
    },
    {
      name: PERMISSION_CONSTANTS.VIEW_COMPANY_SETTINGS,
      description: PERMISSION_CONSTANTS.VIEW_COMPANY_SETTINGS_DESC
    },
    {
      name: PERMISSION_CONSTANTS.VIEW_ADMIN_LAYOUT,
      description: PERMISSION_CONSTANTS.VIEW_ADMIN_LAYOUT_DESC
    },
    {
      name: PERMISSION_CONSTANTS.HAS_ROLE_PERMISSION,
      description: PERMISSION_CONSTANTS.HAS_ROLE_PERMISSION_DESC
    }
  ];
  logger.info(`Creating ${permissionsArray.length} permissions...`);
  const permissions = await db.Permission.bulkCreate(permissionsArray, {
    transaction,
    returning: true
  });
  logger.info(
    `Permissions created: ${permissions.map((p) => p.name).join(', ')}`
  );
  return permissions;
}

/**
 * Create a user and assign to company
 */
async function createUser(transaction, company) {
  const createUserAnswer = await askQuestion(
    'Do you want to create a user? (yes/no): '
  );
  if (createUserAnswer.toLowerCase() !== SETUP_CONSTANTS.YES_ANSWER) {
    return null;
  }

  const username = await askQuestion('Enter username: ');
  const password = await askQuestion('Enter password: ');
  const hashedPassword = await bcrypt.hash(password, SETUP_CONSTANTS.BCRYPT_ROUNDS);

  logger.info(`Creating user: ${username}`);
  const user = await db.User.create(
    {
      username,
      password: hashedPassword,
      phone: SETUP_CONSTANTS.DEFAULT_PHONE,
      name: username,
      companyId: company.id
    },
    { transaction }
  );

  // Assign user to company
  await user.setCompany(company, { transaction });
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
    const sadminRole = roles.find((r) => r.name === ROLE_CONSTANTS.SADMIN);
    const userRole = roles.find((r) => r.name === ROLE_CONSTANTS.USER);

    const company = await createCompany(transaction, userRole);
    const permissions = await createPermissions(transaction);

    // Assign all permissions to sadmin role
    logger.info(
      `Assigning ${permissions.length} permissions to sadmin role...`
    );
    await sadminRole.setPermissions(permissions, { transaction });

    await createUser(transaction, company);

    await transaction.commit();
    logger.info(`Setup completed successfully for ${company.name}!`);
    rl.close();
  } catch (err) {
    logger.error(`Error occurred during setup: ${err.message} - Stack: ${err.stack}`);
    await transaction.rollback();
    rl.close();
  }
}

main();
