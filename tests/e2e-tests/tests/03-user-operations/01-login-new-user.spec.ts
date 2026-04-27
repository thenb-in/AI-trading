import { test } from '@playwright/test';
import { loginWithCredentials } from '../../actions/auth/user';
import { logoutUser } from '../../actions/auth/logout-user';
import { setupTest } from '../../helpers/setup';
import { loadState } from '../../helpers/sharedState';
import { isPageAccessible } from '../../helpers/navigator';

test.describe('User Operations - Login New User', () => {
  test('logout admin and login with new user', async ({ page }) => {
    const { logger, runTest } = setupTest(page, {
      timeout: 60000,
      captureApiResponses: true,
      apiUrlsToCapture: ['/api/', '/login'],
    });

    await runTest(async () => {
      const state = loadState();
      if (!state.newUserUsername || !state.newUserPassword) {
        throw new Error('New user credentials not found in shared state. Run signup tests first.');
      }

      // loginWithCredentials short-circuits if any user is already logged in,
      // so logout first to guarantee we re-auth as the new user.
      const isLoggedIn = await isPageAccessible(page, logger, '/admin/users');
      if (isLoggedIn) {
        await logoutUser(page, logger);
      }

      await loginWithCredentials(page, logger, state.newUserUsername, state.newUserPassword);
      logger.logStep(`Login as new user (${state.newUserUsername})`, 'completed');
    });
  });
});
