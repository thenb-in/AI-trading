import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import path from 'path';


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
    theme: {
      extend: {
        fontFamily: {
          poppins: ['Poppins', 'sans-serif'],
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@data': path.resolve(__dirname, 'src/data'),
        '@theme': path.resolve(__dirname, 'src/constants/startup/theme'),
      }
    },
    plugins: [
      react(), // Enable React plugin for Vite
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
  });
};
