import { mergeConfig } from "vitest/config";
import config from "./vitest.config";

export default mergeConfig(config, {
  test: {
    name: "acc",
    poolOptions: {
      threads: {
        singleThread: !!process.env.CI,
      },
    },
    include: ['**/feature-test/**/*.steps.ts'],
  },
});
