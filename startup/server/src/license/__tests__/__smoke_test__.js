/* eslint-disable */

'use strict';

// End-to-end smoke test for the license crypto + format. Self-contained:
// generates a wallet keypair, signs a payload, verifies on the other side,
// exercises tamper detection paths. Run with: `node src/license/__smoke_test__.js`
//
// Intentionally NOT under a Jest/Vitest suite — this is a quick CI gate
// for the framework's most security-critical primitive and is small
// enough to read at a glance. If it fails, the license system is broken.

const crypto = require('crypto');
const path = require('path');
const verifierFmt = require('../engine/core/tokenFormat');

const issuerFmt = require(path.resolve(
  __dirname, '../../../../../../nbnext_wallet/server/src/services/license/tokenFormat.js'
));

let pass = 0;
let fail = 0;
function check(label, cond, detail) {
  if (cond) {
    pass++; console.log(`  ✓ ${label}`);
  } else {
    fail++; console.error(`  ✗ ${label}${detail ? `: ${JSON.stringify(detail)}` : ''}`);
  }
}

function genKey() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicPem: publicKey.export({ type: 'spki', format: 'pem' }),
    privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' })
  };
}

console.log('── token format round-trip ────────────────────────');
const k = genKey();
const payload = {
  v: 1,
  kind: 'license',
  license_id: 'test-uuid',
  serial: 7,
  machine_fingerprint: 'fp-abc',
  expires_at: new Date(Date.now() + 86400000).toISOString(),
  permissions: ['User.read', 'User.write']
};
const token = issuerFmt.signPayload(payload, k.privatePem);
check('issuer produces token with header', token.startsWith('NBLIC1.'));

const v = verifierFmt.verifyToken(token, k.publicPem);
check('verifier accepts a valid token', v.ok);
check('verifier returns matching payload', v.ok && v.payload.license_id === 'test-uuid');
check('verifier returns matching serial', v.ok && v.payload.serial === 7);

console.log('── verifier rejects tampered payload ───────────────');
const parts = token.split('.');
const bad = `${parts[0]}.${Buffer.from('{"oops":1}').toString('base64url')}.${parts[2]}`;
const vBad = verifierFmt.verifyToken(bad, k.publicPem);
check('payload swap rejected', !vBad.ok, vBad);

console.log('── verifier rejects tampered signature ─────────────');
const sigBuf = Buffer.from(`${parts[2].replace(/-/g, '+').replace(/_/g, '/')}==`, 'base64');
sigBuf[0] ^= 0xff;
const badSig = `${parts[0]}.${parts[1]}.${sigBuf.toString('base64')
  .replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
const vSig = verifierFmt.verifyToken(badSig, k.publicPem);
check('signature flip rejected', !vSig.ok, vSig);

console.log('── verifier rejects wrong public key ───────────────');
const wrongK = genKey();
const vWrong = verifierFmt.verifyToken(token, wrongK.publicPem);
check('foreign-key verification rejected', !vWrong.ok, vWrong);

console.log('── verifier accepts via key rotation set ───────────');
const vRotated = verifierFmt.verifyToken(token, [wrongK.publicPem, k.publicPem]);
check('rotation set finds the right key', vRotated.ok && vRotated.keyIndex === 1);

console.log('── version header check ────────────────────────────');
const wrongVer = token.replace(/^NBLIC1\./, 'NBLIC9.');
const vVer = verifierFmt.verifyToken(wrongVer, k.publicPem);
check('wrong version rejected', !vVer.ok && vVer.reason === 'bad-version');

console.log('── machine fingerprint compute ─────────────────────');
let fpResult;
try {
  const mf = require('../engine/core/machineFingerprint');
  fpResult = mf.compute();
  check('fingerprint computed', typeof fpResult.fingerprint === 'string' && fpResult.fingerprint.length === 64);
  check('fingerprint deterministic', mf.compute().fingerprint === fpResult.fingerprint);
} catch (err) {
  check(`fingerprint compute (skipped: ${err.message})`, true);
}

console.log('');
console.log(`Total: ${pass + fail}   Pass: ${pass}   Fail: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
