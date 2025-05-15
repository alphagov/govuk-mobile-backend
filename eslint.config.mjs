// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
<<<<<<< HEAD
import pluginPromise from 'eslint-plugin-promise';
import jsdoc from 'eslint-plugin-jsdoc';
import importPlugin from 'eslint-plugin-import';
=======
import promisePlugin from 'eslint-plugin-promise';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import importPlugin from 'eslint-plugin-import';
import securityPlugin from 'eslint-plugin-security';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
>>>>>>> origin/chore/typescript-eslint-config-1688

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
<<<<<<< HEAD
  jsdoc.configs['flat/recommended-typescript'],
  importPlugin.flatConfigs.recommended,
=======
  jsdocPlugin.configs['flat/recommended-typescript'],
  importPlugin.flatConfigs.recommended,
  securityPlugin.configs.recommended,
  sonarjsPlugin.configs.recommended,
>>>>>>> origin/chore/typescript-eslint-config-1688
  {
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
	  impliedStrict: true
	},
        tsconfigRootDir: import.meta.dirname,
	sourceType: "module",
	ecmaVersion: "ES2020",
	projectService: {
	  allowDefaultProject: ["eslint.config.mjs"],
	}
      },
    },
  },
  {
    ignores: [
      '**/dist',
      '.nx',
      '**/debug',
      '**/.aws-sam/**',
      '**/feature-tests/**',
      '**/tests/**',
      '**/vitest*.ts',
      '**/coverage/**/*',
      'eslint.config.mjs',
    ],
  },
  {
    files: [
      '**/*.ts',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {
      "promise/always-return": "error",
      "promise/avoid-new": "error",
      "promise/catch-or-return": "error",
      "promise/no-return-wrap": "error",
      "promise/param-names": "error",
      "promise/no-callback-in-promise": "error",
      "promise/no-multiple-resolved": "error",
      "promise/no-native": "off",
      "promise/no-nesting": "error",
      "promise/no-new-statics": "error",
      "promise/no-promise-in-callback": "error",
      "promise/no-return-in-finally": "warn",
      "promise/param-names": "warn",
      "promise/prefer-await-to-callbacks": "error",
      "promise/prefer-await-to-then": "off",
      "promise/prefer-catch": "off",
      "promise/valid-params": "error",
      "promise/spec-only": "error",
      "importPlugin/no-deprecated": "error",
      "importPlugin/no-empty-named-blocks": "error",
      "importPlugin/no-extraneous-dependencies": "error",
      "importPlugin/no-mutable-exports": "error",
      "importPlugin/no-unused-modules": "error",
      "importPlugin/no-absolute-path": "error",
      "importPlugin/no-cycle": "error",
      "importPlugin/no-internal-modules": "error",
      "importPlugin/no-useless-path-segments": "error",
      "importPlugin/exports-last": "warn",
      "importPlugin/first": "warn",
      "importPlugin/group-exports": "warn",
      "importPlugin/newline-after-import": "error",
      "importPlugin/no-anonymous-default-export": "error",
      "importPlugin/no-default-export": "error",
      "importPlugin/no-unassigned-import": "error",
      "class-methods-use-this": "off",
      "@typescript-eslint/class-methods-use-this": "error",
      "@typescript-eslint/consistent-type-exports": ["error", { "fixMixedExportsWithInlineTypeSpecifier": false }],
      "@typescript-eslint/consistent-type-imports": ["error", { "disallowTypeAnnotations": true, "fixStyle": "separate-type-imports", "prefer": "type-imports" }],
      "default-param-last": "off",
      "@typescript-eslint/default-param-last": "error",
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/explicit-member-accessibility": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "init-declarations": "off",
      "@typescript-eslint/init-declarations": "error",
      "@typescript-eslint/naming-convention": ["error",
      { "selector": "variableLike", "format": ["camelCase"] },
      { "selector": "variable", "types": ["boolean"], "format": ["PascalCase"], "prefix": ["is", "should", "has", "can", "did", "will"] },
      { "selector": ["variable", "function"], "format": ["camelCase"], "leadingUnderscore": "allow" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "no-loop-func": "off",
      "@typescript-eslint/no-loop-func": "error",
      "no-magic-numbers": "off",
      "@typescript-eslint/no-magic-numbers": ["error", {
        "ignoreEnums": true,
        "ignoreNumericLiteralTypes": true,
        "ignoreReadonlyClassProperties": false,
        "ignoreTypeIndexes": false,
      }],
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/no-unnecessary-parameter-property-assignment": "error",
      "@typescript-eslint/no-unnecessary-qualifier": "error",
      "@typescript-eslint/no-unnecessary-type-conversion": "error",
      "@typescript-eslint/no-unsafe-type-assertion": "error",
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": "error",
      "@typescript-eslint/no-useless-empty-export": "error",
      "prefer-destructuring": "off",
      "@typescript-eslint/prefer-destructuring": "error",
      "@typescript-eslint/prefer-enum-initializers": "error",
      "@typescript-eslint/promise-function-async": "error",
      "@typescript-eslint/strict-boolean-expressions": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
    },
  },
  {
    files: [
      "auth/feature-tests/**/*.ts",
      "auth/**/*.test.ts"
    ],
    rules: {
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-unused-expressions": "off"
    },
  },
  {
    plugins: {
      promise: promisePlugin,
      importPlugin: importPlugin,
      security: securityPlugin,
    }
  }
);
