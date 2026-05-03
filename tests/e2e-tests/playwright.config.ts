// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const isCI = !!process.env.CI;
// When set, Playwright skips its webServer block entirely — the runner has
// already started the frontend + backend (see tests.yml `tests_built` job,
// and tests/scripts/coverage.mjs which wraps the backend with
// NODE_V8_COVERAGE for total coverage reporting).
const externalServers = !!process.env.PW_EXTERNAL_SERVERS;

// ---- Reporters ----
const reporters: any[] = [
  ['list'], // nice local output
  ['html', { 
    open: isCI ? 'never' : 'on-failure',
    outputFolder: 'playwright-report' // HTML report with screenshots
  }],
];
if (isCI) {
  // add machine-readable outputs in CI
  reporters.push(['junit', { outputFile: 'reports/junit/results.xml' }]);
  reporters.push(['json', { outputFile: 'reports/json/results.json' }]);
}

// ---- Servers ----
// In CI, prefer production-like commands (no nodemon; vite preview).
// Locally, stick with dev servers for fast HMR.
const frontendCommand = isCI
  ? 'npm run preview -- --host 127.0.0.1 --port 5173' // e.g. "vite preview"
  : 'npm run dev -- --host 127.0.0.1';

const backendCommand = isCI
  ? 'node index.js'       // start your server without nodemon
  : 'npm run dev';        // your existing nodemon/dev script

export default defineConfig({
  // ---------- Test behavior ----------
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,                 // fail CI if a .only sneaks in
  // Give each test a sensible max runtime (helps stuck tests fail fast).
  timeout: 60_000,                  // per-test timeout
  globalTimeout: 30 * 60_000,       // whole run timeout (30 mins)
  retries: isCI ? 2 : 0,            // add flake resistance in CI
  workers: 1,
  reporter: reporters,
  outputDir: 'test-results',        // artifacts (videos/traces/screenshots)
  // Exclude setup files from test matching - only run .spec.ts files as tests
  testMatch: /.*\.spec\.ts$/,

  expect: {
    timeout: 10_000,
  },

  // ---------- Browser defaults ----------
  use: {
    baseURL: process.env.FRONTEND_URL,
    headless: true,         
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    // Playwright's native screenshot policy - automatically attached to HTML report
    // Options: 'off' | 'on' | 'only-on-failure'
    // Native screenshots are automatically included in the HTML report
    screenshot: 'on',
    // Capture videos on failure for debugging
    video: 'retain-on-failure',
    // Capture traces for detailed debugging
    trace: 'retain-on-failure',
    // Useful defaults; tweak if needed:
    viewport: { width: 1366, height: 768 },  // todo: run this over multiple screen sizes
    ignoreHTTPSErrors: true,
  },

  // ---------- Projects ----------
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Enable these later if you want cross-browser CI:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  // ---------- Web servers ----------
  // NOTE: Playwright waits for a 2xx/3xx from each "url" before starting tests.
  // Skipped entirely when PW_EXTERNAL_SERVERS=1 — the runner brings up the
  // frontend + backend itself (e.g. via the deploy scripts in built-mode CI,
  // or tests/scripts/coverage.mjs which wraps the backend with NODE_V8_COVERAGE).
  webServer: externalServers ? undefined : [
    {
      name: 'Frontend',
      command: frontendCommand,
      cwd: path.resolve(__dirname, '../../app/client'),
      url: process.env.FRONTEND_URL,
      reuseExistingServer: !isCI,        // reuse locally; start clean in CI
      timeout: 180_000,
      env: { NO_PROXY: '127.0.0.1,localhost' },
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      name: 'Backend',
      command: backendCommand,
      cwd: path.resolve(__dirname, '../../app/server'),
      url: `${process.env.BACKEND_URL}/healthz`, // must return 200
      reuseExistingServer: !isCI,
      timeout: 180_000,
      env: { NODE_ENV: isCI ? 'production' : 'development', NO_PROXY: '127.0.0.1,localhost' },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],

  // ---------- Optional: glue code ----------
  globalSetup: require.resolve('./lifecycle/globalSetup'),
  globalTeardown: require.resolve('./lifecycle/globalTeardown'),
});
