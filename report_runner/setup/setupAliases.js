// Load .env and wire @startup / @appServer paths. Run this before any other require.
//
// dotenv is loaded directly rather than through the framework's config/env.js:
// this file runs before the module aliases exist, so requiring anything under
// @startup would fail here. Once the aliases are wired, @startup/src/config/env
// is the only place these values are read.
// eslint-disable-next-line custom/no-direct-dotenv
require('dotenv').config();

const path = require('path');
const moduleAlias = require('module-alias');

const REPO_ROOT = path.resolve(__dirname, '../..');
const APP_SERVER_DIR = path.join(REPO_ROOT, 'app/server');
const STARTUP_SERVER_DIR = path.join(REPO_ROOT, 'startup/server');
const BIOMETRIC_GATEWAY_DIR = path.join(REPO_ROOT, 'biometric_gateway');


moduleAlias.addAliases({
  '@startup': STARTUP_SERVER_DIR,
  '@appServer': APP_SERVER_DIR,
  '@custom': path.join(REPO_ROOT, 'custom'),
  '@nucleus': path.join(REPO_ROOT, 'nucleus'),
  '@biometric': path.join(APP_SERVER_DIR, 'src/biometric'),
  '@biometric_interface': BIOMETRIC_GATEWAY_DIR,
  '@adms': path.join(BIOMETRIC_GATEWAY_DIR, 'adms_server'),
  '@biomax': path.join(BIOMETRIC_GATEWAY_DIR, 'biomax_server')
});

// App/server has the larger dep set; search it first.
moduleAlias.addPath(path.join(APP_SERVER_DIR, 'node_modules'));
moduleAlias.addPath(path.join(STARTUP_SERVER_DIR, 'node_modules'));
