import { configDefaults, mergeConfig } from "vitest/config";
import config from "./vitest.config";

export default mergeConfig(config, {
  test: {
    name: "unit",
    include: ["**/tests/unit/**/*.test.ts"],
    exclude: [
      ...configDefaults.exclude,
      "**/feature-tests/**",
      "**/compoment/**",
      "**/hello-world/**",
    ],
  },
})
