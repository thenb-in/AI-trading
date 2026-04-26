#!/usr/bin/env node
// Cross-platform script to run client linting

const { execSync } = require('child_process');
const path = require('path');

try {
  // Change to client directory
  process.chdir(path.join(__dirname, '..', 'startup', 'client'));
  
  // Run npm run lint
  execSync('npm run lint', { stdio: 'inherit' });
  
  console.log('✅ Client linting passed');
} catch (error) {
  console.error('❌ Client linting failed');
  process.exit(1);
}
