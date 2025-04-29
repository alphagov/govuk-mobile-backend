import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      include: ['feature-tests/functional/**/*.steps.ts','tests/**/*'],
      name: 'functional',
      environment: 'node',
      // allow for puppeteer navigation changes
      testTimeout: 120000
    }
  },
  {
    test: {
      name: "unit",
      include: ["**/*.unit.test.ts"],
    },
  },
]);

