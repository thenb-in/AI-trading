import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { readFileSync } from 'fs'
import { resolve } from 'path'


// https://vitejs.dev/config/
export default ({ mode }) => {
  process.env = {...process.env, ...loadEnv(mode, process.cwd())};

  // Read package.json files to get all versions
  const rootPackageJson = JSON.parse(
    readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
  );
  const clientPackageJson = JSON.parse(
    readFileSync(resolve(__dirname, './package.json'), 'utf-8')
  );
  const serverPackageJson = JSON.parse(
    readFileSync(resolve(__dirname, '../server/package.json'), 'utf-8')
  );
  
  const startupVersion = rootPackageJson.version || '0.0.0';
  const clientVersion = clientPackageJson.version || '0.0.0';
  const serverVersion = serverPackageJson.version || '0.0.0';
  const clientName = clientPackageJson.name;

  return defineConfig({
    base: process.env.VITE_APP_BASENAME || '/',
    define: {
      'import.meta.env.VITE_APP_VERSION_STARTUP': JSON.stringify(startupVersion),
      'import.meta.env.VITE_APP_VERSION_CLIENT': JSON.stringify(clientVersion),
      'import.meta.env.VITE_APP_VERSION_SERVER': JSON.stringify(serverVersion),
      'import.meta.env.VITE_APP_NAME_CLIENT': JSON.stringify(clientName),
    },
    server: {
      proxy: {
        '/api': {
          target: process.env.VITE_PROXY_URL, // Backend server
          changeOrigin: true, // Ensure that the host header is updated to the target URL
          // rewrite: (path) => path.replace(/^\/api/, ''), // Optional, remove '/api' prefix if needed
        },
      },
    },
    plugins: [
      react(), // Enable React plugin for Vite
      tsconfigPaths(), // Use path aliases from tsconfig.json
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          // Replace title with app name from package.json
          return html.replace(
            /<title>.*?<\/title>/,
            `<title>${clientName || 'NB Next'}</title>`
          );
        },
      },
    ],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'mui-vendor': ['@mui/material', '@mui/icons-material', '@mui/x-date-pickers'],
            // 'chart-vendor': ['chart.js', 'react-chartjs-2'],
          },
        },
      },
    },
  });
};
