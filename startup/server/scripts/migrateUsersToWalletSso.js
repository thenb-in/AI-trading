#!/usr/bin/env node
'use strict';

/**
   npm run migrate:sso-users -- --clear-local-password
   npm run migrate:sso-users -- --keep-local-password
 */

const path = require('path');
const { randomUUID } = require('crypto');
const readline = require('readline/promises');

const APP_SERVER_DIR = path.resolve(__dirname, '../../../app/server');
let Sequelize;
let env;
let logger;
let User;
let localSequelize;

function loadAppRuntime() {
  process.chdir(APP_SERVER_DIR);
  require(require.resolve('module-alias/register', { paths: [APP_SERVER_DIR] }));

  Sequelize = require(require.resolve('sequelize', { paths: [APP_SERVER_DIR] }));
  env = require('@startup/src/config/env');
  logger = require('@startup/logger');
  ({ User, sequelize: localSequelize } = require('@startup/src/models'));
}

function printHelp() {
  console.log(`
  Move every app company's users onto Wallet SSO, automatically.

    npm run migrate:sso-users -- --clear-local-password
    npm run migrate:sso-users -- --keep-local-password [--yes]

  --clear-local-password   wipe the local password once Wallet has the hash;
                           from then on the app only accepts SSO logins
  --keep-local-password    leave local passwords alone, so both the app's own
                           login and SSO keep working during a phased rollout
  --yes                    skip the confirmation prompt (for unattended runs)

  Env: APP_KEY, WALLET_DATABASE_URL
  Walks every company in this app and resolves each one's Wallet customer from
  what Wallet already knows — the company IS a customer, or a
  customer_app_companies mapping names it. Companies Wallet cannot resolve have
  no tenant to migrate into, so they are skipped and listed; add their mapping
  in Wallet's Customer Master and re-run. Nothing is asked per company.
`);
}

function parseArgs(argv) {
  const opts = { clearLocalPassword: null, help: false, assumeYes: false };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--clear-local-password') {
      opts.clearLocalPassword = true;
    } else if (arg === '--keep-local-password') {
      opts.clearLocalPassword = false;
    } else if (arg === '--yes' || arg === '-y') {
      opts.assumeYes = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

const normalizeUsername = (username) => String(username || '').trim().toLowerCase();

async function assertAppKeyRegistered(wallet, appKey) {
  const [rows] = await wallet.query(
    'SELECT app_key FROM applications WHERE app_key = :appKey LIMIT 1',
    { replacements: { appKey } }
  );
  if (rows[0]) {
    return;
  }
  const [all] = await wallet.query('SELECT app_key FROM applications ORDER BY app_key');
  const known = all.map((row) => row.app_key).join(', ') || '(none registered)';
  throw new Error(`APP_KEY "${appKey}" is not a registered Wallet application. Known: ${known}`);
}

// Every company in this app — the automatic run walks these instead of being
// told which one.
async function listLocalCompanies() {
  const [rows] = await localSequelize.query(
    'SELECT id, name FROM nbnext_company ORDER BY name'
  );
  return rows;
}

/**
 * The Wallet customer this app's company id refers to, asking Wallet what it
 * already knows instead of the operator. Mirrors Wallet's own
 * customerAppCompanyService.resolveWalletCustomerId: the id IS a Wallet customer
 * (wallet-provisioned apps send ours back), else a customer_app_companies row
 * claims it (by app_key), else neither.
 */
async function resolveWalletCustomerIdForApp(wallet, appCompanyId, appKey) {
  const [customers] = await wallet.query(
    'SELECT customer_id FROM customers WHERE customer_id = :appCompanyId LIMIT 1',
    { replacements: { appCompanyId } }
  );
  if (customers[0]) {
    return { customerId: appCompanyId, via: 'customer' };
  }

  const [mappings] = await wallet.query(
    'SELECT customer_id FROM customer_app_companies WHERE app_company_id = :appCompanyId AND app_key = :appKey',
    { replacements: { appCompanyId, appKey } }
  );
  if (mappings.length === 1) {
    return { customerId: mappings[0].customer_id, via: 'mapping' };
  }
  if (mappings.length > 1) {
    return { customerId: null, via: 'ambiguous' };
  }
  return { customerId: null, via: 'unmapped' };
}

async function getWalletCustomerName(wallet, customerId) {
  const [rows] = await wallet.query(
    'SELECT name FROM customers WHERE customer_id = :customerId LIMIT 1',
    { replacements: { customerId } }
  );
  return rows[0]?.name || null;
}

// Split every company into the ones Wallet can resolve (migrate) and the ones it
// can't (skip — nothing to migrate into until a mapping exists).
async function planCompanies(wallet, companies, appKey) {
  const toMigrate = [];
  const skipped = [];
  for (const company of companies) {
    const { customerId, via } = await resolveWalletCustomerIdForApp(wallet, company.id, appKey);
    if (via === 'customer' || via === 'mapping') {
      toMigrate.push({ company, customerId, via });
    } else {
      skipped.push({ company, via });
    }
  }
  return { toMigrate, skipped };
}

async function findWalletUser(wallet, username) {
  const [rows] = await wallet.query(
    'SELECT id, username, password, company_id FROM nbnext_users WHERE username = :username LIMIT 1',
    { replacements: { username } }
  );
  return rows[0] || null;
}

async function createWalletUser(wallet, { walletUserId, username, user, customerId }) {
  await wallet.query(
    `INSERT INTO nbnext_users
      (id, username, password, name, phone, company_id, is_active, is_approved, is_totp_enabled)
     VALUES
      (:id, :username, :password, :name, :phone, :companyId, :isActive, :isApproved, false)`,
    {
      replacements: {
        id: walletUserId,
        username,
        password: user.password,
        name: user.name || username,
        phone: user.phone || null,
        companyId: customerId,
        isActive: Boolean(user.isActive),
        isApproved: Boolean(user.is_approved)
      }
    }
  );

  await wallet.query(
    'INSERT INTO nbnext_user_profiles (id, user_id, current_company) VALUES (:id, :userId, :companyId)',
    { replacements: { id: randomUUID(), userId: walletUserId, companyId: customerId } }
  );

  await wallet.query(
    `INSERT INTO nbnext_multi_company_module (user_id, company_id, created_at, updated_at)
     VALUES (:userId, :companyId, NOW(), NOW())
     ON CONFLICT (user_id, company_id) DO NOTHING`,
    { replacements: { userId: walletUserId, companyId: customerId } }
  );
}

async function migrateOneUser(ctx, user) {
  const { wallet, customerId, opts, summary } = ctx;
  const username = normalizeUsername(user.username);
  const label = `${username} (${user.id})`;

  const existing = await findWalletUser(wallet, username);
  let walletUserId;
  // Gate for --clear-local-password: only true once THIS user can sign in at Wallet.
  let passwordHandedToWallet = false;

  if (!existing) {
    if (!user.password) {
      logger.warn(`[migrate-sso] SKIP ${label}: no local password to carry over`);
      summary.skipped += 1;
      return;
    }
    walletUserId = randomUUID();
    await createWalletUser(wallet, { walletUserId, username, user, customerId });
    passwordHandedToWallet = true;
    summary.created += 1;
    logger.info(`[migrate-sso] CREATE ${label} -> wallet user ${walletUserId}`);
  } else if (existing.company_id !== customerId) {
    // Usernames are unique across the whole of Wallet, so this one is already taken by another
    // customer's person. Guessing which human it is would be the wrong kind of clever.
    logger.warn(
      `[migrate-sso] SKIP ${label}: username taken on Wallet by company ${existing.company_id}`
    );
    summary.conflicts += 1;
    return;
  } else {
    walletUserId = existing.id;
    if (!existing.password && user.password) {
      await wallet.query('UPDATE nbnext_users SET password = :password WHERE id = :id', {
        replacements: { password: user.password, id: walletUserId }
      });
      passwordHandedToWallet = true;
    } else {
      passwordHandedToWallet = Boolean(existing.password);
    }
    summary.alreadyOnWallet += 1;
    logger.info(`[migrate-sso] LINK ${label} -> existing wallet user ${walletUserId}`);
  }

  await User.update({ wallet_user_id: walletUserId }, { where: { id: user.id } });
  summary.linked += 1;

  if (!opts.clearLocalPassword || !user.password) {
    return;
  }
  if (!passwordHandedToWallet) {
    logger.warn(`[migrate-sso] KEEP local password ${label}: Wallet has no hash for them`);
    summary.passwordKept += 1;
    return;
  }
  await localSequelize.query('UPDATE nbnext_users SET password = NULL WHERE id = :id', {
    replacements: { id: user.id }
  });
  summary.passwordCleared += 1;
}

// Migrate one resolved company's users under its Wallet customer id. Returns how
// many users it had (0 = nothing to do, printed nothing).
async function migrateCompany(wallet, company, customerId, opts, summary) {
  const users = await User.findAll({
    where: { company_id: company.id },
    attributes: ['id', 'username', 'password', 'name', 'phone', 'isActive', 'is_approved'],
    order: [['username', 'ASC']]
  });
  if (users.length === 0) {
    return 0;
  }

  const customerName = await getWalletCustomerName(wallet, customerId);
  console.log(`\n  ${company.name} -> ${customerName || '(unnamed)'} (Wallet customer ${customerId}, ${users.length} users)`);

  const ctx = { wallet, customerId, opts, summary };
  for (const user of users) {
    try {
      await migrateOneUser(ctx, user);
    } catch (err) {
      summary.errors += 1;
      logger.error(`[migrate-sso] FAIL ${normalizeUsername(user.username)}: ${err.message}`, err);
    }
  }
  return users.length;
}

async function confirmOrAbort(opts, companyCount) {
  if (opts.assumeYes) {
    return true;
  }
  if (!process.stdin.isTTY) {
    throw new Error('Not a terminal — re-run with --yes to migrate without the confirmation prompt');
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`\n  Type yes to migrate ${companyCount} companies: `)).trim().toLowerCase();
  rl.close();
  return answer === 'yes';
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }
  if (opts.clearLocalPassword === null) {
    printHelp();
    throw new Error('Pass --clear-local-password or --keep-local-password');
  }

  loadAppRuntime();

  const appKey = env.APP_KEY;
  if (!appKey) {
    throw new Error('APP_KEY is not set in this app\'s env');
  }
  const walletUrl = process.env.WALLET_DATABASE_URL;
  if (!walletUrl) {
    throw new Error('WALLET_DATABASE_URL is not set');
  }

  const wallet = new Sequelize(walletUrl, { logging: false, dialect: 'postgres' });
  await wallet.authenticate();
  await assertAppKeyRegistered(wallet, appKey);

  try {
    console.log(`\n  app_key: ${appKey}`);
    console.log(`  passwords: ${opts.clearLocalPassword ? 'CLEAR after migrating' : 'keep as they are'}`);

    const companies = await listLocalCompanies();
    const { toMigrate, skipped } = await planCompanies(wallet, companies, appKey);

    console.log(`\n  ${companies.length} companies in this app: ${toMigrate.length} resolvable on Wallet, ${skipped.length} skipped (no Wallet customer/mapping).`);
    for (const { company, via } of skipped) {
      console.log(`    SKIP ${company.name} (${company.id}) — ${via}`);
    }
    if (toMigrate.length === 0) {
      console.log('\n  Nothing to migrate. Add the mappings in Wallet\'s Customer Master, then re-run.');
      return;
    }
    if (opts.clearLocalPassword) {
      console.log('\n  Local passwords will be CLEARED for migrated users. Only SSO logins will work afterwards.');
    }

    if (!(await confirmOrAbort(opts, toMigrate.length))) {
      console.log('  Cancelled, nothing written.');
      return;
    }

    const summary = {
      created: 0, alreadyOnWallet: 0, linked: 0,
      skipped: 0, conflicts: 0, passwordCleared: 0, passwordKept: 0, errors: 0
    };
    let companiesMigrated = 0;
    for (const { company, customerId } of toMigrate) {
      if (await migrateCompany(wallet, company, customerId, opts, summary) > 0) {
        companiesMigrated += 1;
      }
    }

    console.log(`\n[migrate-sso] Companies migrated: ${companiesMigrated}/${toMigrate.length}`);
    console.log('[migrate-sso] Summary:', summary);
    if (summary.conflicts > 0) {
      console.log('  Conflicts are usernames already used by another customer on Wallet — rename one side, then re-run.');
    }
    if (skipped.length > 0) {
      console.log(`  ${skipped.length} companies skipped for having no Wallet customer/mapping — add them in the Customer Master and re-run.`);
    }
    if (summary.errors > 0) {
      throw new Error(`${summary.errors} user(s) failed`);
    }
  } finally {
    await wallet.close();
    await localSequelize.close();
  }
}

main().catch((err) => {
  console.error(`[migrate-sso] ${err.message}`);
  process.exitCode = 1;
});
