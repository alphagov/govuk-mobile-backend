import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Common test configurations
    globals: true,
    environment: 'node',
    watch: false,
    coverage: {
      exclude: [
        ...coverageConfigDefaults.exclude,
        "**/feature-tests/**",
        "**/feature-tests/**",
        "**/tests/**/*",
        "**/*.test.ts",
        "vitest*.config.ts",
        "__mocks__",
      ],
      reporter: ["text", "lcov"],
      reportOnFailure: true,
      thresholds: {
        functions: 80
      },
    },
  },
});
