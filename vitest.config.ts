import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Since Vitest 3, you can define a workspace in your root config. In this case, Vitest will ignore the vitest.workspace file in the root, if one exists.
    workspace: [
      {
        // will inherit options from this config like plugins and pool
        extends: true,
        test: {
          name: "unit",
          include: ["**/*.unit.test.ts", "**/**/unit/*.test.ts"],
        },
      },
      {
        test: {
          include: ["**/tests/acc/**/*.test.ts"],
          name: "acc",
          environment: "node",
          // allow for long running tests
          testTimeout: 120000,
        },
      },
      {
        test: {
          include: ["**/tests/int/**/*.test.ts"],
          name: "int",
          environment: "node",
          // allow for long running tests
          testTimeout: 120000,
          hookTimeout: 120000,
        },
      },
      {
        test: {
          include: ["**/feature-tests/functional/**/*.steps.ts"],
          name: "functional",
          environment: "node",
          // allow for long running tests
          testTimeout: 120000,
        }
      },
      {
        test: {
          include: ["**/tests/api/**/*.test.ts"],
          name: "api",
          environment: "node",
          // allow for long running tests
          testTimeout: 120000,
        },
      },
    ],
    // Common test configurations
    globals: true,
    environment: 'node',
    watch: false,
    coverage: {
      exclude: [
        ...coverageConfigDefaults.exclude,
        "**/feature-tests/**",
        "**/tests/**/*",
        "**/*.test.ts",
        "vitest*.config.ts",
        "__mocks__",
      ],
      reporter: ["text", "lcov"],
      reportOnFailure: true,
      reportsDirectory: './coverage',
      thresholds: {
        functions: 80
      },
    },
  },
});
