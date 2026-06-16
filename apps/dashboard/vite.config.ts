import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // SPA disajikan dari root '/'. API hanya di '/v1' + '/health' (lihat
  // scripts/nginx.conf.template). Router basename mengikuti BASE_URL ini.
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/v1': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
