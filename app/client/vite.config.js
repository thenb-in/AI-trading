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
  const localServerUrl = 'http://localhost:3000';
  // Standalone biometric gateway servers (one process per interface, own port).
  // Device protocol paths proxy to these; operator/admin /api + /uploads stay on
  // the app. ZK TCP-pull has no inbound HTTP, so no proxy entry. Override via env
  // if a gateway runs on a different host/port.
  const admsGatewayUrl = process.env.VITE_ADMS_GATEWAY_URL || 'http://localhost:4002';
  const biomaxGatewayUrl = process.env.VITE_BIOMAX_GATEWAY_URL || 'http://localhost:4003';

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
        'react-helmet-async'
      ],
      preserveSymlinks: false
    },
    server: {
      proxy: {
        // Biometric DEVICE protocol paths → standalone gateway servers. Devices
        // use the bare paths; the operator API /api/v1/iclock-terminal stays on
        // the app via the '/api' rule below. ZK TCP-pull has no inbound HTTP.
        '/iclock': {
          target: admsGatewayUrl, // adms_server gateway (ZK iClock push/pull + device file)
          changeOrigin: true,
        },
        '/hdata': {
          target: biomaxGatewayUrl, // biomax_server gateway (/hdata + /hdata.aspx)
          changeOrigin: true,
        },
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
        }
      },
    },
    plugins: [
      react(),
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace(
            /<title>.*?<\/title>/,
            `<title>${clientName || 'SalaryMitra'}</title>`
          );
        },
      },
      // PWA: installable + auto-update SW + workbox runtime caches. See
      // startup framework for inline rationale; identical config shape.
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,  // registered manually via registerServiceWorker.js
        strategies: 'generateSW',
        filename: 'sw.js',
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/[^/]+\/assets\//,
              handler: 'CacheFirst',
              options: { cacheName: 'static-assets', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
            {
              urlPattern: /^https?:\/\/[^/]+\/(icons|uploads)\//,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'images' },
            },
          ],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        includeAssets: ['icons/nbnext.svg', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml'],
        manifest: false,  // own /manifest.webmanifest via public/
        devOptions: { enabled: false },
      }),
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
