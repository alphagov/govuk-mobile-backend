import { coverageConfigDefaults, defineConfig } from "vitest/config";

/**
 * Vitest root configuration
 * the root configuration will only influence global options such as reporters and coverage
 * vitest will always run certain plugin hooks like apply, config, configResolved or configureServer
 * specified in the root config.
 *
 */
export default defineConfig({
  test: {
    // Common test configurations
    globals: true,
    environment: "node",
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
