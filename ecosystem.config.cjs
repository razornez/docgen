/**
 * PM2 ecosystem config untuk produksi DocGen.
 *
 * Langkah deploy:
 *   1. Salin repo ke server, masuk ke direktori project
 *   2. pnpm install --frozen-lockfile
 *   3. Isi .env (NODE_ENV=production, DATABASE_URL, STORAGE_DRIVER=s3, dll.)
 *   4. pnpm db:migrate            ← jalankan migrasi database
 *   5. pnpm build:all             ← build packages + api + worker + dashboard
 *   6. pm2 start ecosystem.config.cjs
 *   7. pm2 save && pm2 startup    ← auto-start saat server reboot
 *
 * Update tanpa downtime:
 *   git pull && pnpm install --frozen-lockfile && pnpm build:all && pm2 reload all
 */
module.exports = {
  apps: [
    {
      name: 'docgen-api',
      script: 'node',
      args: 'apps/api/dist/index.js',
      cwd: '/var/www/docgen', // ganti dengan path deployment
      env_file: '.env',
      instances: 1, // naikkan ke 'max' untuk multi-core
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: '512M',
      error_file: 'logs/api-error.log',
      out_file: 'logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'docgen-worker',
      script: 'node',
      args: 'apps/worker/dist/index.js',
      cwd: '/var/www/docgen', // ganti dengan path deployment
      env_file: '.env',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '1G', // Playwright butuh lebih banyak RAM
      error_file: 'logs/worker-error.log',
      out_file: 'logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 15000, // beri waktu graceful shutdown (tutup Chromium)
    },
  ],
};
