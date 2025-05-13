import { configDefaults, mergeConfig } from "vitest/config";
import config from "./vitest.config";

export default mergeConfig(config, {
  test: {
    name: "int",
    include: [ "**/int/**/*.test.ts" ],
    exclude: [
      ...configDefaults.exclude,
      "**/feature-tests/**",
      "**/compoment/**",
      "**/hello-world/**",
    ],
  },
})
