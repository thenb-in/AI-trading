/* eslint-disable */

'use strict';

// Anti-rollback seal tests. Verifies that:
//   1. A fresh boot with no seal accepts the first token.
//   2. A second token with a higher serial advances the seal.
//   3. An older token (lower serial) is rejected after the seal advances.
//   4. Editing the seal JSON to lower the integer is ignored (the trusted
//      serial is re-derived from the verified anchor_token).
//   5. A wall-clock rollback is detected.

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Point SECRET_DIR at a temp dir so we don't pollute real state.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lic-seal-test-'));
process.env.SECRETS_PATH = tmp;
process.env.NODE_ENV = 'development';

// dotenv-safe needs the example file present even for tests. Stub it.
const stubExamplePath = path.join(__dirname, '../../../.env.example');
const stubEnvPath = path.join(__dirname, '../../../.env');
let createdStub = false;
if (!fs.existsSync(stubExamplePath)) {
  fs.writeFileSync(stubExamplePath, 'NODE_ENV=development\n');
  createdStub = true;
}
if (!fs.existsSync(stubEnvPath)) {
  fs.writeFileSync(stubEnvPath, 'NODE_ENV=development\n');
}

// Generate a wallet keypair for this test run.
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });

// Bake the public key into env so pinnedKeys.load() picks it up.
process.env.LICENSE_WALLET_PUBLIC_KEYS = JSON.stringify([publicPem]);

// Require AFTER setting env so config loads the right paths.
const pinnedKeys = require('../engine/core/pinnedKeys');

pinnedKeys._reset();

const issuerFmt = require(path.resolve(
  __dirname, '../../../../../../nbnext_wallet/app/server/src/services/license/tokenFormat.js'
));
const seal = require('../engine/core/licenseSeal');

let pass = 0;
let fail = 0;
function check(label, cond, detail) {
  if (cond) {
    pass++; console.log(`  ✓ ${label}`);
  } else {
    fail++; console.error(`  ✗ ${label}${detail ? `: ${JSON.stringify(detail)}` : ''}`);
  }
}

function makePayload(serial) {
  return {
    v: 1,
    kind: 'license',
    license_id: 'lic-smoketest',
    machine_fingerprint: 'fp-smoke',
    serial,
    issued_at: new Date().toISOString(),
    not_before: new Date(Date.now() - 1000).toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    max_clock_skew_seconds: 300
  };
}

console.log(`── fresh boot accepts first token ─────────────────`);
const p1 = makePayload(1);
const t1 = issuerFmt.signPayload(p1, privatePem);
const v1 = seal.validateAgainstSeal(p1);
check(`first token validates (no prior seal)`, v1.ok);
seal.advanceSeal({ payload: p1, token: t1 });
const sealAfter1 = seal.readSealFile();
check('seal file written', !!sealAfter1 && sealAfter1.highest_serial === 1);

console.log(`── second token (higher serial) accepted ──────────`);
const p2 = makePayload(2);
const t2 = issuerFmt.signPayload(p2, privatePem);
const v2 = seal.validateAgainstSeal(p2);
check(`serial=2 accepted after seal=1`, v2.ok);
seal.advanceSeal({ payload: p2, token: t2 });
const sealAfter2 = seal.readSealFile();
check('seal advanced to 2', sealAfter2.highest_serial === 2);

console.log(`── replay of older token rejected ─────────────────`);
const v1Again = seal.validateAgainstSeal(p1);
check(`serial=1 rejected when seal=2`, !v1Again.ok && v1Again.reason === 'serial_rollback', v1Again);

console.log(`── tampered seal JSON ignored ─────────────────────`);
const sealFile = path.join(tmp, 'license.seal.json');
const tampered = JSON.parse(fs.readFileSync(sealFile, 'utf8'));
tampered.highest_serial = 0; // attacker tries to lower it
fs.writeFileSync(sealFile, JSON.stringify(tampered));
// anchor_token (signed) still says serial=2; trusted serial should be 2.
const v1AfterTamper = seal.validateAgainstSeal(p1);
check(`lowering seal JSON does not let serial=1 through`, !v1AfterTamper.ok, v1AfterTamper);

console.log(`── clock rollback detected ────────────────────────`);
const sealNow = JSON.parse(fs.readFileSync(sealFile, 'utf8'));
sealNow.last_wallclock_iso = new Date(Date.now() + 3600000).toISOString(); // pretend we saw a wall clock 1h ahead
fs.writeFileSync(sealFile, JSON.stringify(sealNow));
const p3 = makePayload(3);
const v3 = seal.validateAgainstSeal(p3);
check(`clock rollback rejected`, !v3.ok && v3.reason === 'clock_rollback', v3);

// cleanup
if (createdStub) {
  fs.unlinkSync(stubExamplePath);
}
if (fs.existsSync(stubEnvPath)) {
  fs.unlinkSync(stubEnvPath);
}
fs.rmSync(tmp, { recursive: true, force: true });

console.log('');
console.log(`Total: ${pass + fail}   Pass: ${pass}   Fail: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
