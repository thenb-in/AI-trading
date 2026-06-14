#!/usr/bin/env node
// Installs dependencies for shared infra packages that the app depends on at
// runtime but that the top-level `npm run i` chain does not otherwise cover.
//
// `nucleus` is required by app/server via the @nucleus module-alias and pulls
// in winston; without its node_modules the dev server fails to boot with
// "Cannot find module 'winston'". This script is idempotent: a package whose
// node_modules already exists is left untouched.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

// Shared infra packages with their own package.json that the dev/app runtime
// depends on. Standalone services (biometric_gateway, canteen_print_agent,
// report-scheduler, ...) are intentionally excluded — they are installed and
// run independently, not as part of the app.
const PACKAGES = ['nucleus'];

for (const pkg of PACKAGES) {
  const dir = path.join(REPO_ROOT, pkg);
  const pkgJson = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgJson)) {
    console.log(`⚠️  ${pkg}/package.json missing — skipping`);
    continue;
  }
  if (fs.existsSync(path.join(dir, 'node_modules'))) {
    console.log(`✓ ${pkg} dependencies already installed — leaving untouched`);
    continue;
  }
  console.log(`📦 Installing ${pkg} dependencies...`);
  execSync('npm install', { cwd: dir, stdio: 'inherit' });
  console.log(`✅ ${pkg} dependencies installed`);
}
