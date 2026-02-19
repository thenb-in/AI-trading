import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  base: './',
  test: {
    // Test environment
    environment: 'node',
    
    // Enable globals (describe, test, expect available without imports)
    globals: true,
    
    // Test file patterns
    include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'logs', 'coverage'],
    
    // Setup files
    setupFiles: ['./vitest.setup.ts'],
    
    // Test timeout (30 seconds for API calls)
    testTimeout: 30000,
    
    // Reporters - default console + HTML report
    reporters: ['default', 'html'],
    
    // HTML report output
    outputFile: {
      html: './test-results/index.html',
    },
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'json', 'lcov'],
      reportsDirectory: './coverage',
      include: ['actions/**/*.ts', 'helpers/**/*.ts'],
      exclude: ['**/*.d.ts', '**/node_modules/**', '**/dist/**', '**/logs/**'],
    },
    
    // Verbose output
    verbose: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
