// Alias + module-path bootstrap.
require('module-alias/register');
require('module-alias').addPath(require('path').join(__dirname, 'node_modules'));
