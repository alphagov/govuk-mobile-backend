import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: [
          "**/*.steps.ts",
          "**/*.test.ts",
        ],
        reporters: [
          'default', // To still see output in the console
          ['json', { outputFile: './report/results.json' }],
          ['junit', { outputFile: './report/junit.xml' }]
        ],
        coverage: {
          provider: 'istanbul', // or 'v8'
          reporter: ['text', 'json', 'html', 'lcov'],
          reportOnFailure: true,
          exclude: ["**/feature-tests/**", "**/test?/**"]
        },
        watch: false
    }
})
