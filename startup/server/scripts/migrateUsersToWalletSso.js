#!/usr/bin/env node
'use strict';

/**
npm run migrate:sso-users -- --username=abc@1234
npm run migrate:sso-users -- --company-id=087f...
npm run migrate:sso-users -- --all

 */


const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const Sequelize = require('sequelize');
process.chdir(path.resolve(__dirname, '../../../app/server'));
const env = require('@startup/src/config/env');
const logger = require('@startup/logger');
const { User, IdentityLink, sequelize: etimeSequelize } = require('@startup/src/models');


const WALLET_LINK_STATUS = 'linked';

function printHelp() {
  const text = fs.readFileSync(__filename, 'utf8');
  const match = text.match(/\/\*\*([\s\S]*?)\*\//);
  console.log((match ? match[1] : '').replace(/^\s*\*/gm, '').trim());
}

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    activeOnly: false,
    clearLocalPassword: false,
    walletAppKey: null,
    walletDatabaseUrl: process.env.WALLET_DATABASE_URL || null,
    walletEnv: null,
    username: null,
    companyId: null,
    customerId: null,
    all: false,
    help: false
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--active-only') {
      opts.activeOnly = true;
    } else if (arg === '--clear-local-password') {
      opts.clearLocalPassword = true;
    } else if (arg === '--all') {
      opts.all = true;
    } else if (arg.startsWith('--username=')) {
      opts.username = arg.slice('--username='.length).trim();
    } else if (arg.startsWith('--company-id=')) {
      opts.companyId = arg.slice('--company-id='.length).trim();
    } else if (arg.startsWith('--customer-id=')) {
      opts.customerId = arg.slice('--customer-id='.length).trim();
    } else if (arg.startsWith('--wallet-database-url=')) {
      opts.walletDatabaseUrl = arg.slice('--wallet-database-url='.length).trim();
    } else if (arg.startsWith('--wallet-env=')) {
      opts.walletEnv = arg.slice('--wallet-env='.length).trim();
    } else if (arg.startsWith('--wallet-app-key=')) {
      opts.walletAppKey = arg.slice('--wallet-app-key='.length).trim();
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Env file not found: ${filePath}`);
  }
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq < 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}


function resolveWalletDatabaseUrl(opts) {
  if (opts.walletDatabaseUrl) {
    return opts.walletDatabaseUrl;
  }
  if (opts.walletEnv) {
    const walletEnvFile = loadEnvFile(path.resolve(opts.walletEnv));
    if (walletEnvFile.DATABASE_URL) {
      console.log(`[migrate-sso] Using Wallet DATABASE_URL from ${opts.walletEnv}`);
      return walletEnvFile.DATABASE_URL;
    }
    throw new Error(`No DATABASE_URL in ${opts.walletEnv}`);
  }
  throw new Error(
    'Wallet DB URL missing. Set WALLET_DATABASE_URL (or pass --wallet-database-url= / --wallet-env=).'
  );
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function buildUserWhere(opts) {
  const where = {};
  if (opts.username) {
    where.username = normalizeUsername(opts.username);
  }
  if (opts.companyId) {
    where.company_id = opts.companyId;
  }

  if (opts.activeOnly) {
    where.isActive = true;
    where.is_approved = true;
  }
  return where;
}

async function assertAppKeyRegistered(walletSequelize, application) {
  const [rows] = await walletSequelize.query(
    'SELECT app_key FROM applications WHERE app_key = :application LIMIT 1',
    { replacements: { application } }
  );
  if (rows[0]) {
    return;
  }
  const [all] = await walletSequelize.query('SELECT app_key FROM applications ORDER BY app_key');
  const known = all.map((a) => a.app_key).join(', ') || '(none registered)';
  throw new Error(`app_key "${application}" is not a registered Wallet application. Known app_keys: ${known}`);
}


async function ensureSourceAppKeyColumn(walletSequelize) {
  await walletSequelize.query(
    'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS source_app_key VARCHAR(255)'
  );
}


async function ensureNullablePassword() {
  await etimeSequelize.query('ALTER TABLE nbnext_users ALTER COLUMN password DROP NOT NULL');
}


async function clearLocalPassword(user) {
  await etimeSequelize.query(
    'UPDATE nbnext_users SET password = NULL, updated_at = NOW() WHERE id = :id',
    { replacements: { id: user.id } }
  );
}

async function findWalletAccount(walletSequelize, username) {
  const [rows] = await walletSequelize.query(
    'SELECT id, username, password_hash, customer_id, is_active, source_app_key FROM accounts WHERE username = :username LIMIT 1',
    { replacements: { username } }
  );
  return rows[0] || null;
}

async function createWalletAccount(walletSequelize, { accountId, username, user, customerId, application }) {
  await walletSequelize.query(
    `INSERT INTO accounts
      (id, email, username, password_hash, name, customer_id, source_app_key, email_verified, is_active, is_locked, last_login_at, created_at, updated_at)
     VALUES
      (:id, NULL, :username, :password_hash, :name, :customer_id, :source_app_key, false, :is_active, false, NULL, NOW(), NOW())`,
    {
      replacements: {
        id: accountId,
        username,
        password_hash: user.password,
        name: user.name || username,
        customer_id: customerId,
        source_app_key: application,
        is_active: Boolean(user.isActive)
      }
    }
  );
}


async function refreshWalletAccount(walletSequelize, { existing, user, username, customerId, application }) {
  await walletSequelize.query(
    `UPDATE accounts
     SET password_hash = COALESCE(:password_hash, password_hash),
         name = :name,
         customer_id = :customer_id,
         is_active = :is_active,
         source_app_key = :source_app_key,
         updated_at = NOW()
     WHERE id = :id`,
    {
      replacements: {
        id: existing.id,
        password_hash: user.password || null,
        name: user.name || username,
        customer_id: customerId,
        is_active: Boolean(user.isActive),
        source_app_key: application
      }
    }
  );
}

async function upsertWalletLink(walletSequelize, { accountId, application, user }) {
  const [rows] = await walletSequelize.query(
    `SELECT id FROM identity_links
     WHERE application = :application AND external_user_id = :external_user_id
     LIMIT 1`,
    { replacements: { application, external_user_id: String(user.id) } }
  );
  if (!rows[0]) {
    await walletSequelize.query(
      `INSERT INTO identity_links
        (identity_id, application, external_user_id, company_id, status, created_at, updated_at)
       VALUES
        (:identity_id, :application, :external_user_id, :company_id, :status, NOW(), NOW())`,
      {
        replacements: {
          identity_id: accountId,
          application,
          external_user_id: String(user.id),
          company_id: user.company_id,
          status: WALLET_LINK_STATUS
        }
      }
    );
    return;
  }
  await walletSequelize.query(
    `UPDATE identity_links
     SET identity_id = :identity_id, company_id = :company_id, status = :status, updated_at = NOW()
     WHERE id = :id`,
    {
      replacements: {
        id: rows[0].id,
        identity_id: accountId,
        company_id: user.company_id,
        status: WALLET_LINK_STATUS
      }
    }
  );
}

async function upsertLocalLink(IdentityLink, { accountId, user }) {
  const localLink = await IdentityLink.findOne({ where: { wallet_account_id: accountId } });
  if (!localLink) {
    await IdentityLink.create({
      wallet_account_id: accountId,
      user_id: user.id,
      company_id: user.company_id
    });
    return;
  }
  if (localLink.user_id !== user.id) {
    throw new Error(
      `Local IdentityLink for account ${accountId} already points to user ${localLink.user_id}`
    );
  }
  await localLink.update({ company_id: user.company_id });
}

async function migrateOneUser(ctx, user) {
  const { walletSequelize, IdentityLink, opts, application } = ctx;
  const username = normalizeUsername(user.username);
  const customerId = opts.customerId || user.company_id;
  const label = `${username} (${user.id})`;
  const summary = ctx.summary;

  const existing = await findWalletAccount(walletSequelize, username);
  let accountId = existing?.id || null;
  // Gate for --clear-local-password: only true once THIS user's hash is in Wallet.
  let passwordHandedToWallet = false;

  if (!existing) {
    if (!user.password) {
      ctx.logger.warn(`[migrate-sso] SKIP ${label}: no password hash, cannot create account`);
      summary.skipped += 1;
      return;
    }
    accountId = randomUUID();
    ctx.logger.info(`[migrate-sso] CREATE account username=${username} owner=${application} accountId=${accountId}`);
    if (!opts.dryRun) {
      await createWalletAccount(walletSequelize, { accountId, username, user, customerId, application });
    }
    passwordHandedToWallet = true;
    summary.created += 1;
  } else {

    const owner = existing.source_app_key || null;
    const ownedByThisApp = !owner || owner === application;
    if (ownedByThisApp) {
      ctx.logger.info(`[migrate-sso] REFRESH account username=${username} owner=${application}`);
      if (!opts.dryRun) {
        await refreshWalletAccount(walletSequelize, { existing, user, username, customerId, application });
      }
      passwordHandedToWallet = Boolean(user.password);
      summary.updated += 1;
    } else {
      ctx.logger.info(`[migrate-sso] SKIP password: account username=${username} is owned by app_key=${owner}`);
      summary.skipped += 1;
    }
  }

  if (!opts.dryRun && accountId) {
    await upsertWalletLink(walletSequelize, { accountId, application, user });
    await upsertLocalLink(IdentityLink, { accountId, user });
  }
  summary.linked += 1;

  if (opts.clearLocalPassword && user.password) {
    if (!passwordHandedToWallet) {
      ctx.logger.warn(`[migrate-sso] KEEP local password ${label}: hash never reached Wallet`);
      summary.passwordKept += 1;
    } else {
      ctx.logger.info(`[migrate-sso] CLEAR local password ${label}`);
      if (!opts.dryRun) {
        await clearLocalPassword(user);
      }
      summary.passwordCleared += 1;
    }
  }

  ctx.logger.info(`[migrate-sso] OK ${label} → account ${accountId}`);
}

async function main() {
  // Parse + help BEFORE touching @startup so `--help` works without env/DB.
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  if (!opts.username && !opts.companyId && !opts.all) {
    printHelp();
    throw new Error('Specify --username=, --company-id=, or --all');
  }
  const application = opts.walletAppKey || env.APP_KEY;
  if (!application) {
    throw new Error('No app_key. Set APP_KEY (or pass --wallet-app-key=).');
  }
  const walletUrl = resolveWalletDatabaseUrl(opts);

  const walletSequelize = new Sequelize(walletUrl, { logging: false, dialect: 'postgres' });
  await walletSequelize.authenticate();

  // App-side app_key MUST match a registered Wallet application, else the links
  // we write point at nothing and SSO silently fails.
  await assertAppKeyRegistered(walletSequelize, application);
  await ensureSourceAppKeyColumn(walletSequelize);
  if (opts.clearLocalPassword && !opts.dryRun) {
    await ensureNullablePassword();
  }

  const users = await User.findAll({
    where: buildUserWhere(opts),
    attributes: ['id', 'username', 'password', 'name', 'company_id', 'isActive', 'is_approved'],
    order: [['username', 'ASC']]
  });

  if (users.length === 0) {
    await walletSequelize.close();
    await etimeSequelize.close();
    throw new Error('No matching users found');
  }

  logger.info(
    `[migrate-sso] app_key=${application} users=${users.length} dryRun=${opts.dryRun}`
  );

  const summary = {
    created: 0, updated: 0, skipped: 0, linked: 0, errors: 0,
    passwordCleared: 0, passwordKept: 0
  };
  const ctx = { walletSequelize, IdentityLink, opts, application, logger, summary };

  for (const user of users) {
    try {
      await migrateOneUser(ctx, user);
    } catch (err) {
      summary.errors += 1;
      logger.error(`[migrate-sso] FAIL ${normalizeUsername(user.username)} (${user.id}): ${err.message}`, err);
    }
  }

  console.log('\n[migrate-sso] Summary:', summary);

  await walletSequelize.close();
  await etimeSequelize.close();

  if (summary.errors > 0) {
    throw new Error(`${summary.errors} user(s) failed to migrate`);
  }
}

main().catch((err) => {
  console.error(`[migrate-sso] ${err.message}`);
  process.exitCode = 1;
});
