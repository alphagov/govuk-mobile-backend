import { defineConfig } from "vitest/config"
import { VitestCucumberPlugin } from "@amiceli/vitest-cucumber"

export default defineConfig({
    test: {
        include: [
            "**/*.steps.ts",
            "**/*.test.ts",
        ],
        reporters: [
            'default', // To still see output in the console
          ['json', { outputFile: `./${TEST_REPORT_DIR}/results.json` }],
          ['junit', { outputFile: `./${TEST_REPORT_DIR}/junit.xml` }],
        ],
        coverage: {
            provider: 'istanbul', // or 'v8'
            reporter: ['text', 'json', 'html'],
        },
        watch: false
    }
})
