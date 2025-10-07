#!/usr/bin/env node

const { execSync } = require('child_process');

/**
 * Script to update the current app with latest changes from the starter template
 * Usage: node scripts/update-starter-app.js
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

function updateStarterApp() {
  console.log('🔄 Updating from starter template...');
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

    // Check if starter remote already exists
    try {
      const starterUrl = execSync('git remote get-url starter', { encoding: 'utf8', stdio: 'pipe' }).trim();
      console.log(`📍 Starter remote already exists: ${starterUrl}`);
    } catch (error) {
      // Starter remote doesn't exist, add it
      console.log('➕ Adding starter remote...');
      // Note: You'll need to update this URL to your actual starter repository
      const starterUrl = 'https://github.com/thenb-in/startup.git';
      runCommand(`git remote add starter ${starterUrl}`);
      console.log('✅ Starter remote added');
    }

    // Fetch latest changes from starter
    console.log('📥 Fetching latest changes from starter...');
    runCommand('git fetch starter');
    console.log('✅ Latest changes fetched');

    // Check if there are any conflicts before merging
    console.log('🔍 Checking for potential conflicts...');
    try {
      const mergeCheck = execSync('git merge-tree $(git merge-base HEAD starter/main) HEAD starter/main', { 
        encoding: 'utf8', 
        stdio: 'pipe' 
      });
      
      if (mergeCheck.includes('<<<<<<<')) {
        console.log('⚠️  Potential merge conflicts detected');
        console.log('Please resolve conflicts manually after the merge');
      }
    } catch (error) {
      // merge-tree might not be available, continue anyway
      console.log('ℹ️  Merge conflict check skipped');
    }

    // Merge changes from starter
    console.log('🔀 Merging changes from starter...');
    runCommand('git merge starter/main --allow-unrelated-histories');
    console.log('✅ Changes merged successfully');

    console.log('');
    console.log('🎉 Starter template updated successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Review the merged changes');
    console.log('2. Resolve any conflicts if they occurred');
    console.log('3. Test your application');
    console.log('4. Commit and push the merged changes');
    console.log('');
    console.log('💡 If you encounter merge conflicts:');
    console.log('   git status                    # Check conflicted files');
    console.log('   git add <resolved-files>      # Add resolved files');
    console.log('   git commit                    # Complete the merge');

  } catch (error) {
    console.error('❌ Failed to update from starter template:', error.message);
    console.error('');
    console.error('💡 If you encounter issues:');
    console.error('   1. Check that the starter remote URL is correct');
    console.error('   2. Ensure you have the latest changes committed');
    console.error('   3. Resolve any merge conflicts manually');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  updateStarterApp();
}

module.exports = { updateStarterApp };
