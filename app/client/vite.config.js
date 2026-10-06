import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname_local = dirname(fileURLToPath(import.meta.url));

// Object-form manualChunks makes rollup treat each listed package as an
// entry module it must resolve up-front; a single missing vendor (e.g.
// pdf-lib not installed in a downstream consumer that reuses this config)
// aborts the whole build. Filter the chunk list to only packages this
// install can actually resolve, so the object form stays safe.
//
// Existence is checked via node_modules/<pkg>/package.json rather than
// require.resolve — the latter fails for ESM-only packages with no
// `main` field (e.g. monaco-editor) and would wrongly drop them.
const isInstalled = (pkg) =>
  existsSync(resolve(__dirname_local, 'node_modules', pkg, 'package.json'));

const filterInstalled = (candidates) =>
  Object.fromEntries(
    Object.entries(candidates)
      .map(([chunk, mods]) => [chunk, mods.filter(isInstalled)])
      .filter(([, mods]) => mods.length > 0)
  );

// App-side Vite config. Resolves @startup/* and @app/* aliases so that
// client code can `import ... from '@startup/...'` regardless of physical
// folder depth.

const STARTUP_CLIENT_SRC = resolve(__dirname, '../../startup/client/src');
const APP_CLIENT_SRC = resolve(__dirname, './src');
// Customer-specific code (custom/) sits outside both, and imports from them.
const CUSTOM_ROOT = resolve(__dirname, '../../custom');

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  const rootPackageJson = JSON.parse(
    readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
  );
  const clientPackageJson = JSON.parse(
    readFileSync(resolve(__dirname, './package.json'), 'utf-8')
  );
  const serverPackageJson = JSON.parse(
    readFileSync(resolve(__dirname, '../server/package.json'), 'utf-8')
  );
  const startupPackageJson = JSON.parse(
    readFileSync(resolve(__dirname, '../../startup/package.json'), 'utf-8')
  );

  const startupVersion = startupPackageJson.version || '0.0.0';
  const clientVersion = clientPackageJson.version || '0.0.0';
  const serverVersion = serverPackageJson.version || '0.0.0';
  const appVersion = rootPackageJson.version || '0.0.0';
  const clientName = clientPackageJson.name;

  // Product manual (Docusaurus) — its own dev server (default port 3000, built
  // with baseUrl /docs/ so it already serves under /docs). In prod it ships
  // inside this client bundle and nginx serves it at /docs/ (see
  // deploy/base.conf); in dev we proxy the subpath to its dev server
  // (`cd startup/docs && npm run start`). Override the target via env if it
  // runs elsewhere.
  const docsUrl = process.env.VITE_DOCS_URL || 'http://localhost:3000';

  // Framework client lives outside this package root (../../startup/client/src).
  // The framework code refers to itself via @/, @services, @utils, @context,
  // @data (and @base_components/@report/@theme); app code refers to itself via
  // @app/*. So those convenience aliases resolve to the FRAMEWORK, @app to the
  // APP, and @startup to the framework root. (App code was migrated off @/ onto
  // @app to free @/ for the framework — mirrors the etime layout.)
  const STARTUP_CLIENT_SRC = resolve(__dirname, '../../startup/client/src');
  const APP_CLIENT_SRC = resolve(__dirname, './src');
  // Force one physical copy. App and startup each have node_modules/react-toastify
  // (possibly different patch versions). ToastContainer lives in startup App.jsx;
  // toast() is called from app code — two copies ⇒ toasts fire into a store with
  // no mounted container (works in some Vite-dev optimizations, fails in prod builds).
  const REACT_TOASTIFY = resolve(__dirname, '../../startup/client/node_modules/react-toastify');

  return defineConfig({
    base: process.env.VITE_APP_BASENAME || '/',
    define: {
      'import.meta.env.VITE_APP_VERSION_STARTUP': JSON.stringify(startupVersion),
      'import.meta.env.VITE_APP_VERSION_APP': JSON.stringify(appVersion),
      'import.meta.env.VITE_APP_VERSION_CLIENT': JSON.stringify(clientVersion),
      'import.meta.env.VITE_APP_VERSION_SERVER': JSON.stringify(serverVersion),
      'import.meta.env.VITE_APP_NAME_CLIENT': JSON.stringify(clientName),
    },
    resolve: {
      alias: {
        '@startup': STARTUP_CLIENT_SRC,
        '@app': APP_CLIENT_SRC,
        '@custom': CUSTOM_ROOT,
        '@services': resolve(STARTUP_CLIENT_SRC, 'services'),
        '@context': resolve(STARTUP_CLIENT_SRC, 'context'),
        '@utils': resolve(STARTUP_CLIENT_SRC, 'utils'),
        '@data': resolve(STARTUP_CLIENT_SRC, 'data'),
        '@': STARTUP_CLIENT_SRC
      },
      dedupe: [
        'react',
        'react-dom',
        'react-router',
        'react-router-dom',
        '@mui/material',
        '@emotion/react',
        '@emotion/styled',
        // Both app/client and startup/client install their own copy. Without
        // dedupe, <HelmetProvider> (imported from app/client/main.jsx) and
        // <Helmet> (imported from startup/client/seo/PageMeta.jsx) end up
        // using two different React Context instances, so Helmet reads the
        // default (unprovided) context and crashes with `r.add` on undefined.
        'react-helmet-async',
        // custom/ lives outside app/client, so a bare import from there cannot resolve
        // upwards to app/client/node_modules and the production build fails on it. dedupe
        // forces resolution from the project root, which is where the only copy is.
        'lucide-react'
      ],
      preserveSymlinks: false
    },
    server: {
      proxy: {
        '/uploads': {
          target: localServerUrl, // Backend server
          changeOrigin: true, // Ensure that the host header is updated to the target URL
          // rewrite: (path) => path.replace(/^\/uploads/, ''), // Optional, remove '/uploads' prefix if needed
        },
        '/api': {
          target: localServerUrl, // Backend server
          changeOrigin: true, // Ensure that the host header is updated to the target URL
          // rewrite: (path) => path.replace(/^\/api/, ''), // Optional, remove '/api' prefix if needed
        },
        // socket.io upgrades to websocket on /socket.io — ws:true is
        // required or the upgrade handshake hits the dev server's HTML 404.
        '/socket.io': {
          target: localServerUrl,
          ws: true,
          changeOrigin: true,
        },
        // Product manual (Docusaurus) → its own dev server. ws:true passes its
        // HMR socket through so the manual hot-reloads when viewed via this host.
        '/docs': {
          target: docsUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    plugins: [
      react(),
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace(
            /<title>.*?<\/title>/,
            `<title>${clientName}</title>`
          );
        },
      },
    ],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: filterInstalled({
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'mui-vendor': [
              '@mui/material',
              '@mui/icons-material',
              '@mui/x-date-pickers',
              '@emotion/react',
              '@emotion/styled',
            ],
            'monaco-vendor': ['monaco-editor'],
            'pdf-vendor': ['jspdf', 'jspdf-autotable', 'html2canvas', 'pdf-lib', 'react-pdf'],
            'spreadsheet-vendor': ['exceljs', 'xlsx', 'papaparse'],
            'doc-vendor': ['docx', 'mammoth'],
            'chart-vendor': ['chart.js', 'react-chartjs-2'],
            'map-vendor': ['react-leaflet'],
          }),
        },
      },
    },
  });
};
