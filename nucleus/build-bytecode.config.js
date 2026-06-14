// @nucleus foundational layer (logger + generic constants) build-bytecode
// config. Built as its own --src and staged at nucleus/ so gateway runnables
// (and the app, via the @nucleus alias / startup re-export shims) resolve the
// compiled logger/constants in the deployed bundle.
module.exports = {
  copy: [
    'package.json',
    'package-lock.json'
  ],
  encrypt: 'all',
  copyAsJs: [],
  skipDirs: ['node_modules', 'logs', 'dist'],
  skipFiles: []
};
