import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
        '@emotion/styled'
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
            `<title>${clientName || 'NB Next'}</title>`
          );
        },
      },
         // PWA: installable + auto-update SW + workbox runtime caches. See
      // startup framework for full inline docs — same config shape here.
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
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'mui-vendor': [
              '@mui/material',
              '@mui/icons-material',
              '@mui/x-date-pickers',
              '@emotion/react',
              '@emotion/styled',
            ],
            'monaco-vendor': ['monaco-editor'],
            // pdf-lib intentionally omitted: declared in startup/client/package.json
            // but never imported anywhere, so npm's hoist doesn't place it where
            // Rollup (running from app/client) can resolve it as a chunk entry.
            'pdf-vendor': ['jspdf', 'jspdf-autotable', 'html2canvas', 'react-pdf'],
            'spreadsheet-vendor': ['exceljs', 'xlsx', 'papaparse'],
            'doc-vendor': ['docx', 'mammoth'],
            'chart-vendor': ['chart.js', 'react-chartjs-2'],
            'map-vendor': ['react-leaflet'],
          },
        },
      },
    },
  });
};
