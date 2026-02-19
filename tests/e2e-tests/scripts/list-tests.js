#!/usr/bin/env node

/**
 * Script to list all tests from test manifest
 * Usage: node scripts/list-tests.js
 */

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../test-manifest.json');

function listTests() {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    console.log('\n📋 Test Manifest - All Test Files\n');
    console.log('='.repeat(60));
    
    let totalTests = 0;
    
    manifest.testSuites.forEach((suite, index) => {
      console.log(`\n${index + 1}. ${suite.name}`);
      console.log(`   ${suite.description}`);
      console.log(`   Files (${suite.files.length}):`);
      suite.files.forEach((file, fileIndex) => {
        const exists = fs.existsSync(path.join(__dirname, '..', file));
        const status = exists ? '✓' : '✗';
        console.log(`      ${status} ${file}`);
        totalTests++;
      });
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`\nTotal test files: ${totalTests}`);
    
    if (manifest.excluded && manifest.excluded.length > 0) {
      console.log(`\nExcluded files (${manifest.excluded.length}):`);
      manifest.excluded.forEach((pattern) => {
        console.log(`   - ${pattern}`);
      });
    }
    
    console.log('\n');
  } catch (error) {
    console.error('Error reading test manifest:', error.message);
    process.exit(1);
  }
}

function getTestFiles() {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const allFiles = [];
    
    manifest.testSuites.forEach((suite) => {
      suite.files.forEach((file) => {
        const fullPath = path.join(__dirname, '..', file);
        if (fs.existsSync(fullPath)) {
          allFiles.push(file);
        }
      });
    });
    
    return allFiles;
  } catch (error) {
    console.error('Error reading test manifest:', error.message);
    return [];
  }
}

// If run directly, list tests
if (require.main === module) {
  listTests();
}

// Export for use in other scripts
module.exports = { listTests, getTestFiles };
