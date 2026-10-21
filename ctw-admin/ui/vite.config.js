import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Development: the UI on 5174 talks to the CTW admin API (ctw-admin `npm run dev`, port 4500).
// After `npm run build` the API serves ui/dist itself, so no proxy is involved.
const API = process.env.VITE_API_TARGET || 'http://localhost:4500';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: { '/api': { target: API, changeOrigin: true } },
  },
});
