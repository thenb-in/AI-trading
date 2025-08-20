import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Backend server
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
})
