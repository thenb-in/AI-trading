#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { askNamingChoice, sanitizeAppNameForPath } = require('./ask-app-name');

/**
 * Script to create a new app from this starter template
 * Usage: node scripts/create-app.js <new-app-git-url>
 */

const ROOT_DIR = path.resolve(__dirname, '..');
const CLIENT_PACKAGE_PATH = path.join(ROOT_DIR, 'startup', 'client', 'package.json');
const SERVER_PACKAGE_PATH = path.join(ROOT_DIR, 'startup', 'server', 'package.json');
const CLIENT_ENV_EXAMPLE = path.join(ROOT_DIR, 'startup', 'client', '.env.example');
const SERVER_ENV_EXAMPLE = path.join(ROOT_DIR, 'startup', 'server', '.env.example');
const CLIENT_ENV = path.join(ROOT_DIR, 'startup', 'client', '.env');
const SERVER_ENV = path.join(ROOT_DIR, 'startup', 'server', '.env');
const CLIENT_VITE_CONFIG = path.join(ROOT_DIR, 'startup', 'client', 'vite.config.js');
const DEPLOY_BASE_CONF = path.join(ROOT_DIR, 'deploy', 'base.conf');

const PORT_MIN = 4000;
const PORT_MAX = 9999;

function randomPort() {
  return Math.floor(Math.random() * (PORT_MAX - PORT_MIN + 1)) + PORT_MIN;
}

function updateEnvFileWithPort(filePath, port, kind) {
  if (!fs.existsSync(filePath)) return;
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    if (kind === 'server') {
      content = content.replace(/^PORT=\d+$/m, `PORT=${port}`);
      content = content.replace(
        /^SERVER_URL=http:\/\/localhost:\d+\/?\s*$/m,
        `SERVER_URL=http://localhost:${port}\n`
      );
    }
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}: ${error.message}`);
    throw error;
  }
}

function updateDeployBaseConfWithPort(port) {
  try {
    let content = fs.readFileSync(DEPLOY_BASE_CONF, 'utf8');
    content = content.replace(/server localhost:\d+;/, `server localhost:${port};`);
    fs.writeFileSync(DEPLOY_BASE_CONF, content, 'utf8');
  } catch (error) {
    console.error(`❌ Failed to update deploy/base.conf: ${error.message}`);
    throw error;
  }
}

function updatePackageJsonFiles(appName, port) {
  const sanitized = sanitizeAppNameForPath(appName);
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

function updateViteConfigWithPort(filePath, port) {
  if (!fs.existsSync(filePath)) return;
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(
      /(localServerUrl\s*=\s*['"])http:\/\/localhost:\d+(['"])/,
      `$1http://localhost:${port}$2`
    );
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}: ${error.message}`);
    throw error;
  }
}

function updatePortInConfigs(port) {
  updateEnvFileWithPort(SERVER_ENV_EXAMPLE, port, 'server');
  if (fs.existsSync(SERVER_ENV)) {
    updateEnvFileWithPort(SERVER_ENV, port, 'server');
  }
  updateViteConfigWithPort(CLIENT_VITE_CONFIG, port);
  updateDeployBaseConfWithPort(port);
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
    console.log(`🔌 Server port: ${serverPort} (random)`);
    console.log('');

    // Update port in env files, deploy config, and server kill script
    console.log('📝 Updating server port in configs...');
    updatePortInConfigs(serverPort);
    console.log('✅ Port updated in server .env, client vite.config.js, deploy/base.conf');

    // Update client and server package.json (name, version 1.0.0, deploy script, kill script)
    console.log('📝 Updating package.json (client & server)...');
    updatePackageJsonFiles(appName, serverPort);
    console.log('✅ package.json updated');

    console.log('');
    console.log('🎉 New app configuration completed successfully!');
    console.log('');
    console.log('📋 Files updated:');
    console.log('  - startup/client/package.json (name, version 1.0.0)');
    console.log('  - startup/server/package.json (name, version 1.0.0, kill script port)');
    console.log('  - startup/server/.env.example (PORT, SERVER_URL)');
    console.log('  - startup/client/vite.config.js (proxy target port)');
    console.log('  - deploy/base.conf (nginx upstream port)');
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
