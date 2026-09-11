#!/usr/bin/env node
// Initializes .env files from their .env.example counterparts for the app
// and the test suites. Idempotent: if a .env already exists, it is left
// untouched.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

// `inheritFrom`: wagemaster reuses the framework and the app's controllers, so
// it must share the HR app's DB/JWT/uploads settings. Its .env.example leaves
// those keys blank on purpose — a plain copy would boot with no DATABASE_URL.
// For such targets, blank keys are filled from the donor .env; keys the example
// gives a value to (PORT, SYNC_DB, ...) are wagemaster's own and win.
const TARGETS = [
  { dir: 'app/client', label: 'app/client' },
  { dir: 'app/server', label: 'app/server' },
  { dir: 'wagemaster', label: 'wagemaster', inheritFrom: 'app/server' },
  { dir: 'tests/integration-tests', label: 'tests/integration-tests' },
  { dir: 'tests/e2e-tests', label: 'tests/e2e-tests' }
];

/** Parse a .env into a {KEY: value} map, ignoring comments and blank lines. */
const parseEnv = (file) => {
  const map = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (match) {
      map[match[1]] = match[2];
    }
  }
  return map;
};

/**
 * Render the example file with blank values filled in from the donor,
 * preserving comments, ordering, and the example's own non-blank values.
 */
const renderInherited = (example, donorFile) => {
  const donor = parseEnv(donorFile);
  const filled = [];
  const lines = fs.readFileSync(example, 'utf8').split('\n').map((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match || match[2].trim() !== '') {
      return line;
    }
    const key = match[1];
    if (!donor[key] || donor[key].trim() === '') {
      return line;
    }
    filled.push(key);
    return `${key}=${donor[key]}`;
  });
  return { content: lines.join('\n'), filled };
};

let any = false;
for (const { dir, label, inheritFrom } of TARGETS) {
  const example = path.join(REPO_ROOT, dir, '.env.example');
  const env = path.join(REPO_ROOT, dir, '.env');
  if (!fs.existsSync(example)) {
    console.log(`⚠️  ${label}/.env.example missing — skipping`);
    continue;
  }
  if (fs.existsSync(env)) {
    console.log(`✓ ${label}/.env already exists — leaving untouched`);
    continue;
  }

  const donorFile = inheritFrom && path.join(REPO_ROOT, inheritFrom, '.env');
  if (donorFile && fs.existsSync(donorFile)) {
    const { content, filled } = renderInherited(example, donorFile);
    fs.writeFileSync(env, content);
    console.log(`✅ Created ${label}/.env from .env.example (inherited ${filled.length} keys from ${inheritFrom}/.env)`);
  } else {
    if (inheritFrom) {
      console.log(`⚠️  ${inheritFrom}/.env not found — ${label}/.env will need its shared keys filled in by hand`);
    }
    fs.copyFileSync(example, env);
    console.log(`✅ Created ${label}/.env from .env.example`);
  }
  any = true;
}

if (!any) {
  console.log('\nNothing to do — all .env files already in place.');
}
