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

function _parseVersion(version) {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

function _compareVersions(v1, v2) {
  const parsed1 = _parseVersion(v1);
  const parsed2 = _parseVersion(v2);
  
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

function logDebugInfo(packageJsonPath, currentVersion, remoteVersion, remoteBranch) {
  log('', 'reset');
  log('🔍 DEBUG INFO:', 'yellow');
  log('─'.repeat(50), 'yellow');
  
  // Parse versions for detailed comparison
  const currentParsed = _parseVersion(currentVersion);
  const remoteParsed = _parseVersion(remoteVersion);
  
  log(`Local Version (${packageJsonPath}):`, 'blue');
  log(`  Raw: ${currentVersion}`, 'reset');
  log(`  Parsed: Major=${currentParsed.major}, Minor=${currentParsed.minor}, Patch=${currentParsed.patch}`, 'reset');
  
  log('', 'reset');
  log(`Remote Version (${remoteBranch}):`, 'blue');
  log(`  Raw: ${remoteVersion}`, 'reset');
  log(`  Parsed: Major=${remoteParsed.major}, Minor=${remoteParsed.minor}, Patch=${remoteParsed.patch}`, 'reset');
  
  log('', 'reset');
  log('Comparison:', 'blue');
  log(`  Major: ${currentParsed.major} vs ${remoteParsed.major} ${currentParsed.major === remoteParsed.major ? '✓' : '✗'}`, 'reset');
  log(`  Minor: ${currentParsed.minor} vs ${remoteParsed.minor} ${currentParsed.minor === remoteParsed.minor ? '✓' : '✗'}`, 'reset');
  log(`  Patch: ${currentParsed.patch} vs ${remoteParsed.patch} ${currentParsed.patch === remoteParsed.patch ? '✓' : '✗'}`, 'reset');
  
  try {
    // Try to show actual file contents for deeper debugging
    const fullPath = path.isAbsolute(packageJsonPath)
      ? packageJsonPath
      : path.join(process.cwd(), packageJsonPath);
    
    const localContent = fs.readFileSync(fullPath, 'utf8');
    const localJson = JSON.parse(localContent);
    
    const gitPath = path.isAbsolute(packageJsonPath)
      ? path.relative(process.cwd(), packageJsonPath)
      : packageJsonPath;
    
    const remoteContent = execSync(
      `git show ${remoteBranch}:${gitPath}`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    const remoteJson = JSON.parse(remoteContent);
    
    log('', 'reset');
    log('Full Local package.json:', 'blue');
    log(JSON.stringify({ name: localJson.name, version: localJson.version }, null, 2), 'reset');
    
    log('', 'reset');
    log('Full Remote package.json:', 'blue');
    log(JSON.stringify({ name: remoteJson.name, version: remoteJson.version }, null, 2), 'reset');
    
  } catch (error) {
    log('', 'reset');
    log('⚠️  Could not retrieve full file contents for debugging', 'yellow');
    log(`   Error: ${error.message}`, 'yellow');
  }
  
  log('─'.repeat(50), 'yellow');
  log('', 'reset');
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

/**
 * Check if there are any changes in a folder compared to remote branch
 * @param {string} folderPath - Path to the folder to check
 * @param {string} branch - Remote branch to compare against
 * @returns {boolean} - True if there are changes in the folder
 */
function hasFolderChanges(folderPath, branch = 'origin/main') {
  try {
    // Normalize the folder path (ensure it ends with / for git diff)
    const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    
    // Check if there are any changes in the folder
    // Use --name-only to just get file names, and check if output is non-empty
    const diffOutput = execSync(
      `git diff --name-only ${branch} HEAD -- ${normalizedPath}`,
      { encoding: 'utf8', cwd: process.cwd(), stdio: 'pipe' }
    ).trim();
    
    return diffOutput.length > 0;
  } catch (error) {
    // If git diff fails (e.g., branch doesn't exist), assume no changes
    // This allows the script to proceed without blocking
    return false;
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
  
  const comparison = _compareVersions(currentVersion, remoteVersion);
  
  if (comparison > 0) {
    log(`✅ ${packageName}: Version has been bumped!`, 'green');
    return true;
  } else if (comparison === 0) {
    log(`❌ ${packageName}: Version has not been changed!`, 'red');
    log(`💡 Please bump the version in ${packageJsonPath} before pushing.`, 'yellow');
    log('   Example: cd client && npm version patch|minor|major', 'yellow');
    logDebugInfo(packageJsonPath, currentVersion, remoteVersion, remoteBranch);
    return false;
  } else {
    log(`❌ ${packageName}: Version has been decreased!`, 'red');
    log(`💡 Version should only increase. Please bump the version in ${packageJsonPath}.`, 'yellow');
    logDebugInfo(packageJsonPath, currentVersion, remoteVersion, remoteBranch);
    return false;
  }
}

function checkVersionBump() {
  try {
    log('🔍 Checking version bumps for changed folders...', 'blue');
    log('', 'reset');
    
    const remoteBranch = process.env.GIT_REMOTE_BRANCH || 'origin/main';
    
    // First, check if base package.json has changes and if its version is bumped
    const basePath = 'package.json';
    // check if package.json has changes as compared to remote branch
    log('📦 Checking Base Package Version (package.json has changes):', 'blue');
    const baseVersionBumped = checkSingleVersion(basePath, 'Base Package');
    log('', 'reset');
    
    // If base version is bumped, skip individual client/server checks
    if (baseVersionBumped) {
      log('✅ Base package version has been bumped. Skipping individual client/server checks.', 'green');
      return true;
    } else {
      log('📦 Base package.json: No changes detected, proceeding with client/server checks', 'blue');
      log('', 'reset');
    }

    let clientOk = true;
    let serverOk = true;
    let clientChecked = false;
    let serverChecked = false;
    
    // Check if client folder has changes
    const clientHasChanges = hasFolderChanges('client', remoteBranch);
    if (clientHasChanges) {
      const clientPath = 'client/package.json';
      log('📱 Checking Client Version (folder has changes):', 'blue');
      clientOk = checkSingleVersion(clientPath, 'Client');
      clientChecked = true;
      log('', 'reset');
    } else {
      log('📱 Client: No changes detected, skipping version check', 'blue');
      log('', 'reset');
    }
    
    // Check if server folder has changes
    const serverHasChanges = hasFolderChanges('server', remoteBranch);
    if (serverHasChanges) {
      const serverPath = 'server/package.json';
      log('🖥️  Checking Server Version (folder has changes):', 'blue');
      serverOk = checkSingleVersion(serverPath, 'Server');
      serverChecked = true;
      log('', 'reset');
    } else {
      log('🖥️  Server: No changes detected, skipping version check', 'blue');
      log('', 'reset');
    }
    
    // If no folders were checked, that's fine (no changes)
    if (!clientChecked && !serverChecked) {
      log('✅ No changes in client or server folders. No version checks needed.', 'green');
      return true;
    }
    
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

module.exports = { checkVersionBump, getCurrentVersion, checkSingleVersion, hasFolderChanges, hasFileChanges };

