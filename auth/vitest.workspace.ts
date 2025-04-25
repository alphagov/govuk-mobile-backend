import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      include: ['feature-tests/functional/**/*.steps.ts','tests/**/*'],
      name: 'functional',
      environment: 'node',
    }
  }
])
