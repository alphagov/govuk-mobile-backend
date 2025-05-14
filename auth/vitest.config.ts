import { defineConfig, coverageConfigDefaults } from "vitest/config"
import { VitestCucumberPlugin } from "@amiceli/vitest-cucumber"

export default defineConfig({
    test: {
        include: [
            "**/*.steps.ts",
            "**/*.test.ts",
        ],
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
          reportsDirectory: './coverage',
          thresholds: {
            functions: 80,
            lines: 80,
            branches: 80,
            statements: 80,
          },
        },
        watch: false
    }
})
