import { test } from '@playwright/test';
import { setupTest } from '../../helpers/setup';
import { logoutUser } from '../../actions/auth/logout-user';

test.describe('Cleanup - Logout New User', () => {
  test('logout the new user account', async ({ page }) => {
    const { logger, runTest } = setupTest(page, {
      timeout: 60000,
      captureApiResponses: true,
      apiUrlsToCapture: ['/api/'],
    });

    await runTest(async () => {
      await logoutUser(page, logger);
    });
  });
});
