// Framework-side build-bytecode config. Loaded by
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
// Adding a new framework dir? List it under `encrypt` (so its .js gets
// compiled) and, if it ships non-JS assets too, under `copy` as well.

module.exports = {
  // Files/dirs shipped as-is to the deploy bundle. Operators can read these
  // directly (no decompilation needed) — package metadata, DB migrations
  // they may need to inspect, framework interfaces, ops scripts.
  copy: [
    'package.json',
    'package-lock.json',
    'migrations',
    'interfaces',
    'scripts'
  ],

  // Top-level entries walked for .js → V8 bytecode (.jsc + thin loader
  // stub). These are the files whose source we don't ship in plaintext.
  encrypt: [
    'buildApp.js',
    'create_company_with_role_and_perms.js',
    'logger.js',
    'interfaces',
    'migrations',
    'scheduler',
    'src'
  ],

  // Escape hatch — these specific .js files inside the encrypt walks ship
  // as plain JS instead of bytecode. Bytenode can't statically resolve the
  // dynamic require()s formulaBuilder generates, so it must stay readable.
  copyAsJs: [
    'src/utils/formulaBuilder.js'
  ],

  // Subdirs pruned during every encrypt walk (relative paths under each
  // encrypt entry). Catches nested node_modules, log dumps, secrets, etc.
  // that might exist inside src/ or scheduler/ in dev environments.
  skipDirs: [
    'node_modules',
    'logs',
    'secret',
    'uploads',
    'trackingImage'
  ],

  // Specific .js files to skip during encrypt walks (exact relative paths).
  // None today; the script auto-skips its own config file via DEFAULTS.
  skipFiles: []
};
