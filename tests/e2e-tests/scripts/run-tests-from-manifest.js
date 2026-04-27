#!/usr/bin/env node

/**
 * Script to run tests from manifest
 * Usage: node scripts/run-tests-from-manifest.js [suite-name]
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function runTests(suiteName = null, extraArgs = []) {
  const manifestPath = path.join(__dirname, '../test-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  let declaredFiles = [];

  if (suiteName) {
    // Run specific suite
    const suite = manifest.testSuites.find(s =>
      s.name.toLowerCase().replace(/\s+/g, '-') === suiteName.toLowerCase() ||
      s.name.toLowerCase() === suiteName.toLowerCase()
    );

    if (!suite) {
      console.error(`Suite "${suiteName}" not found. Available suites:`);
      manifest.testSuites.forEach(s => console.log(`  - ${s.name}`));
      process.exit(1);
    }

    declaredFiles = suite.files;
  } else {
    // Run all tests from manifest
    manifest.testSuites.forEach((suite) => {
      declaredFiles.push(...suite.files);
    });
  }

  // Fail loudly when the manifest references files that no longer exist on
  // disk — silently skipping them masks renames/deletions.
  const missing = declaredFiles.filter(
    (file) => !fs.existsSync(path.join(__dirname, '..', file))
  );
  if (missing.length > 0) {
    console.error(
      `\nManifest references ${missing.length} file(s) missing from disk:`
    );
    missing.forEach((file) => console.error(`  - ${file}`));
    console.error(
      '\nUpdate test-manifest.json to match the current filesystem before running.\n'
    );
    process.exit(1);
  }

  const testFiles = declaredFiles;
  if (testFiles.length === 0) {
    console.error('No test files found to run');
    process.exit(1);
  }

  console.log(`\nRunning ${testFiles.length} test file(s)...\n`);

  // Run playwright with the test files (extra flags forwarded through)
  const playwrightArgs = ['test', ...testFiles, ...extraArgs];
  const playwrightProcess = spawn('npx', ['playwright', ...playwrightArgs], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
  });

  playwrightProcess.on('close', (code) => {
    process.exit(code || 0);
  });
}

// Parse argv: leading-dash tokens are forwarded to playwright; first
// positional (if any) is treated as a suite name.
const argv = process.argv.slice(2);
const extraArgs = argv.filter((a) => a.startsWith('-'));
const positional = argv.filter((a) => !a.startsWith('-'));
runTests(positional[0] || null, extraArgs);
