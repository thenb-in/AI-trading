// Vitest setup file - runs before each test file
// This ensures environment variables are loaded before tests run

import { initConfig } from './helpers/config';

// Initialize config (loads .env file)
try {
  initConfig();
} catch (error: any) {
  console.error('Failed to initialize test configuration:', error.message);
  process.exit(1);
}
