import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Load environment variables from .env file
 * Looks for .env file in the integration-tests directory
 */
function loadEnv(): void {
  const envPath = path.resolve(__dirname, '../.env');
  const envExamplePath = path.resolve(__dirname, '../.env.example');

  // Check if .env file exists
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      console.error('\n❌ .env file not found!');
      console.error(`Please copy .env.example to .env and fill in the required values.`);
      console.error(`Expected location: ${envPath}\n`);
    } else {
      console.error('\n❌ .env file not found and .env.example is missing!');
      console.error(`Please create a .env file at: ${envPath}\n`);
    }
    process.exit(1);
  }

  // Load .env file
  dotenv.config({ path: envPath });
}

/**
 * Validate required environment variables
 */
function validateEnv(): void {
  const requiredVars = ['TEST_ADMIN_USERNAME', 'TEST_ADMIN_PASSWORD', 'API_BASE_URL'];
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach((varName) => {
      console.error(`  - ${varName}`);
    });
    console.error('\nPlease ensure all required variables are set in your .env file.\n');
    process.exit(1);
  }
}

/**
 * Initialize configuration - loads and validates environment variables
 * Call this at the start of your test files
 */
export function initConfig(): void {
  loadEnv();
  validateEnv();
}

/**
 * Get configuration values
 */
export const config = {
  get apiBaseUrl(): string {
    return process.env.API_BASE_URL || 'http://localhost:3000';
  },

  get adminUsername(): string {
    const username = process.env.TEST_ADMIN_USERNAME;
    if (!username) {
      throw new Error('TEST_ADMIN_USERNAME is required in .env file');
    }
    return username;
  },

  get adminPassword(): string {
    const password = process.env.TEST_ADMIN_PASSWORD;
    if (!password) {
      throw new Error('TEST_ADMIN_PASSWORD is required in .env file');
    }
    return password;
  },

  /** Base URL of the frontend app (for report links). Defaults to API_BASE_URL if not set. */
  get frontendBaseUrl(): string {
    return process.env.FRONTEND_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';
  },

  /** Company name to switch to for tests (e.g. "theNB Digital Solutions"). If set, workflow switches to this company; otherwise uses first in list. */
  get testCompanyName(): string | undefined {
    const name = process.env.TEST_COMPANY_NAME?.trim();
    return name || undefined;
  },

  /** If true, teardown steps (delete timetable, deactivate employee) run; otherwise those steps are skipped. */
  get cleanupTestData(): boolean {
    const v = process.env.CLEANUP_TEST_DATA?.trim().toLowerCase();
    return v === 'true' || v === '1';
  },
};
