#!/usr/bin/env node

'use strict';

// Build-time prerender for SEO of public routes. After `vite build`
// produces a single-page-app `dist/index.html`, this script:
//
//   1. Spins up a local static server pointed at dist/.
//   2. Launches headless Chrome via puppeteer.
//   3. Visits each public route, waits for the React tree + helmet meta
//      to settle, snapshots the fully-rendered HTML.
//   4. Writes the snapshot to `dist/<route>/index.html` so that:
//        - SPA fallback keeps working (vite's index.html is at the root).
//        - Crawlers hitting /signup get static HTML with the proper
//          <title>, <meta description>, OpenGraph tags etc.
//
// Public routes come from `prerender.config.json` next to this script, OR
// a path passed via `--config`. Without a config file we default to:
//   ['/', '/signup', '/forgot-password']
//
// Graceful degradation: if puppeteer isn't installed (it's a dev-only,
// heavy optional dep), this script logs a clear warning and exits 0 so
// the build still succeeds — without prerendering, Google can still
// crawl the SPA (modern Googlebot executes JS), just slower and with
// weaker first-byte SEO.

const fs = require('fs');
const path = require('path');
const http = require('http');

const DEFAULT_ROUTES = ['/', '/signup', '/forgot-password'];
const DEFAULT_PORT = 51789;
const DEFAULT_TIMEOUT_MS = 30_000;

function parseArgs() {
  const args = { _: [] };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--dist' && process.argv[i + 1]) { args.dist = process.argv[++i]; }
    else if (a === '--config' && process.argv[i + 1]) { args.config = process.argv[++i]; }
    else if (a === '--port' && process.argv[i + 1]) { args.port = parseInt(process.argv[++i], 10); }
    else if (a === '--base-url' && process.argv[i + 1]) { args.baseUrl = process.argv[++i]; }
    else { args._.push(a); }
  }
  return args;
}

function loadConfig(distDir, explicitPath) {
  // Resolution order: explicit --config, dist/prerender.config.json,
  // <script_dir>/prerender.config.json, builtin defaults.
  const candidates = [
    explicitPath,
    path.join(distDir, 'prerender.config.json'),
    path.join(__dirname, 'prerender.config.json'),
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (err) {
        console.warn(`[prerender] config at ${p} failed to parse: ${err.message}; ignoring`);
      }
    }
  }
  return { routes: DEFAULT_ROUTES };
}

function staticServer(distDir, port) {
  // Vendored micro static-server. We deliberately avoid a `serve-static`
  // dep so the prerender script stays self-contained and can run in
  // minimal CI images with only puppeteer installed.
  const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.mjs':  'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg':  'image/svg+xml',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico':  'image/x-icon',
    '.webmanifest': 'application/manifest+json',
    '.txt':  'text/plain; charset=utf-8',
    '.xml':  'application/xml; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };
  return http.createServer((req, res) => {
    const reqPath = decodeURIComponent(req.url.split('?')[0]);
    let fp = path.join(distDir, reqPath);
    if (fp.endsWith('/')) fp = path.join(fp, 'index.html');
    if (!fp.startsWith(distDir)) { res.statusCode = 403; return res.end('forbidden'); }
    // SPA fallback: if file doesn't exist, serve index.html. Mirrors the
    // typical Nginx try_files config.
    if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
      fp = path.join(distDir, 'index.html');
    }
    fs.readFile(fp, (err, buf) => {
      if (err) { res.statusCode = 500; return res.end(err.message); }
      res.setHeader('content-type', MIME[path.extname(fp)] || 'application/octet-stream');
      res.end(buf);
    });
  }).listen(port);
}

function tryRequirePuppeteer() {
  // We try `puppeteer` first (full Chromium bundle), then fall back to
  // `puppeteer-core` (no Chromium; requires PUPPETEER_EXECUTABLE_PATH).
  // This lets ops choose: cheap-and-easy (puppeteer) or smaller artifact
  // + system Chrome (puppeteer-core).
  try { return require('puppeteer'); }
  catch { /* try core */ }
  try { return require('puppeteer-core'); }
  catch { return null; }
}

async function snapshotRoute(browser, baseUrl, route, timeoutMs) {
  const page = await browser.newPage();
  // Pretend to be Googlebot so any conditional code that gates on UA
  // (e.g. cookie banner that hides itself for bots) behaves the same as
  // production crawls. Most apps won't do this, but it's a free benefit.
  await page.setUserAgent(
    'Mozilla/5.0 (compatible; PrerenderBot/1.0; +https://example.com/bot)'
  );
  await page.setViewport({ width: 1280, height: 800 });

  const url = `${baseUrl}${route}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: timeoutMs });
  // Wait one tick for helmet to flush queued mutations into <head>.
  await page.evaluate(() => new Promise(r => setTimeout(r, 50)));

  const html = await page.content();
  await page.close();
  return html;
}

function writeRouteHtml(distDir, route, html) {
  // Map "/" → dist/index.html (overwrite), other routes →
  // dist/<route>/index.html so that <baseUrl>/<route> serves it directly
  // via the static server (no rewrite required).
  let outPath;
  if (route === '/' || route === '') {
    outPath = path.join(distDir, 'index.html');
  } else {
    const safe = route.replace(/^\/+|\/+$/g, '');
    outPath = path.join(distDir, safe, 'index.html');
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  return outPath;
}

async function main() {
  const args = parseArgs();
  const distDir = path.resolve(args.dist || './dist');
  const port = args.port || DEFAULT_PORT;
  const baseUrl = args.baseUrl || `http://127.0.0.1:${port}`;

  if (!fs.existsSync(distDir)) {
    console.error(`[prerender] dist dir not found: ${distDir}`);
    process.exit(1); // eslint-disable-line no-process-exit
  }

  const cfg = loadConfig(distDir, args.config);
  const routes = Array.isArray(cfg.routes) && cfg.routes.length ? cfg.routes : DEFAULT_ROUTES;
  const timeoutMs = cfg.timeoutMs || DEFAULT_TIMEOUT_MS;

  const puppeteer = tryRequirePuppeteer();
  if (!puppeteer) {
    console.warn(
      '\n[prerender] puppeteer not installed; skipping prerender step.\n'
      + '             Modern Googlebot still indexes the SPA, but install\n'
      + '             puppeteer for stronger SEO + faster first paint.\n'
      + '             To enable: `npm i -D puppeteer` in the client folder.\n'
    );
    process.exit(0); // eslint-disable-line no-process-exit
  }

  console.log(`[prerender] dist=${distDir} routes=${routes.join(', ')}`);
  const server = staticServer(distDir, port);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    for (const route of routes) {
      const t0 = Date.now();
      try {
        const html = await snapshotRoute(browser, baseUrl, route, timeoutMs);
        const out = writeRouteHtml(distDir, route, html);
        console.log(`  ✓ ${route.padEnd(20)} → ${path.relative(distDir, out)}  (${Date.now() - t0}ms)`);
      } catch (err) {
        console.error(`  ✗ ${route}: ${err.message}`);
        // Don't fail the whole build on one route. The SPA fallback is
        // still in place, so a bad route just doesn't get prerendered —
        // it's not WORSE than not prerendering anything.
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.close();
  }
  console.log('[prerender] done.');
}

main().catch(err => {
  console.error('[prerender] fatal:', err);
  process.exit(1); // eslint-disable-line no-process-exit
});
