/**
 * Shared ESLint configuration for the monorepo.
 *
 * This file provides factory functions that create ESLint configs for different
 * project types. Projects should import and use these factories to ensure
 * consistent linting across the monorepo.
 *
 * Usage:
 *   import { createReactConfig } from '../eslint.config.base.js';
 *   import react from 'eslint-plugin-react';
 *   import reactHooks from 'eslint-plugin-react-hooks';
 *   export default createReactConfig({
 *     tsconfigRootDir: import.meta.dirname,
 *     plugins: { react, reactHooks },
 *   });
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// ============================================================================
// BASE RULES - Apply to all TypeScript projects
// ============================================================================

export const baseTypescriptRules = {
  // Unused variables (allow underscore prefix for intentionally unused)
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

  // Type safety - warnings for gradual adoption
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unsafe-assignment': 'warn',
  '@typescript-eslint/no-unsafe-member-access': 'warn',
  '@typescript-eslint/no-unsafe-call': 'warn',
  '@typescript-eslint/no-unsafe-return': 'warn',
  '@typescript-eslint/no-unsafe-argument': 'warn',

  // Promise handling - errors, these catch real bugs
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/require-await': 'error',

  // Import style
  '@typescript-eslint/consistent-type-imports': ['error', {
    prefer: 'type-imports',
    fixStyle: 'separate-type-imports',
  }],

  // Boolean expressions - require explicit checks
  '@typescript-eslint/strict-boolean-expressions': ['error', {
    allowString: false,
    allowNumber: false,
    allowNullableObject: true,
    allowNullableBoolean: true,
    allowNullableString: false,
    allowNullableNumber: false,
    allowAny: false,
  }],

  // Code quality
  '@typescript-eslint/no-unnecessary-condition': 'error',
  '@typescript-eslint/prefer-nullish-coalescing': 'error',
  '@typescript-eslint/prefer-optional-chain': 'error',
  '@typescript-eslint/switch-exhaustiveness-check': 'error',
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  '@typescript-eslint/no-shadow': 'error',

  // Core ESLint rules
  'eqeqeq': ['error', 'always'],
};

// ============================================================================
// REACT RULES - Additional rules for React projects
// ============================================================================

export const reactRules = {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
  'react/react-in-jsx-scope': 'off',
  'react/jsx-uses-react': 'off',
  'react/no-array-index-key': 'warn',
};

// ============================================================================
// NODE RULES - Adjustments for Node.js backend projects
// ============================================================================

export const nodeRules = {
  '@typescript-eslint/explicit-function-return-type': 'warn',
  'no-console': 'off',
};

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create ESLint config for a React + TypeScript project.
 *
 * @param {Object} options
 * @param {string} options.tsconfigRootDir - Directory containing tsconfig.json
 * @param {Object} options.plugins - Object with 'react' and 'reactHooks' plugins
 * @param {string[]} [options.ignores] - Additional patterns to ignore
 * @param {Object} [options.rules] - Additional rules or overrides
 */
export function createReactConfig({ tsconfigRootDir, plugins, ignores = [], rules = {} }) {
  return tseslint.config([
    { ignores: ['dist', 'node_modules', ...ignores] },
    {
      files: ['**/*.{ts,tsx}'],
      extends: [
        js.configs.recommended,
        tseslint.configs.recommendedTypeChecked,
      ],
      plugins: {
        'react': plugins.react,
        'react-hooks': plugins.reactHooks,
      },
      languageOptions: {
        ecmaVersion: 2020,
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
          ecmaFeatures: { jsx: true },
        },
      },
      settings: {
        react: { version: 'detect' },
      },
      rules: {
        ...baseTypescriptRules,
        ...reactRules,
        '@typescript-eslint/explicit-function-return-type': 'off',
        ...rules,
      },
    },
  ]);
}

/**
 * Create ESLint config for a React + Vite project.
 *
 * @param {Object} options
 * @param {string} options.tsconfigRootDir - Directory containing tsconfig.json
 * @param {Object} options.plugins - Object with 'reactHooks' and 'reactRefresh' plugins
 * @param {Object} options.globals - Browser globals from 'globals' package
 * @param {string[]} [options.ignores] - Additional patterns to ignore
 * @param {Object} [options.rules] - Additional rules or overrides
 */
export function createViteReactConfig({ tsconfigRootDir, plugins, globals, ignores = [], rules = {} }) {
  return tseslint.config([
    { ignores: ['dist', 'node_modules', ...ignores] },
    {
      files: ['**/*.{ts,tsx}'],
      extends: [
        js.configs.recommended,
        tseslint.configs.recommendedTypeChecked,
        plugins.reactHooks.configs.flat['recommended-latest'],
        plugins.reactRefresh.configs.vite,
      ],
      languageOptions: {
        ecmaVersion: 2020,
        globals,
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        ...baseTypescriptRules,
        '@typescript-eslint/explicit-function-return-type': 'off',
        ...rules,
      },
    },
  ]);
}

/**
 * Create ESLint config for a Node.js + TypeScript project.
 *
 * @param {Object} options
 * @param {string} options.tsconfigRootDir - Directory containing tsconfig.json
 * @param {string[]} [options.ignores] - Additional patterns to ignore
 * @param {Object} [options.rules] - Additional rules or overrides
 */
export function createNodeConfig({ tsconfigRootDir, ignores = [], rules = {} }) {
  return tseslint.config([
    { ignores: ['dist', 'node_modules', ...ignores] },
    {
      files: ['**/*.ts'],
      extends: [
        js.configs.recommended,
        tseslint.configs.recommendedTypeChecked,
      ],
      languageOptions: {
        ecmaVersion: 2022,
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        ...baseTypescriptRules,
        ...nodeRules,
        ...rules,
      },
    },
  ]);
}
