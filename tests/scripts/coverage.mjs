#!/usr/bin/env node
// Total coverage orchestrator (source-mode only).
//
// Built-mode (proxied/bytecoded) deploys do not contribute to coverage —
// only source-mode runs do. This script always manages the source servers
// itself (backend with NODE_V8_COVERAGE, plus the vite dev frontend for the
// e2e phase) and tells Playwright not to start its own (PW_EXTERNAL_SERVERS=1).
//
// Strategy: instead of trying to instrument the server from inside the test
// runner (Vitest can't observe an external Express process; Playwright is a
// black-box browser driver), we set NODE_V8_COVERAGE on the server itself.
// Node then dumps raw v8 coverage JSON to that directory whenever the process
// exits cleanly. We do this for both phases (integration + e2e) into separate
// raw dirs, copy everything into a merged dir, then run `c8 report` once over
// the merged set to produce a single HTML/LCOV/text report.
//
// Each phase:
//   1. spawn `node app/server/index.js` with NODE_V8_COVERAGE pointed at a
//      per-phase raw dir; e2e additionally spawns vite dev for the frontend.
//   2. poll /api/v1/health (and the frontend URL, in e2e) until 200.
//   3. invoke the test runner (vitest / playwright) against the live servers.
//   4. SIGTERM the server(s) and wait for exit so v8 flushes coverage.
//
// Phases are skipped automatically when there is nothing to run:
//   - integration: skipped if integration-tests/tests/ has no specs.
//   - e2e: skipped if e2e-tests/tests/ has no specs.
//
// Output:
//   tests/coverage/raw/integration/   v8 JSON from integration phase
//   tests/coverage/raw/e2e/           v8 JSON from e2e phase
//   tests/coverage/raw/merged/        union of the above
//   tests/coverage/merged/            human-readable report (HTML + LCOV + text)

import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  copyFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TESTS_DIR = resolve(__dirname, '..');
const REPO_ROOT = resolve(TESTS_DIR, '..');
const SERVER_CWD = join(REPO_ROOT, 'app', 'server');
const SERVER_ENTRY = join(SERVER_CWD, 'index.js');
const CLIENT_CWD = join(REPO_ROOT, 'app', 'client');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const FRONTEND_HOST = new URL(FRONTEND_URL).hostname;
const FRONTEND_PORT = new URL(FRONTEND_URL).port || '5173';

const COVERAGE_DIR = join(TESTS_DIR, 'coverage');
const RAW_DIR = join(COVERAGE_DIR, 'raw');
const RAW_INTEGRATION = join(RAW_DIR, 'integration');
const RAW_E2E = join(RAW_DIR, 'e2e');
const RAW_MERGED = join(RAW_DIR, 'merged');
const REPORT_DIR = join(COVERAGE_DIR, 'merged');

const SPEC_RX = /\.(spec|test)\.(ts|tsx|js|jsx|mjs|cjs)$/;

function log(msg) {
  console.log(`\n[coverage] ${msg}`);
}

function ensureCleanDir(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

function hasSpecs(dir) {
  if (!existsSync(dir)) return false;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (hasSpecs(full)) return true;
    } else if (entry.isFile() && SPEC_RX.test(entry.name)) {
      return true;
    }
  }
  return false;
}

function copyJsonFiles(srcDir, destDir) {
  if (!existsSync(srcDir)) return 0;
  let count = 0;
  for (const name of readdirSync(srcDir)) {
    if (!name.endsWith('.json')) continue;
    copyFileSync(join(srcDir, name), join(destDir, name));
    count++;
  }
  return count;
}

function healthUrl() {
  // Prefer explicit BACKEND_URL (set by e2e .env), else PORT, else 3000.
  if (process.env.BACKEND_URL) {
    return `${process.env.BACKEND_URL.replace(/\/$/, '')}/api/v1/health`;
  }
  const port = process.env.PORT || '3000';
  return `http://127.0.0.1:${port}/api/v1/health`;
}

async function waitForHealthz(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      lastErr = new Error(`status ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await sleep(500);
  }
  throw new Error(`server did not become healthy at ${url}: ${lastErr?.message}`);
}

async function startServer(coverageDir) {
  ensureCleanDir(coverageDir);
  log(`starting server (NODE_V8_COVERAGE=${coverageDir})`);
  const child = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: SERVER_CWD,
    env: { ...process.env, NODE_V8_COVERAGE: coverageDir },
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  child.on('exit', (code, signal) => {
    log(`server exited (code=${code}, signal=${signal})`);
  });

  // Fail fast if the server dies before becoming healthy.
  let crashed = false;
  child.once('exit', () => {
    crashed = true;
  });

  const url = healthUrl();
  const start = Date.now();
  while (!crashed && Date.now() - start < 60_000) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        log(`server healthy at ${url}`);
        return child;
      }
    } catch {
      // ignore until timeout
    }
    await sleep(500);
  }

  if (crashed) {
    throw new Error('server crashed before becoming healthy — check stderr above');
  }
  // Last attempt to surface a useful error
  await waitForHealthz(url, 1);
  return child;
}

async function stopServer(child, label = 'server') {
  if (!child || child.exitCode !== null) return;
  log(`stopping ${label} (SIGTERM)`);
  await new Promise((resolveExit) => {
    child.once('exit', () => resolveExit());
    child.kill('SIGTERM');
    // Hard kill if it doesn't shut down in 15s.
    setTimeout(() => {
      if (child.exitCode === null) {
        log(`${label} did not exit on SIGTERM — sending SIGKILL`);
        child.kill('SIGKILL');
      }
    }, 15_000).unref();
  });
}

async function startFrontend() {
  log(`starting frontend (vite dev on ${FRONTEND_HOST}:${FRONTEND_PORT})`);
  // `npx vite` directly so we don't rely on a wrapping npm script's flags.
  const child = spawn(
    'npx',
    ['--no-install', 'vite', '--host', FRONTEND_HOST, '--port', FRONTEND_PORT],
    {
      cwd: CLIENT_CWD,
      env: { ...process.env, NO_PROXY: '127.0.0.1,localhost' },
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: process.platform === 'win32',
    },
  );

  let crashed = false;
  child.once('exit', () => {
    crashed = true;
    log('frontend exited');
  });

  const start = Date.now();
  while (!crashed && Date.now() - start < 60_000) {
    try {
      const res = await fetch(FRONTEND_URL);
      // Vite dev returns 200 for /, but any 2xx/3xx means it's listening.
      if (res.status < 500) {
        log(`frontend up at ${FRONTEND_URL}`);
        return child;
      }
    } catch {
      // not yet
    }
    await sleep(500);
  }

  if (crashed) {
    throw new Error('frontend crashed before becoming reachable — check stderr above');
  }
  throw new Error(`frontend did not become reachable at ${FRONTEND_URL} within 60s`);
}

function runCmd(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (result.error) throw result.error;
  return result.status ?? 0;
}

async function runIntegrationPhase() {
  const integrationDir = join(TESTS_DIR, 'integration-tests', 'tests');
  if (!hasSpecs(integrationDir)) {
    log('integration phase: no specs found, skipping');
    return false;
  }
  let server;
  try {
    server = await startServer(RAW_INTEGRATION);
    log('running integration tests');
    const code = runCmd('npm', ['run', 'test:integration'], { cwd: TESTS_DIR });
    if (code !== 0) {
      log(`integration tests exited non-zero (${code}) — coverage will still be collected`);
    }
  } finally {
    await stopServer(server, 'backend');
  }
  return true;
}

async function runE2EPhase() {
  const e2eDir = join(TESTS_DIR, 'e2e-tests', 'tests');
  if (!hasSpecs(e2eDir)) {
    log('e2e phase: no specs found, skipping');
    return false;
  }
  let backend;
  let frontend;
  try {
    backend = await startServer(RAW_E2E);
    frontend = await startFrontend();
    log('running e2e tests against orchestrator-managed servers');
    // PW_EXTERNAL_SERVERS=1 tells playwright.config.ts to skip its webServer
    // block — we manage both backend (with NODE_V8_COVERAGE) and frontend
    // ourselves so server-side coverage is captured.
    const code = runCmd('npm', ['run', 'test:e2e:ci'], {
      cwd: TESTS_DIR,
      env: { ...process.env, PW_EXTERNAL_SERVERS: '1', FRONTEND_URL },
    });
    if (code !== 0) {
      log(`e2e tests exited non-zero (${code}) — coverage will still be collected`);
    }
  } finally {
    // Stop frontend first (no coverage to flush), then backend (coverage flush).
    await stopServer(frontend, 'frontend');
    await stopServer(backend, 'backend');
  }
  return true;
}

function mergeRaw() {
  ensureCleanDir(RAW_MERGED);
  let total = 0;
  total += copyJsonFiles(RAW_INTEGRATION, RAW_MERGED);
  total += copyJsonFiles(RAW_E2E, RAW_MERGED);
  log(`merged ${total} v8 coverage files into ${RAW_MERGED}`);
  return total;
}

function generateReport() {
  ensureCleanDir(REPORT_DIR);
  log('running c8 report');
  // c8 is installed in tests/node_modules; resolve its absolute binary path
  // so we can run it from REPO_ROOT (where include globs are anchored)
  // without relying on npx's lookup rules.
  const c8Bin = join(TESTS_DIR, 'node_modules', '.bin', 'c8');
  const code = runCmd(
    c8Bin,
    [
      'report',
      `--temp-directory=${RAW_MERGED}`,
      `--reports-dir=${REPORT_DIR}`,
      '--reporter=html',
      '--reporter=text',
      '--reporter=text-summary',
      '--reporter=lcov',
      '--reporter=json-summary',
      '--include=startup/server/src/**',
      '--include=app/server/**',
      '--exclude=**/node_modules/**',
      '--exclude=**/migrations/**',
      '--exclude=**/seeders/**',
      '--exclude=**/scheduler/**',
      '--exclude=**/scripts/**',
      '--exclude=**/test-results/**',
      '--exclude=**/*.config.js',
      '--all',
    ],
    { cwd: REPO_ROOT },
  );
  return code;
}

async function main() {
  ensureCleanDir(COVERAGE_DIR);

  const ranIntegration = await runIntegrationPhase();
  const ranE2E = await runE2EPhase();

  if (!ranIntegration && !ranE2E) {
    log('no test phases ran — nothing to report');
    process.exit(0);
  }

  const total = mergeRaw();
  if (total === 0) {
    log('no raw v8 coverage was produced (server may not have shut down cleanly)');
    process.exit(1);
  }

  const code = generateReport();
  if (code !== 0) {
    log(`c8 report exited with ${code}`);
    process.exit(code);
  }

  log(`done. open ${join(REPORT_DIR, 'index.html')}`);
}

main().catch((err) => {
  console.error('[coverage] fatal:', err);
  process.exit(1);
});
