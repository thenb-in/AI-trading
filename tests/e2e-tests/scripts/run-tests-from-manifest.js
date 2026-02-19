#!/usr/bin/env node

/**
 * Script to run tests from manifest
 * Usage: node scripts/run-tests-from-manifest.js [suite-name]
 */

const { getTestFiles } = require('./list-tests');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function runTests(suiteName = null) {
  const manifestPath = path.join(__dirname, '../test-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  let testFiles = [];
  
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
    
    testFiles = suite.files.filter(file => 
      fs.existsSync(path.join(__dirname, '..', file))
    );
  } else {
    // Run all tests from manifest
    testFiles = getTestFiles();
  }
  
  if (testFiles.length === 0) {
    console.error('No test files found to run');
    process.exit(1);
  }
  
  console.log(`\nRunning ${testFiles.length} test file(s)...\n`);
  
  // Run playwright with the test files
  const playwrightArgs = ['test', ...testFiles];
  const playwrightProcess = spawn('npx', ['playwright', ...playwrightArgs], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
  });
  
  playwrightProcess.on('close', (code) => {
    process.exit(code || 0);
  });
}

// Get suite name from command line args
const suiteName = process.argv[2];
runTests(suiteName);
