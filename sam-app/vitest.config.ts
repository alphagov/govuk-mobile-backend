import { defineConfig } from "vitest/config"
import { VitestCucumberPlugin } from "@amiceli/vitest-cucumber"

export default defineConfig({
    test: {
        include: [
            "**/*.steps.ts",
        ]
    }
})