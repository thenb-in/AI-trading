import { test } from '@playwright/test';
import { saveState } from '../../helpers/sharedState';
import { setupTest } from '../../helpers/setup';
import { resetPassword } from '../../actions/auth/reset-password';


const NEW_USER_PASSWORD = '123123';

test.describe('Auth - Password Reset', () => {
  test('handle password reset if required', async ({ page }) => {
    const { logger, runTest } = setupTest(page, {
      timeout: 60000,
      captureApiResponses: true,
      apiUrlsToCapture: ['/api/', '/forgot-password'],
    });

    await runTest(async () => {
      await resetPassword(page, logger, NEW_USER_PASSWORD);
      // Save the new password as the final password
      saveState({
        adminPassword: NEW_USER_PASSWORD,
        needsPasswordReset: false,
      });
    });
  });
});

