'use strict';
require(require.resolve('module-alias', { paths: [process.cwd()] }))(process.cwd());
const readline = require('readline');
const logger = require('./logger');
const { createDefaultRoles, createDefaultPermissions, createDefaultSubscription } = require('./scripts/default_data/startup');
const env = require('./src/config/env');
const frameworkPermissionSets = require('./src/constants/permissions');
const { SYSTEM_ROLE_CONSTANTS } = frameworkPermissionSets;
const { YES, INPUT_SKIP_KEY } = require('./src/constants/standard_constants');
const db = require('./src/models'); // Sequelize models index
const { signup, approveUser } = require('./src/services/authService');


// Non-TTY (CI, piped stdin): readline would hit EOF immediately and close,
// making the first rl.question() throw ERR_USE_AFTER_CLOSE. Detect that up
// front and switch to env-var-backed defaults instead — see createCompany /
// createUser below for which env vars feed which prompt.
const isInteractive = Boolean(process.stdin.isTTY);
const rl = isInteractive
  ? readline.createInterface({ input: process.stdin, output: process.stdout })
  : null;
const askQuestion = (query) =>
  isInteractive
    ? new Promise((resolve) => rl.question(query, resolve))
    : Promise.resolve('');

/**
 * Create a company
 */
async function createCompany(transaction, userRole) {
  const companyNameInput = await askQuestion(`Enter company name (${env.DEFAULT_COMPANY}): `);
  const companyName = companyNameInput || env.DEFAULT_COMPANY;
  logger.info(`Checking for existing company: ${companyName}`);

  // Check if company already exists
  const existingCompany = await db.Company.findOne({
    where: { name: companyName },
    transaction
  });

  if (existingCompany) {
    logger.info(`Company already exists with ID: ${existingCompany.id}`);
    return existingCompany;
  }

  logger.info(`Creating company: ${companyName}`);
  const company = await db.Company.create(
    {
      name: companyName,
      mobileApp: false,
      desktopWeb: true,
      mobileWeb: false,
      role_id: userRole.id
    },
    { transaction }
  );
  logger.info(`Company created with ID: ${company.id}`);
  return company;
}

/**
 * Create a user and assign to company
 */
async function createUser(company, transaction) {
  let username;
  let password;
  let phone;
  let name;

  if (!isInteractive) {
    // CI / scripted runs: pull credentials from env. If they're missing,
    // skip user creation rather than guess — downstream tests will fail
    // loudly on missing login, which is the right signal.
    username = env.SADMIN_USERNAME;
    password = env.SADMIN_PASSWORD;
    if (!username || !password) {
      logger.info(`Non-interactive run: SADMIN_USERNAME ${username}/SADMIN_PASSWORD ${password} not set — skipping user creation`);
      return null;
    }
    phone = null;
    name = username;
    logger.info(`Non-interactive run: creating sadmin user "${username}"`);
  } else {
    const createUserAnswer = await askQuestion(
      'Do you want to create a user? (yes/no): '
    );
    if (createUserAnswer.toLowerCase() !== YES) {
      return null;
    }

    username = await askQuestion('Enter username: ');
    password = await askQuestion('Enter password: ');
    phone = await askQuestion(`Enter phone number (optional, press ${INPUT_SKIP_KEY} to skip): `) || null;
    name = await askQuestion(`Enter user name (optional, press ${INPUT_SKIP_KEY} to use username): `) || username;
  }

  // get role with name super admin
  const superAdminRole = await db.Role.findOne({ where: { name: SYSTEM_ROLE_CONSTANTS.SUPER_ADMIN.name } });

  logger.info(`Creating user: ${username}`);
  const user = await signup(
    username,
    password,
    company.id,
    { phone, name, role: superAdminRole.id },
    transaction
  );

  // Assign user to company
  logger.info(
    `User ${username} created and assigned to company ID: ${company.id}`
  );
  return user;
}

// startup has no product data of its own to seed, so the default hook does
// nothing. An app built on startup injects its own — see options.createStartingAppData.
const noopStartingAppData = async () => {};

/**
 * Main setup function
 *
 * Both app-specific inputs are injected rather than imported, because startup
 * cannot reach into the app layer to find them.
 *
 * @param {object} [options]
 * @param {object} [options.permissionSets] the permission sets to seed. Defaults
 *   to startup's framework set — an app built on startup passes its own composed
 *   set instead (see app/server/scripts/create_new_company.js).
 * @param {(company: object) => Promise<void>} [options.createStartingAppData] hook
 *   run after the company is committed, to seed product-specific starting data.
 *   Defaults to a no-op.
 */
async function main({
  permissionSets = frameworkPermissionSets,
  createStartingAppData = noopStartingAppData
} = {}) {
  const transaction = await db.sequelize.transaction();
  let transactionCommitted = false;
  try {
    const roles = await createDefaultRoles(transaction);
    const sadminRole = roles.find((r) => r.name === SYSTEM_ROLE_CONSTANTS.SUPER_ADMIN.name);
    const userRole = roles.find((r) => r.name === SYSTEM_ROLE_CONSTANTS.USER.name);

    const company = await createCompany(transaction, userRole);
    const permissions = await createDefaultPermissions(transaction, permissionSets);

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
      logger.info(`No new permissions to add to sadmin role: ${Array.from(existingPermissionNames).join(', ')}`);
    }

    await createDefaultSubscription(company, permissions, transaction);

    await transaction.commit();
    transactionCommitted = true;

    const user = await createUser(company, null); // No transaction needed after commit

    // approve user
    if (user) {
      await approveUser(user.id);
      logger.info(`User ${user.username} approved successfully ${user.id}`);
    }

    // Always run createStartingAppData to ensure all default data exists
    // This will skip any data that already exists and only create new data
    await createStartingAppData(company);
    logger.info(`Setup completed successfully for ${company.name}!`);
    rl?.close();
  } catch (err) {
    logger.error('Error occurred during setup', err);
    if (!transactionCommitted) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        logger.error('Error rolling back transaction', rollbackErr);
      }
    }
    rl?.close();
    // Re-throw so the script exits non-zero. Without this the catch
    // swallows the failure, npm sees exit 0, and the CI step plows on
    // with a half-set-up database.
    throw err;
  }
}

const runToExit = (options) =>
  main(options).catch((err) => {
    // main() already logs inside its own catch; log once more for top-level
    // visibility and exit non-zero so callers (npm, CI) see the failure.
    logger.error('Setup failed', err);
    process.exit(1); // eslint-disable-line no-process-exit
  });

// Run directly (`node create_company_with_role_and_perms.js`) and only the
// framework permissions get seeded, with no product starting data. An app built
// on startup requires this module from its own entrypoint and injects both — see
// app/server/scripts/create_new_company.js, which is what `npm run create-new-company`
// invokes.
if (require.main === module) {
  runToExit();
}

module.exports = { runToExit };
