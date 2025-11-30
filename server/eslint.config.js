const customPlugin = require('./eslint-rules/index.js');

module.exports = [
  { ignores: ['node_modules', 'logs', 'migrations', 'eslint.config.js', 'scripts'] },

  // Node.js server config
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        // Node.js globals
        global: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        // ES2020 globals
        BigInt: 'readonly',
        globalThis: 'readonly'
      },
      sourceType: 'commonjs' // Server uses CommonJS modules
    },
    plugins: {
      custom: customPlugin
    },
    rules: {
      // Basic recommended rules
      'no-unused-vars': ['error', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_'
      }],
      'no-undef': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs'],
      'comma-dangle': ['error', 'never'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'indent': ['error', 2],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',

      // Custom project-specific rules (migrated from legacy checks)
      'custom/no-console-usage': 'error',
      'custom/logger-args-checker': 'error',
      'custom/no-direct-dotenv': 'error',
      'custom/no-hardcoded-strings': 'error',
      'custom/warn-mixed-strings': 'warn',
      'custom/no-json-stringify-in-logs': 'error',
      'custom/constants-in-single-folder': 'error',
      'custom/file-length-warning': ['warn', { warningLines: 300 }],
      'custom/no-direct-model-imports': 'error',
      'custom/named-exports-only': ['error', { 
        excludePatterns: ['eslint-rules', 'scripts', 'migrations']
      }],

      // File length and complexity rules
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
      'complexity': ['warn', 15],

      // Node.js specific rules
      'no-process-exit': 'error',
      'no-path-concat': 'error',

      // Security rules
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error'
    }
  },

  // Scripts config (more relaxed for utility scripts)
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        // Node.js globals
        global: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        // ES2020 globals
        BigInt: 'readonly',
        globalThis: 'readonly'
      },
      sourceType: 'commonjs'
    },
    plugins: {
      custom: customPlugin
    },
    rules: {
      'no-process-exit': 'off',

      // Relaxed custom rules for scripts
      'custom/no-console-usage': 'off', // Allow console in scripts
      // 'custom/logger-args-checker': 'off', // Relaxed for scripts
      'custom/no-direct-dotenv': 'off', // Allow direct dotenv in setup scripts
      'custom/no-hardcoded-logger-strings': 'off', // Relaxed for scripts
      'custom/no-json-stringify-in-logs': 'off' // Relaxed for scripts
    }
  }
];
