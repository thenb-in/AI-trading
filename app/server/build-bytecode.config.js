// App-side build-bytecode config. Loaded by
// startup/server/scripts/build-bytecode.js when --src points at this directory.
//
// Five keys, all explicit (no merging with the script's defaults — when this
// file exists, the values below are authoritative):
//
//   copy:       non-JS files/dirs copied AS-IS into dist
//   encrypt:    top-level dirs/files walked for .js → compiled to .jsc + stub
//   copyAsJs:   .js paths inside encrypt walks that ship as plain JS
//   skipDirs:   subdirs pruned from every encrypt walk
//   skipFiles:  exact relative paths skipped during encrypt walks
//
// app/server/ is a thin boot wrapper today: index.js + a scheduler scaffold.
// As the app grows (src/ for routes, models, etc.), add the new top-level
// dirs to `encrypt` so their .js gets compiled, and to `copy` if they ship
// non-JS assets the operator should be able to read.

module.exports = {
  // Files shipped as-is. The operator gets a readable env template and the
  // package metadata; everything else is bytecode.
  copy: [
    'package.json',
    'package-lock.json',
    '.env.example'
  ],

  // Top-level entries walked for .js → V8 bytecode (.jsc + loader stub).
  // Add 'src' (or whatever top-level dirs land) when app code grows.
  encrypt: [
    'index.js',
    'scheduler'
  ],

  // No dynamic-require escape hatches today. Add here if a future module
  // needs to load formula files / eval'd code that bytenode can't resolve.
  copyAsJs: [],

  // Pruned subdirs during encrypt walks. dev artifacts that might exist
  // inside scheduler/ during local development.
  skipDirs: [
    'node_modules',
    'logs'
  ],

  skipFiles: []
};
