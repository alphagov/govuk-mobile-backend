import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  './vitest.unit.config.ts',
  './vitest.int.config.ts',
  './vitest.acc.config.ts',
]);
