#!/usr/bin/env node

/**
 * build-bytecode.js
 *
 * Compiles all .js files under a source root into V8 bytecode (.jsc) using
 * bytenode. Each .js file is replaced with a tiny loader stub that requires
 * the .jsc.
 *
 * Default source = startup/server/ (the framework). Use --src to point at a
 * different directory (e.g. app/server/) so app code can be protected the
 * same way without duplicating this script.
 *
 * Output is a self-contained, source-protected copy of the source dir that
 * can be deployed with `npm install --production` and `node index.js`.
 *
 * Usage:
 *   node scripts/build-bytecode.js                      # defaults: --src startup/server, --out-dir startup/server/dist
 *   node scripts/build-bytecode.js --src .              # build the cwd (e.g. when invoked from app/server)
 *   node scripts/build-bytecode.js --src ../../app/server --out-dir ../../app/server/dist
 *   node scripts/build-bytecode.js --out-dir ./build    # override output only
 *
 * Requirements:
 *   npm install --save-dev bytenode
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const bytenode = require('bytenode');

// ─── Configuration ──────────────────────────────────────────────────────────

const DEFAULT_SRC_ROOT = path.resolve(__dirname, '..');

// Directories to skip entirely (relative to srcRoot)
const SKIP_DIRS = [
  'node_modules',
  'dist',
  'logs',
  'docs',
  'eslint-rules',
  'scripts',       // build scripts themselves aren't needed at runtime
  'secret',        // credentials — never bundle
  'uploads',
  'trackingImage',
];

// Files to skip (relative to srcRoot)
// eslint.config.js is read by eslint as plain JS — must stay uncompiled.
// It's still copied verbatim via COPY_ASSETS below.
const SKIP_FILES = [
  'eslint.config.js',
];

// Files to copy as-is (NOT compiled) — dynamic requires or eval-based loading
// means bytenode can't handle these; they stay as plain JS.
const COPY_AS_JS = [
  // formulaBuilder generates wrapper code strings that require() formula files
  // at runtime — those formula files are user-supplied or synced from DB, so
  // they must remain as plain JS.
  'src/utils/formulaBuilder.js',
];

// Non-JS files/dirs to include in the build (relative to srcRoot).
// Everything the on-premise operator might need during install, ops, or ad-hoc
// debugging via `npm run dev` — shipped as-is alongside the bytecode core.
const COPY_ASSETS = [
  'package.json',
  'package-lock.json',
  '.env.example',
  'standard_formulas',
  'migrations',
  'interfaces',
  // scripts/ runs outside the hot path (install, ops utilities, one-shots) —
  // ship as plain JS so it works regardless of Node major version.
  'scripts',
  // eslint setup — needed for `npm run lint` on the install.
  'eslint-rules',
  'eslint.config.js',
  // keep docs available on the host for operator reference.
  'docs',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  // Default outDir = <srcRoot>/dist so callers passing only --src get a sane location.
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
  if (!fs.existsSync(src)) return;
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

function shouldSkipDir(relDir) {
  return SKIP_DIRS.some(skip => relDir === skip || relDir.startsWith(skip + '/'));
}

function shouldSkipFile(relPath) {
  return SKIP_FILES.includes(relPath);
}

function shouldCopyAsJs(relPath) {
  return COPY_AS_JS.includes(relPath);
}

/**
 * Create a loader stub that requires bytenode and then the compiled .jsc file.
 */
function createLoaderStub(jscBasename) {
  return `'use strict';
require('bytenode');
module.exports = require('./${jscBasename}');
`;
}

/**
 * Recursively find all .js files under a directory, respecting skip rules.
 */
function findJsFiles(dir, baseDir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      if (!shouldSkipDir(relPath)) {
        findJsFiles(fullPath, baseDir, result);
      }
    } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
      if (!shouldSkipFile(relPath)) {
        result.push({ fullPath, relPath });
      }
    }
  }
  return result;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { srcRoot, outDir } = parseArgs();

  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Server Bytecode Build (bytenode)       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Source:  ${srcRoot}`);
  console.log(`  Output:  ${outDir}`);
  console.log('');

  // Clean output directory
  if (fs.existsSync(outDir)) {
    console.log('Cleaning previous build...');
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  ensureDir(outDir);

  // 1. Copy non-JS assets
  console.log('Copying assets...');
  for (const asset of COPY_ASSETS) {
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

  // 2. Patch package.json: keep scripts + devDependencies as-is so on-premise
  // operators can run the same commands they're used to (`npm run dev`, lint,
  // test, ops scripts). Only runtime addition is bytenode, which the loader
  // stubs require to load .jsc files.
  const outPkgPath = path.join(outDir, 'package.json');
  if (fs.existsSync(outPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(outPkgPath, 'utf8'));
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies.bytenode = '*';
    fs.writeFileSync(outPkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('  [patch] package.json (added bytenode dep; scripts + devDeps preserved)');
  }

  // 3. Discover all JS files
  const jsFiles = findJsFiles(srcRoot, srcRoot);
  console.log(`\nFound ${jsFiles.length} JS files to process.\n`);

  let compiled = 0;
  let copied = 0;
  let errors = 0;

  for (const { fullPath, relPath } of jsFiles) {
    const destDir = path.join(outDir, path.dirname(relPath));
    ensureDir(destDir);

    if (shouldCopyAsJs(relPath)) {
      // Copy as plain JS (not compiled)
      copyFileSync(fullPath, path.join(outDir, relPath));
      copied++;
      continue;
    }

    try {
      // Compile to .jsc
      const jscName = path.basename(relPath, '.js') + '.jsc';
      const jscOutPath = path.join(destDir, jscName);

      await bytenode.compileFile({
        filename: fullPath,
        output: jscOutPath,
        compileAsModule: true,
      });

      // Write loader stub with original .js name
      const stubPath = path.join(outDir, relPath);
      fs.writeFileSync(stubPath, createLoaderStub(jscName));

      compiled++;
    } catch (err) {
      console.error(`  [ERROR] ${relPath}: ${err.message}`);
      // Fallback: copy as plain JS so the build isn't broken
      copyFileSync(fullPath, path.join(outDir, relPath));
      copied++;
      errors++;
    }
  }

  // 4. Write build metadata
  const buildInfo = {
    builtAt: new Date().toISOString(),
    nodeVersion: process.version,
    totalFiles: jsFiles.length,
    compiled,
    copiedAsJs: copied,
    errors,
  };
  fs.writeFileSync(
    path.join(outDir, 'build-info.json'),
    JSON.stringify(buildInfo, null, 2) + '\n'
  );

  console.log('');
  console.log('Build complete!');
  console.log(`  Compiled to bytecode: ${compiled}`);
  console.log(`  Copied as plain JS:   ${copied}`);
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
