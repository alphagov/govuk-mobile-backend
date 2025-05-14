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
      include: ["**/*.unit.test.ts", "**/**/unit/*.test.ts"],
    },
  },
  {
    test: {
      include: ["tests/acc/**/*.test.ts"],
      name: "acc",
      environment: "node",
      // allow for long running tests
      testTimeout: 120000,
    },
  },
  {
    test: {
      include: ["tests/int/**/*.test.ts"],
      name: "int",
      environment: "node",
      // allow for long running tests
      testTimeout: 120000,
      hookTimeout: 120000,
    },
  },
]);
