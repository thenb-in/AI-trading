import { ApiClient } from './apiClient';
import { TestLogger } from './logger';
import { initConfig, config } from './config';

export interface TestSetupOptions {
  /**
   * Test timeout in milliseconds
   * @default 60000
   */
  timeout?: number;
  /**
   * Base URL for API requests
   * @default process.env.API_BASE_URL || 'http://localhost:3000'
   */
  baseUrl?: string;
  /**
   * Test name to log at start
   * @default undefined (will try to get from Vitest context)
   */
  testName?: string;
}

export interface TestSetupResult {
  logger: TestLogger;
  apiClient: ApiClient;
}

/**
 * Sets up common test infrastructure:
 * - Logger initialization
 * - API client initialization
 * - Logs test start with timestamp
 * 
 * @param options Test setup options
 * @returns Test setup result with logger and API client
 * 
 * @example
 * ```typescript
 * test('my test', async () => {
 *   const { logger, apiClient } = setupTest({ testName: 'my test' });
 *   
 *   const response = await apiClient.post('/api/v1/auth/login', { username, password });
 *   expect(response.status).toBe(200);
 * });
 * ```
 */
export function setupTest(options: TestSetupOptions = {}): TestSetupResult {
  // Initialize config (loads and validates .env)
  initConfig();

  const {
    timeout = 60000,
    baseUrl = config.apiBaseUrl,
    testName,
  } = options;

  const logger = new TestLogger();
  const apiClient = new ApiClient(baseUrl);

  // Log test start with timestamp if test name is provided
  if (testName) {
    logger.logTestStart(testName);
  }

  return {
    logger,
    apiClient,
  };
}
