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

    // Run spec files SEQUENTIALLY. We hit a single backend server with
    // shared global state (ADMS command queue, terminal rows, employee
    // table). Parallel spec execution causes order-dependent flakes when
    // one spec's auto-sync activity bloats another spec's queue past the
    // drain helper's iteration budget. Sequential is ~30s slower for the
    // full sweep but stable.
    fileParallelism: false,
    
    // Reporters - default console + HTML report
    reporters: ['default', 'html'],
    
    // HTML report output
    outputFile: {
      html: './test-results/index.html',
    },
    
    // Coverage configuration.
    //
    // NOTE: integration tests in this repo run against an *external* server
    // (Supertest agent against API_BASE_URL). Vitest's in-process v8 collector
    // therefore cannot observe the server's runtime — real server coverage is
    // produced by NODE_V8_COVERAGE set on the spawned server (see
    // ../scripts/coverage.mjs). The include paths below are kept correct so
    // that if/when tests boot the app in-process, this config Just Works.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'json', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        '../../startup/server/src/**/*.js',
        '../../app/server/**/*.js',
      ],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/dist/**',
        '**/logs/**',
        '**/migrations/**',
        '**/seeders/**',
        '**/scheduler/**',
        '**/scripts/**',
      ],
      all: true,
    },
    
    // Verbose output
    // verbose: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
