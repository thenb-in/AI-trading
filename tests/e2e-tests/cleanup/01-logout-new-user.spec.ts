import { test } from '@playwright/test';
import * as fs from 'fs';
import { SignupTestLogger } from '../helpers/logger';
import { logoutUser } from '../helpers/logout';

test.describe('Cleanup - Logout New User', () => {
  test('logout the new user account', async ({ page }) => {
    test.setTimeout(60000);
    const logger = new SignupTestLogger();
    const consoleMessages: string[] = [];
    const toastMessages: string[] = [];

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

    // Set up API response capture
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        try {
          const body = await response.json().catch(() => ({}));
          if (body.message || body.error) {
            toastMessages.push(`API Response: ${body.message || body.error}`);
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    });

    try {
      // Logout the new user
      await logoutUser(page, logger);

      const completionTime = logger.getISTDateTimeString();
      fs.appendFileSync(logger.getLogFilePath(), `\n========================================\nTest completed: ${completionTime}\n========================================\n`);

      console.log(`\n✓ Logout new user test completed. Log file: ${logger.getLogFilePath()}\n`);
    } catch (error: any) {
      const finalError = `\nFINAL ERROR: ${error.message}\nStack: ${error.stack}\n`;
      fs.appendFileSync(logger.getLogFilePath(), finalError);
      throw error;
    }
  });
});
