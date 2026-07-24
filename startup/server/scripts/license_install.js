#!/usr/bin/env node

'use strict';

// CLI for installing/inspecting a license outside of the running server.
//
// Usage:
//   node scripts/license_install.js install --token-file ./license.token
//   node scripts/license_install.js install --token "NBLIC1....."
//   node scripts/license_install.js machine        # show machine fingerprint
//   node scripts/license_install.js status         # show current license state
//   node scripts/license_install.js add-public-key --pem-file wallet_pub.pem
//
// Why a CLI? On a fresh box the HTTP server can't accept a license over
// HTTP (the license gate would block /api/license/install if it required
// auth, and we don't want unauth'd POSTs). The CLI does the same
// installation work directly, with file-level access to `<SECRET_DIR>`.

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const licenseService = require('../src/license/licenseService');
const env = require('../src/config/env');

function promptToken() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Paste license token (starts with NBLIC1...): ', (answer) => {
      rl.close();
      resolve((answer || '').trim());
    });
  });
}

function promptPem() {
  return new Promise((resolve) => {
    console.log('Paste PEM-encoded public key (ending with -----END PUBLIC KEY-----):');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
    const lines = [];
    rl.on('line', (line) => {
      lines.push(line);
      if (line.includes('-----END PUBLIC KEY-----')) {
        rl.close();
      }
    });
    rl.on('close', () => resolve(lines.join('\n').trim() + '\n'));
  });
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

function exitErr(msg, code = 1) {
  console.error(`license_install: ${msg}`);
  process.exit(code);
}

async function cmdInstall(args) {
  let token = args.token;
  if (!token && args['token-file']) {
    token = fs.readFileSync(args['token-file'], 'utf8').trim();
  }
  if (!token) {
    token = await promptToken();
    if (!token) {
      exitErr('no token provided');
    }
    // Persist the pasted token next to the app boot dir so re-running
    // install --token-file ./license.token works without re-pasting.
    const savedPath = path.resolve(process.cwd(), 'license.token');
    fs.writeFileSync(savedPath, token + '\n', { mode: 0o600 });
    console.log(`Saved token to ${savedPath}`);
  }
  console.log(`Installing license into ${env.SECRET_DIR}/license.token ...`);
  const result = await licenseService.installToken({ token });
  console.log('OK — license installed.');
  console.log(`  license_id: ${result.payload.license_id}`);
  console.log(`  serial:     ${result.payload.serial}`);
  console.log(`  expires_at: ${result.payload.expires_at}`);
  const plans = Array.isArray(result.payload.plan) ? result.payload.plan : [];
  const permissionCount = plans.reduce(
    (total, plan) => total + (Array.isArray(plan.permissions) ? plan.permissions.length : 0),
    0
  );
  console.log(`  plans:       ${plans.map((plan) => plan.name).join(', ') || '(none)'}`);
  console.log(`  permissions: ${permissionCount}`);
  return 0;
}

function cmdMachine() {
  const mf = require('../src/license/engine/core/machineFingerprint');
  const fp = mf.compute();
  console.log(JSON.stringify(fp, null, 2));
  return 0;
}

async function cmdStatus() {
  const licenseService = require('../src/license/licenseService');
  const snap = await licenseService.getStatusSnapshot();
  console.log(JSON.stringify(snap, null, 2));
  return snap?.ok ? 0 : 1;
}

async function cmdAddPublicKey(args) {
  const env = require('../src/config/env');
  let pem;
  if (args.pem) {
    pem = args.pem;
  } else if (args['pem-file']) {
    pem = fs.readFileSync(args['pem-file'], 'utf8');
  } else {
    pem = await promptPem();
    if (!pem || !pem.trim()) {
      exitErr('no PEM provided');
    }
    const savedPath = path.resolve(process.cwd(), 'wallet_public_key.pem');
    fs.writeFileSync(savedPath, pem, { mode: 0o600 });
    console.log(`Saved PEM to ${savedPath}`);
  }

  if (!pem.includes('BEGIN PUBLIC KEY')) {
    exitErr('input does not look like a PEM-encoded public key');
  }

  fs.mkdirSync(env.SECRET_DIR, { recursive: true });
  const file = path.join(env.SECRET_DIR, 'wallet_public_keys.json');
  let current = { keys: [] };
  if (fs.existsSync(file)) {
    try {
      current = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!current.keys) {
        current = { keys: Array.isArray(current) ? current : [] };
      }
    } catch (e) {
      console.warn(`Existing wallet_public_keys.json was unparseable; overwriting (${e.message})`);
      current = { keys: [] };
    }
  }
  if (current.keys.some(k => (typeof k === 'string' ? k === pem : k.public_pem === pem))) {
    console.log('Key already pinned; no change.');
    return 0;
  }
  current.keys.push(pem);
  fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
  console.log(`Added public key to ${file}. Total pinned keys: ${current.keys.length}`);
  return 0;
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const cmd = args._[0];

  switch (cmd) {
  case 'install':         return cmdInstall(args);
  case 'machine':         return cmdMachine();
  case 'status':          return cmdStatus();
  case 'add-public-key':  return cmdAddPublicKey(args);
  default:
    console.error('Usage:');
    console.error('  license_install.js install [--token-file <path> | --token <str>]');
    console.error('                              (prompts for token if neither flag given)');
    console.error('  license_install.js machine');
    console.error('  license_install.js status');
    console.error('  license_install.js add-public-key [--pem-file <path> | --pem <str>]');
    console.error('                              (prompts for PEM if neither flag given)');
    process.exit(2);
  }
}

main()
  .then(code => process.exit(code || 0))
  .catch(err => {
    console.error('license_install: fatal:', err);
    process.exit(1);
  });
