#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

/**
 * Script to create a new app from this starter template
 * Usage: node scripts/create-app.js <new-app-git-url>
 */

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      stdio: 'inherit', 
      cwd: process.cwd(),
      ...options 
    });
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

function createApp() {
  const newAppUrl = process.argv[2];
  
  if (!newAppUrl) {
    console.error('❌ Please provide the new app git URL as an argument');
    console.error('Usage: node scripts/create-app.js <new-app-git-url>');
    console.error('Example: node scripts/create-app.js https://github.com/username/my-new-app.git');
    process.exit(1);
  }

  console.log('🚀 Creating new app from starter template...');
  console.log(`📝 New app URL: ${newAppUrl}`);
  console.log('');

  try {
    // Check if we're in a git repository
    try {
      runCommand('git status', { stdio: 'pipe' });
    } catch (error) {
      console.error('❌ This directory is not a git repository');
      console.error('Please run this script from a git repository');
      process.exit(1);
    }

    // Check current remote
    const currentOrigin = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    console.log(`📍 Current origin: ${currentOrigin}`);

    // Rename current origin to starter
    console.log('🔄 Renaming current origin to starter...');
    runCommand('git remote rename origin starter');
    console.log('✅ Origin renamed to starter');

    // Add new app as origin
    console.log('➕ Adding new app as origin...');
    runCommand(`git remote add origin ${newAppUrl}`);
    console.log('✅ New origin added');

    // Push to new repository
    console.log('📤 Pushing to new repository...');
    runCommand('git push -u origin main');
    console.log('✅ Code pushed to new repository');

    console.log('');
    console.log('🎉 New app created successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Update package.json name and description');
    console.log('2. Update README.md with your app details');
    console.log('3. Customize the code for your specific needs');
    console.log('4. Commit and push your changes');
    console.log('');
    console.log('💡 To get updates from the starter template later:');
    console.log('   npm run update-starter-app');

  } catch (error) {
    console.error('❌ Failed to create new app:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createApp();
}

module.exports = { createApp };
