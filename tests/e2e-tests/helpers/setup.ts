import { Page } from '@playwright/test';
import * as fs from 'fs';
import { TestLogger } from './logger';

export interface TestSetupOptions {
  /**
   * Test timeout in milliseconds
   * @default 60000
   */
  timeout?: number;
  /**
   * Whether to capture API responses
   * @default false
   */
  captureApiResponses?: boolean;
  /**
   * URL patterns to match for API response capture
   * @default ['/api/', '/login', '/signup']
   */
  apiUrlsToCapture?: string[];
}

export interface TestSetupResult {
  logger: TestLogger;
  consoleMessages: string[];
  toastMessages: string[];
  /**
   * Wrapper function to run test logic with automatic error handling and logging
   */
  runTest: <T>(testFn: () => Promise<T>) => Promise<T>;
}

/**
 * Sets up common test infrastructure:
 * - Logger initialization
 * - Console message capture
 * - Page error capture
 * - API response capture (optional)
 * - Error handling wrapper
 * 
 * @param page Playwright page object
 * @param options Test setup options
 * @returns Test setup result with logger, message arrays, and runTest wrapper
 * 
 * @example
 * ```typescript
 * test('my test', async ({ page }) => {
 *   const { logger, consoleMessages, toastMessages, runTest } = setupTest(page, { timeout: 120000 });
 *   
 *   await runTest(async () => {
 *     // Your test logic here
 *     logger.logStep('Doing something', 'completed');
 *   });
 * });
 * ```
 */
export function setupTest(page: Page, options: TestSetupOptions = {}): TestSetupResult {
  const {
    timeout = 60000,
    captureApiResponses = false,
    apiUrlsToCapture = ['/api/', '/login', '/signup'],
  } = options;

  const logger = new TestLogger();
  const consoleMessages: string[] = [];
  const toastMessages: string[] = [];

  // Set test timeout
  if (timeout) {
    // Note: test.setTimeout() needs to be called in the test itself
    // This is just for reference
  }

  // Capture console messages
  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleMessages.push(`[${type.toUpperCase()}] ${text}`);
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    consoleMessages.push(`[ERROR] ${error.message}`);
  });

  // Set up API response capture (if enabled)
  if (captureApiResponses) {
    page.on('response', async (response) => {
      const url = response.url();
      const shouldCapture = apiUrlsToCapture.some((pattern) => url.includes(pattern));
      
      if (shouldCapture) {
        try {
          const body = await response.json().catch(() => ({}));
          if (body.message || body.error) {
            toastMessages.push(`API Response: ${body.message || body.error}`);
          }
          if (body.errors && Array.isArray(body.errors)) {
            body.errors.forEach((err: any) => {
              toastMessages.push(`API Validation Error: ${err.msg || err.message || err}`);
            });
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    });
  }

  /**
   * Wrapper function that runs test logic with automatic error handling and logging
   */
  const runTest = async <T>(testFn: () => Promise<T>): Promise<T> => {
    try {
      const result = await testFn();
      
      // Log completion
      const completionTime = logger.getISTDateTimeString();
      fs.appendFileSync(
        logger.getLogFilePath(),
        `\n========================================\nTest completed: ${completionTime}\n========================================\n`
      );
      
      console.log(`\n✓ Test completed. Log file: ${logger.getLogFilePath()}\n`);
      
      return result;
    } catch (error: any) {
      // Log error
      const finalError = `\nFINAL ERROR: ${error.message}\nStack: ${error.stack}\n`;
      fs.appendFileSync(logger.getLogFilePath(), finalError);
      throw error;
    }
  };

  return {
    logger,
    consoleMessages,
    toastMessages,
    runTest,
  };
}
