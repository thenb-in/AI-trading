#!/usr/bin/env node
// Initializes app/client/.env and app/server/.env from their .env.example
// counterparts. Idempotent: if a .env already exists, it is left untouched.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const TARGETS = [
  { dir: 'app/client', label: 'app/client' },
  { dir: 'app/server', label: 'app/server' }
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
