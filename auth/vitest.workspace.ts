import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      include: ['feature-tests/vitest-step-definitions/**.steps.ts'],
      name: 'infrastructure',
      environment: 'node',
    }
  },
  {
    test: {
      include: ['feature-tests/functional/**/*.steps.ts'],
      name: 'functional',
      environment: 'node',
    }
  }
])