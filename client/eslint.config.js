import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import customPlugin from './eslint-rules/index.js'

export default [
  { ignores: ['dist', '.vite/**', 'node_modules/**'] },

  // React/browser config
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      custom: customPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Custom project-specific rules
      'custom/no-anonymous-components': 'error',
      'custom/no-inline-components': 'error',
      'custom/no-magic-spacing': 'error',
      'custom/no-inline-styles': 'error',
      'custom/theme-values-only': 'error',
      'custom/no-direct-fetch': 'error',
      'custom/no-inline-arrow-functions': 'error',
      'custom/named-exports-only': ['error', { 
        excludePatterns: ['eslint-rules', 'scripts']
      }],
    },
  },

  // Node scripts config and Vite config files
  {
    files: ['scripts/**/*.js', 'vite.config.js', 'vite.config.ts', 'eslint.config.js'], // Adjust path to match your Node scripts
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node, // Node globals like process, __dirname
      sourceType: 'module',
    },
    plugins: {
      custom: customPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-case-declarations': 'off', // optional: handled with braces in switch
      // Relaxed custom rules for config files
      'custom/named-exports-only': 'off', // Allow default exports in config files
    },
  },
]
