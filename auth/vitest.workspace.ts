import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      include: ['feature-tests/infrastructure/**/*.steps.ts'],
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