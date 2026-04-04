#!/usr/bin/env node

/**
 * Pre-commit: directory path segments in staged changes must be lowercase
 * (no ASCII A–Z in folder names). File basenames are not checked.
 *
 * Set CHECK_ALL_DIRS=1 to scan the whole working tree (skips node_modules, etc.).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  process.stdout.write(`${colors[color]}${message}${colors.reset}\n`);
}

const SKIP_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  'out',
  'storybook-static',
  '.turbo',
  '.cache',
  'venv',
  '.venv',
  '__pycache__'
]);

const UPPERCASE_IN_NAME = /[A-Z]/;

function walkDir(absDir, relDir, violations) {
  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const ent of entries) {
    if (!ent.isDirectory()) {
      continue;
    }
    const name = ent.name;
    if (SKIP_DIR_NAMES.has(name)) {
      continue;
    }

    const nextAbs = path.join(absDir, name);
    const nextRel = relDir ? path.join(relDir, name) : name;

    if (UPPERCASE_IN_NAME.test(name)) {
      violations.push(nextRel.split(path.sep).join('/'));
    }

    walkDir(nextAbs, nextRel, violations);
  }
}

function checkFullTree() {
  const violations = [];
  walkDir(process.cwd(), '', violations);
  return violations;
}

function getStagedPaths() {
  try {
    const out = execSync('git -c core.quotepath=false diff --cached --name-only --diff-filter=ACMRT', {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024
    });
    return out
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((p) => p.replace(/\\/g, '/'));
  } catch {
    return [];
  }
}

function violationsFromStagedPaths(stagedPaths) {
  const bad = new Set();
  for (const filePath of stagedPaths) {
    const parts = filePath.split('/');
    for (let i = 0; i < parts.length - 1; i += 1) {
      const segment = parts[i];
      if (!segment || segment === '.' || segment === '..') {
        continue;
      }
      if (UPPERCASE_IN_NAME.test(segment)) {
        bad.add(parts.slice(0, i + 1).join('/'));
      }
    }
  }
  return [...bad];
}

const fullTree = process.env.CHECK_ALL_DIRS === '1';
const violations = fullTree ? checkFullTree() : violationsFromStagedPaths(getStagedPaths());

if (violations.length > 0) {
  log(
    fullTree
      ? 'Directory names must be lowercase (no ASCII A–Z in folder names):'
      : 'Staged paths include folders with uppercase letters (use lowercase directory names only):',
    'red'
  );
  for (const v of violations.sort()) {
    log(`  ${v}`, 'red');
  }
  process.exit(1);
}

log(fullTree ? 'All directory names are lowercase.' : 'Staged paths use lowercase folder names.', 'green');
process.exit(0);
