const customPlugin = require('./eslint-rules/index.js');
const importPlugin = require('eslint-plugin-import');

function get_base_config() {
  return {
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
        globalThis: 'readonly',
        // Node 18+ global fetch
        fetch: 'readonly',
        // WHATWG URL API (available since Node 10)
        URL: 'readonly',
        URLSearchParams: 'readonly'
      },
      sourceType: 'commonjs' // Server uses CommonJS modules
    },
    plugins: {
      custom: customPlugin,
      import: importPlugin
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
      'quotes': ['error', 'single', { allowTemplateLiterals: true }],
      'semi': ['error', 'always'],
      'indent': ['error', 2],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',

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
  };
}
module.exports = [
  { ignores: ['**/node_modules', '**/logs', '**/migrations', 'eslint.config.js', 'scripts', '**/dist'] },

  // Node.js server config
  {
    files: ['**/*.js'],
    ...get_base_config(),
    rules: {
      ...get_base_config().rules,
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
      'custom/no-env-outside-env-js': 'error',
      'custom/no-startup-imports-app': 'error',
      'custom/no-paranoid-models': 'error',

      // Import/export rules
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/default': 'error',
      'import/namespace': 'error',
      'import/extensions': ['error', 'ignorePackages', {
        js: 'never',
        json: 'always'
      }],
    }
  },
  // Standard formulas config (disable no-undef for runtime-provided globals)
  {
    files: ['**/standard_formulas/**/*.js'],
    ...get_base_config(),
    languageOptions: {
      ...get_base_config().languageOptions,
      globals: {
        ...get_base_config().languageOptions.globals,
        // Runtime-provided globals for formula execution
        logger: 'readonly',
        getMonthPercentage: 'readonly',
        getDaysBetween: 'readonly',
        convertMonthlySalaryToDaily: 'readonly',
        formatDate: 'readonly'
      }
    },
    rules: {
      ...get_base_config().rules,
      // Disable no-undef for standard formulas as they use runtime-provided globals
      'no-undef': 'off',
      
      // Relaxed custom rules for formulas
      'custom/no-console-usage': 'off', // Allow console in formulas
      'custom/no-logger-commas': 'off', // Relaxed for formulas
      'custom/no-direct-dotenv': 'off', // Not applicable to formulas
      'custom/no-env-outside-env-js': 'off', // Not applicable to formulas
      'custom/no-hardcoded-strings': 'off', // Relaxed for formulas
      'custom/warn-mixed-strings': 'off', // Relaxed for formulas
      'custom/no-json-stringify-in-logs': 'off', // Relaxed for formulas
      'custom/constants-in-single-folder': 'off', // Not applicable to formulas
      'custom/file-length-warning': 'off', // Relaxed for formulas
      'custom/no-direct-model-imports': 'off', // Not applicable to formulas
      
      // File length and complexity rules (relaxed)
      'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 100 }],
      'complexity': ['warn', 10]
    }
  },
  // Scripts config (more relaxed for utility scripts)
  {
    files: ['**/scripts/**/*.js'],
    ...get_base_config(),
    rules: {
      ...get_base_config().rules,
      'no-process-exit': 'off',

      // Relaxed custom rules for scripts
      'custom/no-console-usage': 'off', // Allow console in scripts
      // 'custom/logger-args-checker': 'off', // Relaxed for scripts
      'custom/no-direct-dotenv': 'off', // Allow direct dotenv in setup scripts
      'custom/no-env-outside-env-js': 'off', // Scripts run before env.js bootstrap; raw process.env is fine
      'custom/no-hardcoded-strings': 'off', // Relaxed for scripts
      'custom/no-json-stringify-in-logs': 'off', // Relaxed for scripts
      'custom/no-direct-model-imports': 'off', // Scripts may legitimately access models directly
      'custom/constants-in-single-folder': 'off' // Scripts can have script-local constants
    }
  },
  // Data structures config (more relaxed for data structures)
  {
    files: ['**/src/data_structures/**/*.js'],
    ...get_base_config(),
    rules: {
      ...get_base_config().rules,
      'custom/file-length-warning': 'off',
    }
  },
  // Test files (including __*_test__.js sentinels and anything under tests/)
  // legitimately set process.env.X before requiring modules that consume env,
  // so the strict env-centralization rule is relaxed here.
  {
    files: ['**/__*test*__.js', '**/*.test.js', '**/tests/**/*.js'],
    ...get_base_config(),
    rules: {
      ...get_base_config().rules,
      'custom/no-env-outside-env-js': 'off'
    }
  },
  // logger.js is required by config/env.js during the dotenv bootstrap, so it
  // cannot itself import env.js (circular). It reads NODE_ENV / LOG_LEVEL
  // directly — the only place outside env.js that's allowed to.
  {
    files: ['**/startup/server/logger.js'],
    ...get_base_config(),
    rules: {
      ...get_base_config().rules,
      'custom/no-env-outside-env-js': 'off'
    }
  }
];
