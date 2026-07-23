#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  askNamingChoice,
  sanitizeAppNameForPath,
  resolveSeparator,
  getFolderName,
} = require('./ask-app-name');

/**
 * Script to create a new app from this starter template
 * Usage: node scripts/create-app.js <new-app-git-url>
 */

const ROOT_DIR = path.resolve(__dirname, '..');
const CLIENT_PACKAGE_PATH = path.join(ROOT_DIR, 'app', 'client', 'package.json');
const SERVER_PACKAGE_PATH = path.join(ROOT_DIR, 'app', 'server', 'package.json');
const CLIENT_ENV_EXAMPLE = path.join(ROOT_DIR, 'app', 'client', '.env.example');
const SERVER_ENV_EXAMPLE = path.join(ROOT_DIR, 'app', 'server', '.env.example');
const CLIENT_ENV = path.join(ROOT_DIR, 'app', 'client', '.env');
const SERVER_ENV = path.join(ROOT_DIR, 'app', 'server', '.env');
const CLIENT_VITE_CONFIG = path.join(ROOT_DIR, 'app', 'client', 'vite.config.js');
const INTEGRATION_TEST_ENV_EXAMPLE = path.join(ROOT_DIR, 'tests', 'integration-tests', '.env.example');
const INTEGRATION_TEST_ENV = path.join(ROOT_DIR, 'tests', 'integration-tests', '.env');
const E2E_TEST_ENV_EXAMPLE = path.join(ROOT_DIR, 'tests', 'e2e-tests', '.env.example');
const E2E_TEST_ENV = path.join(ROOT_DIR, 'tests', 'e2e-tests', '.env');
const DEPLOY_BASE_CONF = path.join(ROOT_DIR, 'deploy', 'base.conf');
const REPORT_RUNNER_ENV_EXAMPLE = path.join(ROOT_DIR, 'report_runner', '.env.example');
const REPORT_RUNNER_ENV = path.join(ROOT_DIR, 'report_runner', '.env');

const PORT_MIN = 4000;
const PORT_MAX = 9999;

function randomPort(exclude = []) {
  let port;
  do {
    port = Math.floor(Math.random() * (PORT_MAX - PORT_MIN + 1)) + PORT_MIN;
  } while (exclude.includes(port));
  return port;
}

/**
 * Generic search-and-replace over a config file. Skips silently when the file
 * is optional and missing (e.g. .env not yet copied from .env.example).
 * replacements: array of [pattern, replacement] pairs applied in order.
 */
function replaceInFile(filePath, replacements, { mustExist = false } = {}) {
  if (!mustExist && !fs.existsSync(filePath)) return;
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [pattern, replacement] of replacements) {
      content = content.replace(pattern, replacement);
    }
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}: ${error.message}`);
    throw error;
  }
}

// Set a numeric env var, e.g. PORT=4000 or REPORT_RUNNER_PORT=4001.
function setEnvPort(filePath, varName, port) {
  replaceInFile(filePath, [
    [new RegExp(`^${varName}=\\d+$`, 'm'), `${varName}=${port}`],
  ]);
}

// Set a localhost-URL env var, preserving optional quotes and dropping any
// trailing slash, e.g. SERVER_URL=http://localhost:4000 or API_BASE_URL='...'.
function setEnvLocalhostUrl(filePath, varName, port) {
  replaceInFile(filePath, [
    [
      new RegExp(`^(${varName}=)(['"]?)http://localhost:\\d+/?\\2`, 'm'),
      `$1$2http://localhost:${port}$2`,
    ],
  ]);
}

function updatePackageJsonFiles(appName, port) {
  const separator = resolveSeparator(getFolderName(ROOT_DIR), '-');
  const sanitized = sanitizeAppNameForPath(appName, separator);
  if (!sanitized) {
    throw new Error('App name cannot be empty or whitespace-only');
  }

  try {
    const clientPkg = JSON.parse(fs.readFileSync(CLIENT_PACKAGE_PATH, 'utf8'));
    clientPkg.name = appName;
    clientPkg.version = '1.0.0';
    if (clientPkg.scripts && clientPkg.scripts.deploy) {
      const deployPath = `/app/${sanitized}`;
      clientPkg.scripts.deploy = `rm ${deployPath}/ -r && mv dist/ ${deployPath}/`;
    }
    fs.writeFileSync(CLIENT_PACKAGE_PATH, JSON.stringify(clientPkg, null, 2) + '\n', 'utf8');
  } catch (error) {
    console.error(`❌ Failed to update client/package.json: ${error.message}`);
    throw error;
  }

  try {
    const serverPkg = JSON.parse(fs.readFileSync(SERVER_PACKAGE_PATH, 'utf8'));
    serverPkg.name = appName;
    serverPkg.version = '1.0.0';
    if (serverPkg.scripts && serverPkg.scripts.kill) {
      serverPkg.scripts.kill = serverPkg.scripts.kill.replace(/-i:\d+/, `-i:${port}`);
    }
    fs.writeFileSync(SERVER_PACKAGE_PATH, JSON.stringify(serverPkg, null, 2) + '\n', 'utf8');
  } catch (error) {
    console.error(`❌ Failed to update server/package.json: ${error.message}`);
    throw error;
  }
}

function gitRemoteUrl(name) {
  try {
    return execSync(`git remote get-url ${name}`, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (error) {
    return '';
  }
}

/**
 * Point `origin` at the newly-created app's repo while preserving the link back
 * to the startup template: the template repo is currently `origin`, so before we
 * repoint it we stash that URL as the `startup` remote (the same remote
 * update-starter-app.js pulls from). This is what lets a generated app keep
 * receiving framework updates after it has its own origin.
 */
function setupGitRemotes(newAppUrl) {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: ROOT_DIR,
      stdio: 'ignore',
    });
  } catch (error) {
    console.log('⚠️  Not a git repository — skipping remote setup');
    return;
  }

  const currentOrigin = gitRemoteUrl('origin');

  // Preserve the startup template as `startup` so update-starter-app keeps
  // working. Only seed it from the current origin and never clobber an existing
  // startup remote (it may already point at the canonical template).
  const existingStartup = gitRemoteUrl('startup');
  if (existingStartup) {
    console.log(`📍 Startup remote already configured: ${existingStartup}`);
  } else if (currentOrigin && currentOrigin !== newAppUrl) {
    execSync(`git remote add startup ${currentOrigin}`, { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log(`✅ Preserved startup template as 'startup' remote: ${currentOrigin}`);
  } else {
    console.log('ℹ️  No distinct startup origin to preserve as startup remote');
  }

  // Repoint origin at the new app's repo (add it if origin is missing).
  if (currentOrigin) {
    execSync(`git remote set-url origin ${newAppUrl}`, { cwd: ROOT_DIR, stdio: 'inherit' });
  } else {
    execSync(`git remote add origin ${newAppUrl}`, { cwd: ROOT_DIR, stdio: 'inherit' });
  }
  console.log(`✅ origin → ${newAppUrl}`);
}

function updatePortInConfigs(port, reportRunnerPort) {
  // Server env: own port + URLs (both .env.example and .env if present)
  for (const file of [SERVER_ENV_EXAMPLE, SERVER_ENV]) {
    setEnvPort(file, 'PORT', port);
    setEnvLocalhostUrl(file, 'SERVER_URL', port);
    setEnvLocalhostUrl(file, 'REPORT_RUNNER_URL', reportRunnerPort);
  }

  // Report runner env: its own listen port
  for (const file of [REPORT_RUNNER_ENV_EXAMPLE, REPORT_RUNNER_ENV]) {
    setEnvPort(file, 'REPORT_RUNNER_PORT', reportRunnerPort);
  }

  // Test envs point at the server
  for (const file of [INTEGRATION_TEST_ENV_EXAMPLE, INTEGRATION_TEST_ENV]) {
    setEnvLocalhostUrl(file, 'API_BASE_URL', port);
  }
  for (const file of [E2E_TEST_ENV_EXAMPLE, E2E_TEST_ENV]) {
    setEnvLocalhostUrl(file, 'BACKEND_URL', port);
  }

  // Client dev proxy target
  replaceInFile(CLIENT_VITE_CONFIG, [
    [/(localServerUrl\s*=\s*['"])http:\/\/localhost:\d+(['"])/, `$1http://localhost:${port}$2`],
  ]);

  // nginx upstream
  replaceInFile(DEPLOY_BASE_CONF, [
    [/server localhost:\d+;/, `server localhost:${port};`],
  ], { mustExist: true });
}

async function createApp() {
  const newAppUrl = process.argv[2];

  if (!newAppUrl) {
    console.error('❌ Please provide the new app git URL as an argument');
    console.error('Usage: node scripts/create-app.js <new-app-git-url>');
    console.error('Example: node scripts/create-app.js https://github.com/username/my-new-app.git');
    process.exit(1);
  }

  try {
    console.log('🚀 Creating new app from starter template...');
    console.log(`📝 New app URL: ${newAppUrl}`);

    const appName = await askNamingChoice(newAppUrl, ROOT_DIR);
    if (!appName) {
      console.error('❌ App name cannot be empty');
      process.exit(1);
    }
    console.log(`📦 App name: ${appName}`);

    const serverPort = randomPort();
    const reportRunnerPort = Math.ceil(serverPort / 10) * 10 + 1;
    console.log(`🔌 Server port: ${serverPort} (random)`);
    console.log(`🔌 Report runner port: ${reportRunnerPort} (server port rounded up to nearest 10, + 1)`);
    console.log('');

    // Update ports in env files, deploy config, and server kill script
    console.log('📝 Updating server & report runner ports in configs...');
    updatePortInConfigs(serverPort, reportRunnerPort);
    console.log('✅ Ports updated in server .env, client vite.config.js, test envs, deploy/base.conf, report_runner .env');

    // Update client and server package.json (name, version 1.0.0, deploy script, kill script)
    console.log('📝 Updating package.json (client & server)...');
    updatePackageJsonFiles(appName, serverPort);
    console.log('✅ package.json updated');

    // Repoint origin at the new app's repo, preserving the startup template as
    // the `startup` remote so the generated app can still pull framework updates.
    console.log('');
    console.log('📝 Configuring git remotes...');
    setupGitRemotes(newAppUrl);

    console.log('');
    console.log('🎉 New app configuration completed successfully!');
    console.log('');
    console.log('📋 Files updated:');
    console.log('  - app/client/package.json (name, version 1.0.0)');
    console.log('  - app/server/package.json (name, version 1.0.0, kill script port)');
    console.log('  - app/server/.env.example (PORT, SERVER_URL, REPORT_RUNNER_URL)');
    console.log('  - report_runner/.env.example (REPORT_RUNNER_PORT)');
    console.log('  - app/client/vite.config.js (proxy target port)');
    console.log('  - tests/integration-tests/.env.example (API_BASE_URL)');
    console.log('  - tests/e2e-tests/.env.example (BACKEND_URL)');
    console.log('  - deploy/base.conf (nginx upstream port)');
    console.log('');
    console.log('🔗 Git remotes:');
    console.log('  - origin  → new app repo (the provided URL)');
    console.log("  - startup → startup template (preserved for 'npm run update-starter-app')");
    console.log('');
    console.log('💡 Next steps:');
    console.log('  1. Review the changes in the files above');
    console.log('  2. Commit and push your changes when ready');
    console.log('  3. Update README.md with your app details');
    console.log('  4. Customize the code for your specific needs');
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
