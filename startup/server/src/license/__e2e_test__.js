/* eslint-disable no-console */
'use strict';

// Full end-to-end happy path + tamper detection. Uses the REAL wallet
// licenseService (issuer) wired to a fresh sqlite-style in-memory store,
// then hands the issued token to the framework's licenseService
// (verifier) and asserts the full acceptance pipeline works. No HTTP, no
// real DB — exercises the contract between the two sides directly.

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Isolate filesystem state.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lic-e2e-'));
process.env.SECRETS_PATH = tmp;
process.env.NODE_ENV = 'development';
process.env.APP_NAME = 'etime-payroll';

// Generate wallet keypair, pin pub in env.
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
process.env.LICENSE_WALLET_PUBLIC_KEYS = JSON.stringify([publicPem]);

const issuerFmt = require(path.resolve(
  __dirname, '../../../../../nbnext_wallet/server/src/services/license/tokenFormat.js'
));
const mf = require('./machineFingerprint');

let pass = 0;
let fail = 0;
function check(label, cond, detail) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}${detail ? `: ${JSON.stringify(detail)}` : ''}`); }
}

// Compute this machine's fingerprint (used as if the wallet issued for us).
const fp = mf.compute();

// Reset pinnedKeys + licenseService caches so we pick up the test env.
require('./pinnedKeys')._reset();
const licenseService = require('./licenseService');
licenseService._resetForTest();

// Make a fake License model so licenseStore can persist without a DB.
const fakeRows = new Map();
function wrapRow(row) {
  row.update = async (f) => { Object.assign(row, f); row.updated_at = Date.now(); return row; };
  return row;
}
const fakeLicense = {
  findOne: async () => {
    const all = [...fakeRows.values()];
    return all.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0))[0] || null;
  },
  create: async (fields) => {
    const row = wrapRow({ ...fields, id: fakeRows.size + 1, updated_at: Date.now() });
    fakeRows.set(row.licenseId, row);
    return row;
  },
  update: async (fields, where) => {
    for (const row of fakeRows.values()) {
      if (row.licenseId === where.where.licenseId) {
        Object.assign(row, fields);
        row.updated_at = Date.now();
      }
    }
  },
};
require.cache[require.resolve('../models')] = {
  exports: { License: fakeLicense, sequelize: { transaction: async () => ({ commit: async () => {}, rollback: async () => {} }) } },
};

console.log('── wallet issues + framework accepts ──────────────');
const issuedPayload = {
  v: 1,
  kind: 'license',
  key_id: 'test-kid-1',
  license_id: '11111111-1111-1111-1111-111111111111',
  serial: 1,
  customer_id: '22222222-2222-2222-2222-222222222222',
  app_name: 'etime-payroll',
  machine_fingerprint: fp.fingerprint,
  subscription_id: 1,
  permissions: ['Payroll.run', 'User.read'],
  permission_caps: { max_users: 50 },
  issued_at: new Date().toISOString(),
  not_before: new Date(Date.now() - 1000).toISOString(),
  expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
  renewal_after: new Date(Date.now() + 23 * 86400000).toISOString(),
  renewal_mode: 'online',
  max_clock_skew_seconds: 300,
  issuer: 'nbnext_wallet',
  nonce: 'deadbeef',
};
const token = issuerFmt.signPayload(issuedPayload, privatePem);

(async () => {
  // First-time install path.
  const installed = await licenseService.installToken({ token });
  check('framework accepts wallet-issued token', installed.ok);
  check('payload roundtrip matches', installed.payload?.license_id === issuedPayload.license_id);

  // Permission gate
  check('whitelist allows Payroll.run', licenseService.hasLicensedPermission('Payroll.run'));
  check('whitelist allows User.read', licenseService.hasLicensedPermission('User.read'));
  check('whitelist denies User.write', !licenseService.hasLicensedPermission('User.write'));

  // Status
  const snap = licenseService.getStatusSnapshot();
  check('status snapshot ok', snap.ok && snap.app_name === 'etime-payroll');
  check('status snapshot serial', snap.serial === 1);

  // App-name mismatch is refused
  const wrongApp = { ...issuedPayload, app_name: 'other-app', serial: 2 };
  const wrongAppTok = issuerFmt.signPayload(wrongApp, privatePem);
  const wrongRes = await licenseService.applyAirgapResponse({ token: wrongAppTok }).catch(e => ({ ok: false, msg: e.message }));
  check('app_name mismatch refused', !wrongRes.ok && /app_name_mismatch/.test(wrongRes.msg || ''), wrongRes);

  // Foreign key signed token refused
  const { privateKey: bogusPriv } = crypto.generateKeyPairSync('ed25519');
  const bogusTok = issuerFmt.signPayload({ ...issuedPayload, serial: 5 },
    bogusPriv.export({ type: 'pkcs8', format: 'pem' }));
  const bogusRes = await licenseService.applyAirgapResponse({ token: bogusTok }).catch(e => ({ ok: false, msg: e.message }));
  check('foreign-key token refused', !bogusRes.ok, bogusRes);

  // Replay of an older token (serial < seal.highest_serial) refused
  // First, advance the seal by installing serial=3.
  const tok3 = issuerFmt.signPayload({ ...issuedPayload, serial: 3 }, privatePem);
  const r3 = await licenseService.applyAirgapResponse({ token: tok3 });
  check('serial=3 accepted', r3.ok);
  const tok1Again = issuerFmt.signPayload({ ...issuedPayload, serial: 1, nonce: 'fresh' }, privatePem);
  const replay = await licenseService.applyAirgapResponse({ token: tok1Again }).catch(e => ({ ok: false, msg: e.message }));
  check('serial rollback refused', !replay.ok && /serial_rollback/.test(replay.msg || ''), replay);

  // Expired token refused
  const expired = issuerFmt.signPayload({
    ...issuedPayload,
    serial: 99,
    expires_at: new Date(Date.now() - 86400000).toISOString(),
  }, privatePem);
  const expRes = await licenseService.applyAirgapResponse({ token: expired }).catch(e => ({ ok: false, msg: e.message }));
  check('expired token refused', !expRes.ok && /expired/.test(expRes.msg || ''), expRes);

  // Cleanup
  fs.rmSync(tmp, { recursive: true, force: true });

  console.log('');
  console.log(`Total: ${pass + fail}   Pass: ${pass}   Fail: ${fail}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(err => {
  console.error('E2E test crashed:', err);
  process.exit(1);
});
