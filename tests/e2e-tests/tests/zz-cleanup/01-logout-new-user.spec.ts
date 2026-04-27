import { test } from '@playwright/test';
import { setupTest } from '../../helpers/setup';
import { loginWithCredentials } from '../../actions/auth/user';
import { logoutUser } from '../../actions/auth/logout-user';
import { loadState } from '../../helpers/sharedState';

test.describe('Cleanup - Logout New User', () => {
  test('logout the new user account', async ({ page }) => {
    const { logger, runTest } = setupTest(page, {
      timeout: 60000,
      captureApiResponses: true,
      apiUrlsToCapture: ['/api/'],
    });

    await runTest(async () => {
      const state = loadState();
      if (!state.newUserUsername || !state.newUserPassword) {
        throw new Error('newUserUsername / newUserPassword not found in shared state. Run signup tests first.');
      }

      // Each Playwright test gets a fresh browser context, so we have to log
      // back in as the new user before we can exercise the logout flow.
      await loginWithCredentials(page, logger, state.newUserUsername, state.newUserPassword);
      await logoutUser(page, logger);
    });
  });
});
