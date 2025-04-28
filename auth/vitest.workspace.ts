import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      include: ["feature-tests/functional/**/*.steps.ts"],
      name: "functional",
      environment: "node",
      // allow for long running tests
      testTimeout: 120000,
    },
  },
  {
    test: {
      name: "unit",
      include: ["**/*.unit.test.ts"],
    },
  },
  {
    test: {
      name: "component",
      include: ["**/*.component.test.ts"],
    },
  },
]);
