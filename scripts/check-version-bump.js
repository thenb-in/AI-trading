#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseVersion(version) {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

function compareVersions(v1, v2) {
  const parsed1 = parseVersion(v1);
  const parsed2 = parseVersion(v2);
  
  if (parsed1.major !== parsed2.major) {
    return parsed1.major - parsed2.major;
  }
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor - parsed2.minor;
  }
  return parsed1.patch - parsed2.patch;
}

function getCurrentVersion(packageJsonPath) {
  const fullPath = path.isAbsolute(packageJsonPath)
    ? packageJsonPath
    : path.join(process.cwd(), packageJsonPath);
  const packageJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  return packageJson.version;
}

function getRemoteVersion(packageJsonPath, branch = 'origin/main') {
  try {
    // Fetch the remote branch to ensure we have the latest
    execSync(`git fetch ${branch.split('/')[0]} ${branch.split('/')[1]}`, {
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    // Normalize the path for git show (relative to repo root)
    const gitPath = path.isAbsolute(packageJsonPath)
      ? path.relative(process.cwd(), packageJsonPath)
      : packageJsonPath;
    
    // Get the package.json from the remote branch
    const remotePackageJson = execSync(
      `git show ${branch}:${gitPath}`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    const packageJson = JSON.parse(remotePackageJson);
    return packageJson.version;
  } catch (error) {
    // If remote branch doesn't exist or package.json not found, return null
    return null;
  }
}

function checkSingleVersion(packageJsonPath, packageName) {
  const currentVersion = getCurrentVersion(packageJsonPath);
  const remoteBranch = process.env.GIT_REMOTE_BRANCH || 'origin/main';
  const remoteVersion = getRemoteVersion(packageJsonPath, remoteBranch);
  
  if (!remoteVersion) {
    log(`⚠️  ${packageName}: Could not determine remote version. This might be the first push.`, 'yellow');
    log(`✅ ${packageName}: Proceeding (assuming initial commit)`, 'green');
    return true;
  }
  
  log(`📦 ${packageName}: Current: ${currentVersion}, Remote: ${remoteVersion}`, 'blue');
  
  const comparison = compareVersions(currentVersion, remoteVersion);
  
  if (comparison > 0) {
    log(`✅ ${packageName}: Version has been bumped!`, 'green');
    return true;
  } else if (comparison === 0) {
    log(`❌ ${packageName}: Version has not been changed!`, 'red');
    log(`💡 Please bump the version in ${packageJsonPath} before pushing.`, 'yellow');
    log('   Example: cd client && npm version patch|minor|major', 'yellow');
    return false;
  } else {
    log(`❌ ${packageName}: Version has been decreased!`, 'red');
    log(`💡 Version should only increase. Please bump the version in ${packageJsonPath}.`, 'yellow');
    return false;
  }
}

function checkVersionBump() {
  try {
    log('🔍 Checking version bumps for client and server...', 'blue');
    log('', 'reset');
    
    // Check client version
    const clientPath = 'client/package.json';
    log('📱 Checking Client Version:', 'blue');
    const clientOk = checkSingleVersion(clientPath, 'Client');
    
    log('', 'reset');
    
    // Check server version
    const serverPath = 'server/package.json';
    log('🖥️  Checking Server Version:', 'blue');
    const serverOk = checkSingleVersion(serverPath, 'Server');
    
    log('', 'reset');
    
    if (clientOk && serverOk) {
      log('✅ All required versions have been bumped!', 'green');
      return true;
    } else {
      log('❌ Some versions have not been bumped. Push blocked.', 'red');
      return false;
    }
  } catch (error) {
    log('❌ Error checking versions:', 'red');
    log(error.message, 'red');
    // Don't block push on errors (fail open)
    log('⚠️  Proceeding with push due to error', 'yellow');
    return true;
  }
}

if (require.main === module) {
  const success = checkVersionBump();
  process.exit(success ? 0 : 1);
}

module.exports = { checkVersionBump, getCurrentVersion, checkSingleVersion };

