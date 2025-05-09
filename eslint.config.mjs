import nx from '@nx/eslint-plugin';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config([
  {
    ignores: [
      '**/dist',
      '.nx',
      '**/debug',
      '**/.aws-sam/',
      '**/*test*/**',
      '**/__mocks__/**/*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.js'],
    extends: [
     ...nx.configs['flat/base'],
     ...nx.configs['flat/typescript'],
     ...nx.configs['flat/javascript'],
     eslint.configs.recommended,
     ...tseslint.configs.recommended,
    ],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  }
]);
