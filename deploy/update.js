#!/usr/bin/env node
'use strict';

/**
 * update.js — Update an installed site bundle from a new bundle zip.
 *
 * ONE implementation for every target OS. The update logic — validation, the
 * Node/V8 ABI guard, the git diff-and-apply, dependency installs, the client
 * redeploy — is identical everywhere and is written exactly once below. Only
 * the handful of operations that genuinely have no common form (how a service
 * is stopped, where the web root lives, how a zip is expanded, how a web
 * server is reloaded) are behind the `os` adapter at the top. Nothing in this
 * file is implemented twice.
 *
 * Lives in the install directory (copied there on prior install/update). Takes
 * a bundle .zip (or an already-extracted bundle directory) and uses git to
 * atomically diff-and-apply the change:
 *
 *   1. The bundle (NEW) is turned into a one-commit git repo.
 *   2. The install dir (INSTALL) is a git working tree (initialized on first run).
 *   3. `git fetch NEW; git reset --hard FETCH_HEAD` overlays NEW's tree onto
 *      INSTALL — tracked files updated, added, and deleted to match NEW;
 *      untracked files (anything matching any .gitignore — .env, secret/,
 *      uploads/, logs/, node_modules/, generated service/web config, etc.)
 *      are preserved automatically by git.
 *
 * Adding a new local-state file? Just gitignore it. This script has zero
 * hardcoded preserve lists.
 *
 * The script re-execs from the NEW bundle's update.js before doing the swap,
 * so bug fixes to the updater itself take effect on the *same* run.
 *
 * Usage (from the install dir):
 *   node update.js /path/to/<app>-site-vX.Y.Z-sha.zip
 *   node update.js /path/to/already-extracted-bundle-dir
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { execFileSync, spawnSync } = require('child_process');

// ─── Output ─────────────────────────────────────────────────────────────────

const CYAN = '\x1b[0;36m';
const RED = '\x1b[0;31m';
const YELLOW = '\x1b[0;33m';
const OFF = '\x1b[0m';

function log(msg) {
  console.log(`${CYAN}[${new Date().toTimeString().slice(0, 8)}]${OFF} ${msg}`);
}
function warn(msg) {
  console.log(`${YELLOW}[WARN]${OFF} ${msg}`);
}
function die(msg) {
  console.error(`${RED}[ERROR]${OFF} ${msg}`);
  process.exit(1);
}

// ─── Process helpers ────────────────────────────────────────────────────────

/** Run a command, inheriting stdio. Throws on non-zero exit. */
function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: 'inherit', ...opts });
}

/** Run a command, capturing stdout. Returns '' instead of throwing. */
function capture(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return r.status === 0 && r.stdout ? r.stdout.trim() : '';
}

/** True when the command exists and exits 0. */
function ok(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'ignore', ...opts });
  return r.status === 0;
}

function has(cmd) {
  // `where` on Windows, `command -v` via sh elsewhere — the only sane lookup
  // each platform offers, and the result feeds the same code path.
  return process.platform === 'win32'
    ? ok('where', [cmd])
    : ok('sh', ['-c', `command -v ${cmd}`]);
}

/**
 * git with a per-invocation identity so we never touch the operator's global
 * git config (which the system git may not even have set).
 */
function git(cwd, args, opts = {}) {
  return run('git', ['-c', 'user.email=update.js@site', '-c', 'user.name=update.js', '-C', cwd, ...args], opts);
}
function gitOut(cwd, args) {
  return capture('git', ['-c', 'user.email=update.js@site', '-c', 'user.name=update.js', '-C', cwd, ...args]);
}
function gitOk(cwd, args) {
  return ok('git', ['-c', 'user.email=update.js@site', '-c', 'user.name=update.js', '-C', cwd, ...args]);
}

// ─── OS adapter ─────────────────────────────────────────────────────────────
// The ONLY platform-divergent operations. Everything else in this file runs
// unchanged on every target. Keep this surface small — if a new branch is
// tempting, it probably belongs in shared code with a value from here.

const ADAPTERS = {
  linux: {
    label: 'linux',
    // nginx serves the built client from here; the deploy scripts point at it.
    serveDir: appName => `/app/${appName}`,
    serviceName: appName => `${appName}.service`,
    // sudo is how an operator account reaches systemd/nginx/the web root.
    elevate: (cmd, args) => (process.getuid && process.getuid() === 0 ? [cmd, args] : ['sudo', [cmd, ...args]]),
    isServiceRunning: svc => ok('systemctl', ['is-active', '--quiet', svc]),
    serviceExists: svc => capture('systemctl', ['list-unit-files', svc]).includes(svc),
    stopService(svc) { run(...this.elevate('systemctl', ['stop', svc])); },
    startService(svc) { run(...this.elevate('systemctl', ['start', svc])); },
    webServerInstalled: () => has('nginx'),
    testWebConfig() { return ok(...this.elevate('nginx', ['-t'])); },
    reloadWebServer() { run(...this.elevate('systemctl', ['reload', 'nginx'])); },
    extractZip: (zip, dest) => run('unzip', ['-q', zip, '-d', dest]),
    extractTool: 'unzip',
    serviceLogHint: svc => `journalctl -u ${svc} -n 50`
  },

  win32: {
    label: 'windows',
    // Mirrors the linux web root one level under the drive so paths stay
    // predictable; the Windows deploy config points nginx/IIS at the same dir.
    serveDir: appName => path.join(process.env.SystemDrive || 'C:', 'app', appName),
    // Windows service names carry no .service suffix.
    serviceName: appName => appName,
    // No sudo: the operator runs an elevated shell. Commands go through as-is
    // and Windows itself refuses them if the shell is not elevated.
    elevate: (cmd, args) => [cmd, args],
    isServiceRunning: svc => capture('sc', ['query', svc]).includes('RUNNING'),
    serviceExists: svc => ok('sc', ['query', svc]),
    stopService(svc) { run('net', ['stop', svc]); },
    startService(svc) { run('net', ['start', svc]); },
    webServerInstalled: () => has('nginx'),
    testWebConfig: () => ok('nginx', ['-t']),
    // nginx on Windows has no service-manager reload; it signals its own
    // running instance the same way on every platform.
    reloadWebServer: () => run('nginx', ['-s', 'reload']),
    // bsdtar ships with Windows 10+ and reads zips; no PowerShell rewrite.
    extractZip: (zip, dest) => run('tar', ['-xf', zip, '-C', dest]),
    extractTool: 'tar',
    serviceLogHint: svc => `Get-EventLog -LogName Application -Source ${svc} -Newest 50`
  }
};

const osa = ADAPTERS[process.platform] || ADAPTERS.linux;

// ─── VERSION parsing ────────────────────────────────────────────────────────
// VERSION is free-form `key=value`; commit_msg in particular can contain
// anything, so it is parsed, never sourced as a script.

function readVersion(file) {
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const at = line.indexOf('=');
    if (at > 0) { out[line.slice(0, at).trim()] = line.slice(at + 1).trim(); }
  }
  return out;
}

// ─── Resolve arguments ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const bundleArg = args[0];
if (!bundleArg) {
  console.error('Usage: node update.js <bundle.zip-or-extracted-dir>');
  console.error('  Examples:');
  console.error('    node update.js ~/Downloads/<app>-site-v1.2.3-abc1234.zip');
  console.error('    node update.js /tmp/site-update-extracted');
  process.exit(1);
}

// INSTALL defaults to this script's own directory (the install itself). On
// re-exec from the temp copy it is passed explicitly as arg 2.
const INSTALL = path.resolve(args[1] || __dirname);
if (!fs.existsSync(INSTALL)) { die(`Install dir not found: ${INSTALL}`); }

// Absolute path to what the operator passed, so we can offer to delete it at
// the end. Resolved once and inherited by the re-exec through the environment.
if (!process.env.ORIG_BUNDLE) { process.env.ORIG_BUNDLE = path.resolve(bundleArg); }
const ORIG_BUNDLE = process.env.ORIG_BUNDLE;

// ─── Resolve bundle: zip → extract to temp; dir → use as-is ─────────────────

let NEW;
let extractedToTemp = false;
if (fs.existsSync(bundleArg) && fs.statSync(bundleArg).isFile() && bundleArg.toLowerCase().endsWith('.zip')) {
  if (!has(osa.extractTool)) { die(`${osa.extractTool} not in PATH — install it first.`); }
  NEW = fs.mkdtempSync(path.join(os.tmpdir(), 'site-update-'));
  extractedToTemp = true;
  log(`Extracting ${path.basename(bundleArg)} → ${NEW}...`);
  osa.extractZip(path.resolve(bundleArg), NEW);
} else if (fs.existsSync(bundleArg) && fs.statSync(bundleArg).isDirectory()) {
  NEW = path.resolve(bundleArg);
} else {
  die(`Bundle not found (expected a .zip or extracted directory): ${bundleArg}`);
}

// ─── Validate ───────────────────────────────────────────────────────────────
// Layout mirrors the dev repo: app/client + app/server (boot wrapper) +
// startup/server (compiled framework).

if (path.resolve(NEW) === INSTALL) { die(`Bundle dir and install dir are the same: ${NEW}`); }

const needFile = (root, rel, why) => {
  if (!fs.existsSync(path.join(root, rel))) { die(why); }
};
needFile(NEW, 'VERSION', 'New bundle missing VERSION.');
needFile(NEW, path.join('app', 'client'), 'New bundle missing app/client/.');
needFile(NEW, path.join('app', 'server'), 'New bundle missing app/server/.');
needFile(NEW, path.join('startup', 'server'), 'New bundle missing startup/server/.');
needFile(NEW, 'deploy', 'New bundle missing deploy/.');
needFile(NEW, 'update.js', 'New bundle missing update.js.');
needFile(NEW, '.gitignore', 'New bundle missing root .gitignore — CI must ship it (see builds.yml).');
needFile(INSTALL, 'VERSION', 'Install dir missing VERSION — not a valid install.');
needFile(INSTALL, path.join('app', 'server'), 'Install dir has no app/server/.');
needFile(INSTALL, path.join('startup', 'server'), 'Install dir has no startup/server/.');
if (!has('git')) { die('git not in PATH — install it first.'); }

// ─── Self-update: re-exec from the NEW update.js ────────────────────────────
// Copy the new updater to a temp dir and exec it, so fixes to the updater
// itself are in effect for the rest of THIS run. The new script receives:
//   arg 1 = already-resolved bundle dir (not re-extracted)
//   arg 2 = install dir
//   env   = SELF_UPDATED=1 (signals "skip the re-exec, do the swap")

if (process.env.SELF_UPDATED !== '1') {
  const tmpUpdate = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'site-updater-')), 'update.js');
  fs.copyFileSync(path.join(NEW, 'update.js'), tmpUpdate);
  log(`Handing off to bundled update.js (${tmpUpdate})...`);
  const r = spawnSync(process.execPath, [tmpUpdate, NEW, INSTALL], {
    stdio: 'inherit',
    env: { ...process.env, SELF_UPDATED: '1' }
  });
  process.exit(r.status === null ? 1 : r.status);
}

// ─── Everything below here runs only in the re-exec'd (new) updater ─────────

const installVersion = readVersion(path.join(INSTALL, 'VERSION'));
const bundleVersion = readVersion(path.join(NEW, 'VERSION'));

const APP_NAME = installVersion.app_name;
if (!APP_NAME) { die('Install VERSION has no app_name.'); }
const SERVICE = osa.serviceName(APP_NAME);
// SERVE_DIR lets an install that does not use the default web root say so
// once, instead of every platform branch growing a special case.
const SERVE_DIR = process.env.SERVE_DIR || osa.serveDir(APP_NAME);

const NEW_VER = bundleVersion.startup_version;
const OLD_VER = installVersion.startup_version;
log(`Updating ${APP_NAME} on ${osa.label}: v${OLD_VER} → v${NEW_VER}`);

// ─── Platform guard ─────────────────────────────────────────────────────────
// The bundle ships V8 bytecode (.jsc) locked to the OS+arch that compiled it.
// A linux bundle on a Windows host fails mid-require with a cryptic error, so
// refuse it up front, before the running service is touched.

if (bundleVersion.node_platform && bundleVersion.node_platform !== process.platform) {
  die(`Platform mismatch - this bundle's bytecode was built for ${bundleVersion.node_platform}, this host is ${process.platform}.
  Build the bundle for ${process.platform} (see builds.yml → the "platform" input) and re-run.`);
}

// ─── Node/V8 ABI guard ──────────────────────────────────────────────────────
// Same reasoning one level finer: a mismatched Node on this host is a cryptic
// mid-require crash, not a clean error. Say exactly how to fix it.

if (bundleVersion.v8_version && bundleVersion.v8_version !== process.versions.v8) {
  die(`Node/V8 mismatch - the bundle's bytecode will not load on this host.
  host runtime: Node ${process.version} (V8 ${process.versions.v8})
  bundle built: Node ${bundleVersion.node_version || 'unknown'} (V8 ${bundleVersion.v8_version})
  Install Node ${bundleVersion.node_version || '<the bundle VERSION node_version>'} on this host, then re-run update.js.`);
}

// ─── Stop service ───────────────────────────────────────────────────────────

let wasRunning = false;
if (osa.serviceExists(SERVICE) && osa.isServiceRunning(SERVICE)) {
  log(`Stopping ${SERVICE}...`);
  osa.stopService(SERVICE);
  wasRunning = true;
} else {
  warn(`${SERVICE} is not running (or not registered) — continuing without a stop.`);
}

// ─── Turn NEW into a git source ─────────────────────────────────────────────
// `git add -A` automatically respects any .gitignore files in the bundle, so
// if the bundle accidentally contains a local-state file, it's not committed
// and therefore never propagates to install.

log('Preparing bundle as git source...');
git(NEW, ['init', '-q']);
git(NEW, ['add', '-A']);
git(NEW, ['commit', '-q', '-m', `bundle v${NEW_VER}`, '--allow-empty']);

// ─── First-time bootstrap: turn INSTALL into a git working tree ─────────────
// `git reset --hard` needs INSTALL to be a git repo so it knows what's
// currently tracked vs. local state. Seed it with NEW's .gitignore files first
// so the baseline commit doesn't slurp up .env / secret/ / node_modules / etc.

if (!fs.existsSync(path.join(INSTALL, '.git'))) {
  log('First run: bootstrapping git working tree on install dir...');
  // NEW is already a git repo here, so its own index is the authoritative
  // list of shipped .gitignore files — no filesystem walk, no prune rules.
  const shipped = gitOut(NEW, ['ls-files', '--', '.gitignore', '**/.gitignore']);
  for (const rel of shipped.split('\n').filter(Boolean)) {
    const dest = path.join(INSTALL, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(NEW, rel), dest);
  }
  git(INSTALL, ['init', '-q']);
  git(INSTALL, ['add', '-A']);
  git(INSTALL, ['commit', '-q', '-m', `baseline v${OLD_VER}`, '--allow-empty']);
}

// ─── Apply: fetch NEW's tree and reset INSTALL to it ────────────────────────
//   - tracked files in INSTALL → reset to NEW's content (modified files updated)
//   - tracked files in INSTALL but absent in NEW → DELETED (upstream removals)
//   - tracked files in NEW but absent in INSTALL → ADDED
//   - untracked files in INSTALL (matching any .gitignore) → UNTOUCHED

log('Fetching new tree from bundle...');
git(INSTALL, ['fetch', '-q', NEW, 'HEAD']);

log('Changes to apply (A=added, M=modified, D=deleted):');
if (gitOk(INSTALL, ['diff', '--quiet', 'HEAD', 'FETCH_HEAD'])) {
  console.log('  (no tracked-file changes — install already matches bundle tree)');
} else {
  const names = gitOut(INSTALL, ['diff', '--name-status', 'HEAD', 'FETCH_HEAD']);
  console.log(names.split('\n').map(l => `  ${l}`).join('\n'));
  console.log();
  console.log(`  ${gitOut(INSTALL, ['diff', '--shortstat', 'HEAD', 'FETCH_HEAD'])}`);
}

log('Resetting install to bundle tree...');
git(INSTALL, ['reset', '--hard', 'FETCH_HEAD']);

// Periodic gc so the install .git doesn't balloon over many updates. `--auto`
// runs only when git's own heuristics say it is worth it.
gitOk(INSTALL, ['gc', '--auto', '--quiet']);

// git preserves the +x bit in its tree, but a bundle zipped/unzipped on a
// system that drops permissions loses it. No-op where the filesystem has no
// executable bit, so it needs no platform branch beyond this guard.
if (process.platform !== 'win32') {
  for (const rel of ['update.js', 'update.sh']) {
    const p = path.join(INSTALL, rel);
    if (fs.existsSync(p)) { fs.chmodSync(p, 0o755); }
  }
  for (const dir of ['deploy', 'scripts']) {
    const d = path.join(INSTALL, dir);
    if (!fs.existsSync(d)) { continue; }
    for (const f of fs.readdirSync(d)) {
      if (f.endsWith('.sh')) { fs.chmodSync(path.join(d, f), 0o755); }
    }
  }
}

// ─── Install deps + redeploy client ─────────────────────────────────────────
// app/server/package.json owns the server's runtime install list — itself, the
// @startup framework, and @nucleus — in its `deps` script, the same list
// `npm run i` uses in dev. Reuse it so the shared-dep list lives in one place.

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
log('Installing server deps (app/server npm run deps: self + framework + nucleus)...');
run(npm, ['run', 'deps'], { cwd: path.join(INSTALL, 'app', 'server') });

log(`Deploying client to ${SERVE_DIR}...`);
fs.mkdirSync(SERVE_DIR, { recursive: true });
for (const entry of fs.readdirSync(SERVE_DIR)) {
  fs.rmSync(path.join(SERVE_DIR, entry), { recursive: true, force: true });
}
fs.cpSync(path.join(INSTALL, 'app', 'client'), SERVE_DIR, { recursive: true });

// ─── Restart ────────────────────────────────────────────────────────────────

if (osa.webServerInstalled()) {
  log('Reloading web server...');
  if (!osa.testWebConfig()) { die('web server config test failed — service NOT restarted.'); }
  osa.reloadWebServer();
} else {
  warn('nginx not found — skipping web server reload.');
}

if (wasRunning) {
  log(`Starting ${SERVICE}...`);
  osa.startService(SERVICE);
  if (!osa.isServiceRunning(SERVICE)) {
    die(`${SERVICE} failed to start. Check: ${osa.serviceLogHint(SERVICE)}`);
  }
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

if (extractedToTemp) { fs.rmSync(NEW, { recursive: true, force: true }); }

log(`Update complete: v${OLD_VER} → v${NEW_VER}`);
log('If the deploy templates changed, re-run the deploy file build step manually.');

// ─── Prompt to delete original bundle ───────────────────────────────────────
// Default Y — once the update succeeded, the bundle is a stale installer
// artifact. Skipped silently when non-interactive (cron, CI) or already gone.

if (ORIG_BUNDLE && fs.existsSync(ORIG_BUNDLE) && process.stdin.isTTY) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(`Delete original bundle '${ORIG_BUNDLE}'? [Y/n] `, answer => {
    if (/^y?$/i.test(answer.trim())) {
      log(`Removing ${ORIG_BUNDLE}...`);
      fs.rmSync(ORIG_BUNDLE, { recursive: true, force: true });
    } else {
      log(`Keeping ${ORIG_BUNDLE}.`);
    }
    rl.close();
  });
} else if (ORIG_BUNDLE && fs.existsSync(ORIG_BUNDLE)) {
  log(`Non-interactive shell; keeping ${ORIG_BUNDLE}.`);
}
