import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      include: ['feature-tests/functional/**/*.steps.ts'],
      name: 'functional',
      environment: 'node',
      // allow for puppeteer navigation changes
      testTimeout: 10000
    }
  },
  {
    test: {
      name: 'unit',
      include: ['**/*.unit.test.ts'],
    }
  },
])