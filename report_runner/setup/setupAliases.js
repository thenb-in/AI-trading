// Load .env and wire @startup / @appServer paths. Run this before any other require.

require('dotenv').config();

const path = require('path');
const moduleAlias = require('module-alias');

const REPO_ROOT = path.resolve(__dirname, '../..');
const APP_SERVER_DIR = path.join(REPO_ROOT, 'app/server');
const STARTUP_SERVER_DIR = path.join(REPO_ROOT, 'startup/server');


moduleAlias.addAliases({
  '@startup': STARTUP_SERVER_DIR,
  '@appServer': APP_SERVER_DIR,
  '@nucleus': path.join(REPO_ROOT, 'nucleus'),
});

// App/server has the larger dep set; search it first.
moduleAlias.addPath(path.join(APP_SERVER_DIR, 'node_modules'));
moduleAlias.addPath(path.join(STARTUP_SERVER_DIR, 'node_modules'));
