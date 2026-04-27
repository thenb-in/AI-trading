import { test } from '@playwright/test';
import { loadState, saveState } from '../../helpers/sharedState';
import { setupTest } from '../../helpers/setup';
import { resetPassword } from '../../actions/auth/reset-password';


const NEW_USER_PASSWORD = '123123';

test.describe('Auth - Password Reset', () => {
  test('reset the new user password via first-login flow', async ({ page }) => {
    const { logger, runTest } = setupTest(page, {
      timeout: 60000,
      captureApiResponses: true,
      apiUrlsToCapture: ['/api/', '/forgot-password'],
    });

    await runTest(async () => {
      const state = loadState();
      if (!state.newUserUsername || !state.newUserPassword) {
        throw new Error('newUserUsername / newUserPassword not found in shared state. Run signup tests first.');
      }

      await resetPassword(page, logger, state.newUserUsername, state.newUserPassword, NEW_USER_PASSWORD);

      saveState({
        newUserPassword: NEW_USER_PASSWORD,
        needsPasswordReset: false,
      });
    });
  });
});
