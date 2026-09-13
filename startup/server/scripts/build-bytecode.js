#!/usr/bin/env node

/**
 * build-bytecode.js
 *
 * Compiles selected .js files under a source root into V8 bytecode (.jsc)
 * using bytenode. Each compiled file is replaced with a tiny loader stub
 * that requires the .jsc.
 *
 * Default source = startup/server/ (the framework). Use --src to point at a
 * different directory (e.g. app/server/) so app code can be protected the
 * same way without duplicating this script.
 *
 * Behavior is controlled by an optional `build-bytecode.config.js` next to
 * the source root. The config has five keys:
 *
 *   copy:       non-JS files/dirs copied AS-IS into the build output.
 *   encrypt:    top-level dirs/files walked for .js → compiled to bytecode
 *               (.jsc + loader stub). Special value 'all' walks srcRoot.
 *   copyAsJs:   .js paths inside encrypt walks that should ship as plain
 *               JS (escape hatch for dynamic require / eval).
 *   skipDirs:   subdirs pruned from every encrypt walk.
 *   skipFiles:  exact relative paths skipped during encrypt walks.
 *
 * If the config file is missing, DEFAULTS below are used wholesale (no
 * merging). If present, the config's values are used wholesale — defaults
 * do not leak in.
 *
 * Usage:
 *   node scripts/build-bytecode.js                           # defaults: --src startup/server
 *   node scripts/build-bytecode.js --src ../../app/server    # build the app boot wrapper
 *   node scripts/build-bytecode.js --src . --out-dir ./dist  # explicit out dir
 *
 * Requirements:
 *   npm install --save-dev bytenode
 */

const fs = require('fs');
const path = require('path');
const bytenode = require('bytenode');

// ─── Configuration ──────────────────────────────────────────────────────────

const DEFAULT_SRC_ROOT = path.resolve(__dirname, '..');
const CONFIG_FILENAME = 'build-bytecode.config.js';

// Used only when no `build-bytecode.config.js` is present next to srcRoot.
// Mirrors the original (pre-config) behavior so external consumers keep
// working without a config file.
const DEFAULTS = {
  copy: [
    'package.json',
    'package-lock.json',
    '.env.example',
    'standard_formulas',
    'migrations',
    'interfaces',
    'scripts',
    'eslint-rules',
    'eslint.config.js',
    'docs'
  ],
  encrypt: 'all',
  copyAsJs: [
    'src/utils/formulaBuilder.js'
  ],
  skipDirs: [
    'node_modules', 'dist', 'logs', 'docs',
    'eslint-rules', 'scripts', 'secret', 'uploads'
  ],
  skipFiles: [
    'eslint.config.js',
    CONFIG_FILENAME
  ]
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Loads `<srcRoot>/build-bytecode.config.js` if present.
 *
 * Present + valid → use that config wholesale; missing keys default to []
 * (or 'all' for encrypt). NO merging with DEFAULTS.
 *
 * Absent → return DEFAULTS as-is.
 *
 * Throwing require() → fatal: building with the wrong list silently is far
 * worse than failing loudly.
 */
function loadEffectiveConfig(srcRoot) {
  const configPath = path.join(srcRoot, CONFIG_FILENAME);
  if (!fs.existsSync(configPath)) {
    return { source: 'defaults', config: DEFAULTS };
  }
  // No try/catch — a broken config file should fail the build.
  const cfg = require(configPath);
  if (!cfg || typeof cfg !== 'object') {
    throw new Error(`${CONFIG_FILENAME} must export an object`);
  }
  return {
    source: 'config',
    config: {
      copy:      Array.isArray(cfg.copy)      ? cfg.copy      : [],
      encrypt:   cfg.encrypt === 'all' || Array.isArray(cfg.encrypt) ? cfg.encrypt : 'all',
      copyAsJs:  Array.isArray(cfg.copyAsJs)  ? cfg.copyAsJs  : [],
      skipDirs:  Array.isArray(cfg.skipDirs)  ? cfg.skipDirs  : [],
      skipFiles: Array.isArray(cfg.skipFiles) ? cfg.skipFiles : []
    }
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  let srcRoot = DEFAULT_SRC_ROOT;
  let outDir = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--src' && args[i + 1]) {
      srcRoot = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--out-dir' && args[i + 1]) {
      outDir = path.resolve(args[i + 1]);
      i++;
    }
  }
  if (!outDir) {
    outDir = path.join(srcRoot, 'dist');
  }
  return { srcRoot, outDir };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileSync(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function isSkippedDir(relDir, skipDirs) {
  return skipDirs.some(s => relDir === s || relDir.startsWith(s + '/'));
}

function createLoaderStub(jscBasename) {
  return `'use strict';
require('bytenode');
module.exports = require('./${jscBasename}');
`;
}

/**
 * Walks `dir` recursively, collecting .js files (excluding *.test.js).
 * Skips subdirs/files listed in `config.skipDirs` / `config.skipFiles`.
 */
function walkForJs(dir, baseDir, config, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    // Always forward-slash: config keys (copyAsJs / skipFiles / skipDirs) are
    // written POSIX-style, and path.relative yields backslashes on Windows, so
    // an un-normalised relPath silently misses every multi-segment entry —
    // shipping 'src/utils/formulaBuilder.js' as bytecode instead of plain JS.
    // Node accepts forward slashes on Windows, so downstream joins are fine.
    const relPath = path.relative(baseDir, fullPath).split(path.sep).join('/');

    if (entry.isDirectory()) {
      if (!isSkippedDir(relPath, config.skipDirs)) {
        walkForJs(fullPath, baseDir, config, result);
      }
    } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
      if (!config.skipFiles.includes(relPath)) {
        result.push({ fullPath, relPath });
      }
    }
  }
  return result;
}

/**
 * Resolves `config.encrypt` into the concrete list of {fullPath, relPath}
 * .js files to compile. Honors `skipDirs` / `skipFiles` within each walk.
 */
function discoverEncryptedFiles(srcRoot, config) {
  if (config.encrypt === 'all') {
    return walkForJs(srcRoot, srcRoot, config);
  }
  const result = [];
  for (const entry of config.encrypt) {
    const fullPath = path.join(srcRoot, entry);
    if (!fs.existsSync(fullPath)) {
      console.log(`  [skip-encrypt] ${entry} (not found)`);
      continue;
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkForJs(fullPath, srcRoot, config, result);
    } else if (entry.endsWith('.js') && !entry.endsWith('.test.js')) {
      result.push({ fullPath, relPath: entry });
    }
  }
  return result;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { srcRoot, outDir } = parseArgs();
  const { source, config } = loadEffectiveConfig(srcRoot);

  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Server Bytecode Build (bytenode)       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Source:  ${srcRoot}`);
  console.log(`  Output:  ${outDir}`);
  console.log(`  Config:  ${source === 'config' ? `${CONFIG_FILENAME} (loaded)` : 'defaults (no config file)'}`);
  console.log('');

  if (fs.existsSync(outDir)) {
    console.log('Cleaning previous build...');
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  ensureDir(outDir);

  // 1. Copy phase — non-JS scaffolding.
  console.log('Copying assets...');
  for (const asset of config.copy) {
    const src = path.join(srcRoot, asset);
    const dest = path.join(outDir, asset);
    if (!fs.existsSync(src)) {
      console.log(`  [skip] ${asset} (not found)`);
      continue;
    }
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      copyDirSync(src, dest);
    } else {
      copyFileSync(src, dest);
    }
    console.log(`  [copy] ${asset}`);
  }

  // 2. Patch package.json: keep scripts + devDependencies so on-premise
  // operators can run the same commands they're used to (npm run dev/lint/
  // test/ops scripts). Only runtime addition is bytenode, which the loader
  // stubs need to load .jsc files.
  const outPkgPath = path.join(outDir, 'package.json');
  if (fs.existsSync(outPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(outPkgPath, 'utf8'));
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies.bytenode = '*';
    fs.writeFileSync(outPkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('  [patch] package.json (added bytenode dep; scripts + devDeps preserved)');
  }

  // 3. Encrypt phase — discover and compile .js files.
  const jsFiles = discoverEncryptedFiles(srcRoot, config);
  console.log(`\nFound ${jsFiles.length} JS files in encrypt set.\n`);

  let compiled = 0;
  let copied = 0;
  let errors = 0;

  for (const { fullPath, relPath } of jsFiles) {
    const destDir = path.join(outDir, path.dirname(relPath));
    ensureDir(destDir);

    if (config.copyAsJs.includes(relPath)) {
      // Plain-JS escape hatch — dynamic require / eval / formula injection.
      copyFileSync(fullPath, path.join(outDir, relPath));
      copied++;
      continue;
    }

    try {
      const jscName = path.basename(relPath, '.js') + '.jsc';
      const jscOutPath = path.join(destDir, jscName);

      await bytenode.compileFile({
        filename: fullPath,
        output: jscOutPath,
        compileAsModule: true
      });

      // Write loader stub at the original .js path.
      const stubPath = path.join(outDir, relPath);
      fs.writeFileSync(stubPath, createLoaderStub(jscName));

      compiled++;
    } catch (err) {
      console.error(`  [ERROR] ${relPath}: ${err.message}`);
      // Fail-safe: copy as plain JS so the build still produces a runnable
      // dist. The error count is reflected in build-info.json + the summary.
      copyFileSync(fullPath, path.join(outDir, relPath));
      copied++;
      errors++;
    }
  }

  // 4. Build metadata.
  const buildInfo = {
    builtAt: new Date().toISOString(),
    nodeVersion: process.version,
    totalFiles: jsFiles.length,
    compiled,
    copiedAsJs: copied,
    errors,
    configSource: source
  };
  fs.writeFileSync(
    path.join(outDir, 'build-info.json'),
    JSON.stringify(buildInfo, null, 2) + '\n'
  );

  console.log('');
  console.log('Build complete!');
  console.log(`  Encrypted (.jsc):   ${compiled}`);
  console.log(`  Plain JS (copied):  ${copied}`);
  if (errors > 0) {
    console.log(`  Errors (fell back to plain JS): ${errors}`);
  }
  console.log(`  Output: ${outDir}`);
  console.log('');
  console.log('To deploy:');
  console.log(`  cd ${outDir}`);
  console.log('  npm install --production');
  console.log('  node index.js');
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
