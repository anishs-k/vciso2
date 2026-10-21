import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the UI talks to the client's API (full_project/src, `npm run dev` there, port 4000).
// In a client deployment the API serves the built UI itself, so no proxy is involved.
const API = process.env.VITE_API_TARGET || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: 'all',
    proxy: {
      '/api': {
        target: API,
        changeOrigin: true
      }
    }
  }
});
