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
const licenseService = require('./src/license/licenseService');
const companyService = require('./src/services/companyService');
const userService = require('./src/services/userService');
const multiCompanyService = require('./src/services/multiCompanyService');
const { isValidUuid } = require('./src/utils/uuidUtils');
const { normalizeUsername } = require('./src/utils/normalizeUtils');
// signup moved out of authService into the services/auth barrel with the SSO
// work; approveUser stayed behind. Importing both from authService left signup
// undefined here, so seeding died with "undefined is not a function" the moment
// it tried to create the sadmin user - after the company and permissions had
// already been committed.
const { signup } = require('./src/services/auth');
const { approveUser } = require('./src/services/authService');


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

// The auth layer throws plain `{ status, message }` objects for validation
// failures (see services/auth/passwordPolicy.js), not Errors. Passed to
// logger.error(msg, meta) those vanish: winston takes the first argument as the
// message and the meta's own `message` key never surfaces, so a rejected
// password printed as a bare "Error occurred during setup" with no cause at all.
// Concatenating the reason into the message is what tells the operator - or the
// engineer reading a production log - what actually went wrong.
const reasonOf = (err) =>
  err?.message || (err && typeof err === 'object' ? JSON.stringify(err) : String(err));

/**
 * Decide the id the company is created with.
 *
 * A license grants its plans to ONE company: subscriptionResolvers refuses to
 * serve them to any id other than the token's `customer_id` (the wallet tenant
 * that bought the license). At an airgapped site there is no wallet to ask and
 * no SSO provisioning to align the two, so the id has to be supplied when the
 * company is made — `npm run create-new-company <company_id>` — or taken from a
 * license that is already installed.
 *
 * Getting this wrong is silent and expensive: the company is created, the
 * sadmin user gets every permission, and then every login resolves to ZERO
 * permissions because the license refuses the company. So both mismatches are
 * refused here, while the id is still free to choose.
 */
async function resolveCompanyId(requestedId) {
  if (requestedId && !isValidUuid(requestedId)) {
    throw new Error(`Company id "${requestedId}" is not a UUID — pass the wallet customer_id the license was issued for`);
  }

  let licensedId = null;
  try {
    const snapshot = await licenseService.getStatusSnapshot();
    licensedId = snapshot?.ok ? snapshot.customer_id : null;
  } catch (err) {
    logger.warn(`Could not read the installed license to check the company id: ${reasonOf(err)}`);
  }

  if (requestedId && licensedId && requestedId.toLowerCase() !== licensedId.toLowerCase()) {
    throw new Error(`Company id ${requestedId} does not match the installed license, which was issued for customer ${licensedId} — a company created under ${requestedId} would get no permissions at all`);
  }
  if (!requestedId && licensedId) {
    logger.info(`No company id given; using the installed license's customer id ${licensedId}`);
    return licensedId;
  }
  if (!requestedId) {
    logger.info(`No company id given and no license installed — the database will generate one for ${env.DEFAULT_COMPANY}. Install the license FIRST, or pass its customer_id, if this install is licensed.`);
  }
  return requestedId || null;
}

/**
 * Create a company
 */
async function createCompany(transaction, userRole, companyId) {
  const companyNameInput = await askQuestion(`Enter company name (${env.DEFAULT_COMPANY}): `);
  const companyName = companyNameInput || env.DEFAULT_COMPANY;
  logger.info(`Checking for existing company: ${companyName}`);

  // Check if company already exists. When an id was supplied it is the identity
  // that matters — the same company may well be re-run under a different name.
  const existingCompany = await db.Company.findOne({
    where: companyId ? { id: companyId } : { name: companyName },
    transaction
  });

  if (existingCompany) {
    logger.info(`Company already exists with ID: ${existingCompany.id}`);
    return existingCompany;
  }

  logger.info(`Creating company: ${companyName}${companyId ? ` with ID ${companyId}` : ''}`);
  // companyService.createCompany is what the frontend's create-company flow
  // uses: it takes the id when one is given and generates a UUID when it is
  // not, and its defaults (mobileApp off, desktopWeb on, mobileWeb off) are
  // the ones this seeder wants anyway.
  const company = await companyService.createCompany(
    { id: companyId, name: companyName, role_id: userRole.id },
    transaction
  );
  logger.info(`Company created with ID: ${company.id}`);
  return company;
}

/**
 * Link a user that already exists to this company, the way the user-management
 * screen assigns an existing user to another company. Returns null when the
 * username is free, so the caller goes on to collect a password and sign them up.
 *
 * Re-running the seeder against an existing sadmin is the normal case at a site
 * that is adding a second company: asking for a password there would only reject
 * it (signup refuses a username that exists), so the prompt is skipped entirely.
 */
async function linkExistingUser(username, company) {
  const existingUser = await userService.getUserByUsername(username);
  if (!existingUser) {
    return null;
  }

  const existingLink = await multiCompanyService.findUserCompanyLink(existingUser.id, company.id);
  if (existingLink) {
    logger.info(`User ${username} already exists (id ${existingUser.id}) and is already linked to company ${company.id} — nothing to assign`);
    return existingUser;
  }

  await multiCompanyService.assignUserToCompany(existingUser.id, company.id);
  logger.info(`User ${username} already exists (id ${existingUser.id}) — assigned to company ${company.id}`);
  return existingUser;
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
    username = normalizeUsername(env.SADMIN_USERNAME);
    if (!username) {
      logger.info(`Non-interactive run: SADMIN_USERNAME ${env.SADMIN_USERNAME} not set — skipping user creation`);
      return null;
    }

    const existingUser = await linkExistingUser(username, company);
    if (existingUser) {
      return existingUser;
    }

    password = env.SADMIN_PASSWORD;
    if (!password) {
      logger.info(`Non-interactive run: SADMIN_PASSWORD not set for new user ${username} — skipping user creation`);
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

    username = normalizeUsername(await askQuestion('Enter username: '));
    if (!username) {
      logger.info(`No username entered for company ${company.id} — skipping user creation`);
      return null;
    }

    const existingUser = await linkExistingUser(username, company);
    if (existingUser) {
      return existingUser;
    }

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
  createStartingAppData = noopStartingAppData,
  // `npm run create-new-company <company_id>` — npm forwards the positional
  // through to the script, so it lands here whichever entrypoint was used.
  companyId = process.argv[2]
} = {}) {
  const resolvedCompanyId = await resolveCompanyId(companyId);
  const transaction = await db.sequelize.transaction();
  let transactionCommitted = false;
  try {
    const roles = await createDefaultRoles(transaction);
    const sadminRole = roles.find((r) => r.name === SYSTEM_ROLE_CONSTANTS.SUPER_ADMIN.name);
    const userRole = roles.find((r) => r.name === SYSTEM_ROLE_CONSTANTS.USER.name);

    const company = await createCompany(transaction, userRole, resolvedCompanyId);
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

    // approve user — approveUser logs the outcome itself, and the lines above
    // already tie this id to its username, so nothing is repeated here.
    if (user) {
      await approveUser(user.id);
    }

    // Always run createStartingAppData to ensure all default data exists
    // This will skip any data that already exists and only create new data
    await createStartingAppData(company);
    logger.info(`Setup completed successfully for ${company.name}!`);
    rl?.close();
  } catch (err) {
    logger.error(`Error occurred during setup: ${reasonOf(err)}`, err);
    if (!transactionCommitted) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        logger.error(`Error rolling back transaction: ${reasonOf(rollbackErr)}`, rollbackErr);
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
    //
    // exitCode rather than exit(1): the success path already relies on the
    // process ending by itself once readline is closed and the pool goes idle,
    // and killing it here would cut off the log writes we just queued.
    logger.error(`Setup failed: ${reasonOf(err)}`, err);
    process.exitCode = 1;
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
