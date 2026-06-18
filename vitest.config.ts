import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts', 'scripts/**/*.test.mjs'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      ekko: fileURLToPath(new URL('./lib/framework/index.ts', import.meta.url)),
    },
  },
});
