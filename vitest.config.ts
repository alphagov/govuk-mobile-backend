import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Common test configurations
    globals: true,
    environment: 'node',
  },
});