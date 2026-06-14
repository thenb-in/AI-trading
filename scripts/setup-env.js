#!/usr/bin/env node
// Initializes .env files from their .env.example counterparts for the app
// and the test suites. Idempotent: if a .env already exists, it is left
// untouched.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const TARGETS = [
  { dir: 'app/client', label: 'app/client' },
  { dir: 'app/server', label: 'app/server' },
  { dir: 'report_runner', label: 'report_runner' },
  { dir: 'tests/integration-tests', label: 'tests/integration-tests' },
  { dir: 'tests/e2e-tests', label: 'tests/e2e-tests' }
];

let any = false;
for (const { dir, label } of TARGETS) {
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
  fs.copyFileSync(example, env);
  console.log(`✅ Created ${label}/.env from .env.example`);
  any = true;
}

if (!any) {
  console.log('\nNothing to do — all .env files already in place.');
}
