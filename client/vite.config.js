import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default ({ mode }) => {
  process.env = {...process.env, ...loadEnv(mode, process.cwd())};

  return defineConfig({
    base: process.env.VITE_APP_BASENAME || '/',
    server: {
      proxy: {
        '/api': {
          target: process.env.VITE_NODE_URL, // Backend server
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
    plugins: [react()], // Enable React plugin for Vite
  });
};
