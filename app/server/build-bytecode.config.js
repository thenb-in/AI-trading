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
// Mirrors startup/server/build-bytecode.config.js's layering: any top-level
// dir that ships both .js modules and non-JS assets goes in BOTH copy and
// encrypt — copy emits the non-JS files verbatim, encrypt then overwrites
// each .js with its .jsc + loader stub.

module.exports = {
  // Files/dirs shipped as-is.
  //   - package metadata and the env template need to be readable for ops.
  //   - interfaces/ ships README.md alongside its .js (the .js is bytecoded
  //     via the encrypt walk below).
  //   - standard_formulas/ is loaded by the formula sandbox via
  //     fs.readFileSync(), so it MUST stay as plain .js source.
  copy: [
    'package.json',
    'package-lock.json',
    '.env.example',
    'interfaces',
    'standard_formulas'
  ],

  // Top-level entries walked for .js → V8 bytecode (.jsc + thin loader
  // stub). src/, scheduler/, and interfaces/ contain the runtime modules;
  // index.js is the boot entry the systemd unit invokes.
  encrypt: [
    'index.js',
    'scheduler',
    'src',
    'interfaces'
  ],

  // Escape hatch — these specific .js files inside the encrypt walks ship
  // as plain JS instead of bytecode. formulaBuilder builds a wrapper string
  // with dynamic require()s the bytecode loader can't resolve, so it must
  // stay readable for the sandbox VM to execute it.
  copyAsJs: [
    'src/utils/formulaBuilder.js'
  ],

  // Subdirs pruned during every encrypt walk (relative paths under each
  // encrypt entry). Catches nested node_modules and dev-only dumps.
  skipDirs: [
    'node_modules',
    'logs',
    'secret',
    'uploads',
    'trackingImage'
  ],

  skipFiles: []
};
