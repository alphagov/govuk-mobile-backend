import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@libs/http-utils': new URL(
        './libs/http-utils/src/index.ts',
        import.meta.url,
      ).pathname,
      '@libs/auth-utils': new URL(
        './libs/auth-utils/src/index.ts',
        import.meta.url,
      ).pathname,
      '@libs/test-utils': new URL(
        './libs/test-utils/src/index.ts',
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    projects: [
      {
        // will inherit options from this config like aliases and pool
        extends: true,
        test: {
          name: 'unit',
          include: [
            '**/*.unit.test.ts',
            '**/**/unit/*.test.ts',
            '**/**/tests/unit/**/*.test.ts',
          ],
        },
      },
      {
        test: {
          include: ['**/tests/acc/**/*.test.ts'],
          name: 'acc',
          environment: 'node',
          // allow for long running tests
          testTimeout: 120000,
        },
      },
      {
        test: {
          include: ['scripts/**/*.test.ts'],
          name: 'scripts',
          environment: 'node',
          // allow for extremely long running tests (Deploy script testing)
          testTimeout: 600000,
          // Run script test files one at a time to avoid parallel script execution
          pool: 'threads',
          fileParallelism: false,
        },
      },
      {
        test: {
          include: ['**/tests/int/**/*.test.ts'],
          name: 'int',
          environment: 'node',
          // allow for long running tests
          testTimeout: 120000,
          hookTimeout: 120000,
        },
      },
    ],
    // Common test configurations
    globals: true,
    environment: 'node',
    watch: false,
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: {
      junit: './reports/source/test-results.xml',
    },
    coverage: {
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/tests/**/*',
        '**/*.test.ts',
        'vitest*.config.ts',
        '__mocks__',
        'libs/test-utils/**/*',
        'scripts/**/*',
      ],
      reporter: ['text', 'lcov'],
      reportOnFailure: true,
      reportsDirectory: './coverage',
      thresholds: {
        functions: 80,
      },
    },
  },
});
