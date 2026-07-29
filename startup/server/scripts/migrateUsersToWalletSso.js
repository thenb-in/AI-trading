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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
  Move one company's users onto Wallet SSO.

    npm run migrate:sso-users -- --clear-local-password
    npm run migrate:sso-users -- --keep-local-password

  --clear-local-password   wipe the local password once Wallet has the hash;
                           from then on the app only accepts SSO logins
  --keep-local-password    leave local passwords alone, so both the app's own
                           login and SSO keep working during a phased rollout

  Env: APP_KEY, WALLET_DATABASE_URL
  The Wallet customer id and this app's company id are asked for when it runs.
`);
}

function parseArgs(argv) {
  const opts = { clearLocalPassword: null, help: false };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--clear-local-password') {
      opts.clearLocalPassword = true;
    } else if (arg === '--keep-local-password') {
      opts.clearLocalPassword = false;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

const normalizeUsername = (username) => String(username || '').trim().toLowerCase();

async function askUuid(rl, question) {
  for (;;) {
    const answer = (await rl.question(question)).trim();
    if (UUID_PATTERN.test(answer)) {
      return answer.toLowerCase();
    }
    console.log('  Not a uuid — try again (or Ctrl-C to stop).');
  }
}

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

async function assertWalletCustomer(wallet, customerId) {
  const [customers] = await wallet.query(
    'SELECT name FROM customers WHERE customer_id = :customerId LIMIT 1',
    { replacements: { customerId } }
  );
  if (!customers[0]) {
    throw new Error(`No Wallet customer with customer_id ${customerId}`);
  }

  const [companies] = await wallet.query(
    'SELECT name FROM nbnext_company WHERE id = :customerId LIMIT 1',
    { replacements: { customerId } }
  );
  if (!companies[0]) {
    throw new Error(
      `Wallet customer ${customerId} has no company row of the same id — create it on Wallet first`
    );
  }
  return customers[0].name;
}

async function readLocalCompany(companyId) {
  const [rows] = await localSequelize.query(
    'SELECT name FROM nbnext_company WHERE id = :companyId LIMIT 1',
    { replacements: { companyId } }
  );
  if (!rows[0]) {
    throw new Error(`No company ${companyId} in this app`);
  }
  return rows[0].name;
}

/** Tell Wallet which local company id to hand this app back in the SSO claim. */
async function upsertAppCompanyMapping(wallet, { customerId, appKey, appCompanyId }) {
  const [rows] = await wallet.query(
    'SELECT app_company_id FROM customer_app_companies WHERE customer_id = :customerId AND app_key = :appKey LIMIT 1',
    { replacements: { customerId, appKey } }
  );

  if (!rows[0]) {
    await wallet.query(
      `INSERT INTO customer_app_companies (customer_id, app_key, app_company_id, created_at, updated_at)
       VALUES (:customerId, :appKey, :appCompanyId, NOW(), NOW())`,
      { replacements: { customerId, appKey, appCompanyId } }
    );
    console.log(`  mapping added: ${appKey} -> ${appCompanyId}`);
    return;
  }

  if (rows[0].app_company_id === appCompanyId) {
    console.log('  mapping already correct');
    return;
  }

  await wallet.query(
    `UPDATE customer_app_companies SET app_company_id = :appCompanyId, updated_at = NOW()
     WHERE customer_id = :customerId AND app_key = :appKey`,
    { replacements: { customerId, appKey, appCompanyId } }
  );
  console.log(`  mapping changed: ${rows[0].app_company_id} -> ${appCompanyId}`);
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

  if (!process.stdin.isTTY) {
    throw new Error('Run this from a terminal — it asks for the two company ids interactively');
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

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log(`\n  app_key: ${appKey}`);
    console.log(`  passwords: ${opts.clearLocalPassword ? 'CLEAR after migrating' : 'keep as they are'}\n`);

    const customerId = await askUuid(rl, '  Wallet customer id: ');
    const customerName = await assertWalletCustomer(wallet, customerId);

    const appCompanyId = await askUuid(rl, '  This app\'s company id: ');
    const companyName = await readLocalCompany(appCompanyId);

    const users = await User.findAll({
      where: { company_id: appCompanyId },
      attributes: ['id', 'username', 'password', 'name', 'phone', 'isActive', 'is_approved'],
      order: [['username', 'ASC']]
    });
    if (users.length === 0) {
      throw new Error(`No users in company ${appCompanyId}`);
    }

    console.log(`\n  ${companyName} (this app, ${users.length} users)`);
    console.log(`    -> ${customerName} (Wallet customer ${customerId})`);
    if (opts.clearLocalPassword) {
      console.log('\n  Local passwords will be CLEARED. Only SSO logins will work afterwards.');
    }

    const confirm = (await rl.question('\n  Type yes to go ahead: ')).trim().toLowerCase();
    if (confirm !== 'yes') {
      console.log('  Cancelled, nothing written.');
      return;
    }
    rl.close();

    console.log('');
    await upsertAppCompanyMapping(wallet, { customerId, appKey, appCompanyId });

    const summary = {
      created: 0, alreadyOnWallet: 0, linked: 0,
      skipped: 0, conflicts: 0, passwordCleared: 0, passwordKept: 0, errors: 0
    };
    const ctx = { wallet, customerId, opts, summary };

    for (const user of users) {
      try {
        await migrateOneUser(ctx, user);
      } catch (err) {
        summary.errors += 1;
        logger.error(`[migrate-sso] FAIL ${normalizeUsername(user.username)}: ${err.message}`, err);
      }
    }

    console.log('\n[migrate-sso] Summary:', summary);
    if (summary.conflicts > 0) {
      console.log('  Conflicts are usernames already used by another customer on Wallet — rename one side, then re-run.');
    }
    if (summary.errors > 0) {
      throw new Error(`${summary.errors} user(s) failed`);
    }
  } finally {
    rl.close();
    await wallet.close();
    await localSequelize.close();
  }
}

main().catch((err) => {
  console.error(`[migrate-sso] ${err.message}`);
  process.exitCode = 1;
});
