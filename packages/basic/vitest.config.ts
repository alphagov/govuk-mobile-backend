import { defineConfig } from 'vitest/config';

/**
 *
 * For reference see https://vitest.dev/config/
 *
 **/
export default defineConfig({
  test: {
      exclude: [],
      // include: [], // default is set to ['**/*.{test,spec}.?(c|m)[jt]s?(x)']
      // includeSource: [],
      name: "Basic package",
      // reporters: []
  },
})
