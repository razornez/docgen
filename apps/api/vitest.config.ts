import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Kode sumber memakai impor ber-ekstensi `.js` (selaras tsc). Petakan `.js`
  // ke `.ts` agar Vite/vitest menyelesaikannya saat memuat sumber.
  resolve: {
    extensionAlias: { '.js': ['.ts', '.js'] },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
