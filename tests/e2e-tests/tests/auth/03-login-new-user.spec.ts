import { test } from '@playwright/test';
import { setupTest } from '../../helpers/setup';
import { getAdminCredentials } from '../../helpers/testContext';
import { loginWithCredentials } from '../../actions/auth/user';


test.describe('Auth - Login Admin User', () => {
  test('login as admin user', async ({ page }) => {

    // Setup test infrastructure (logger, message capture, error handling)
    const { logger, runTest } = setupTest(page, {
      timeout: 60000,
      captureApiResponses: true,
      apiUrlsToCapture: ['/api/', '/login'],
    });

    await runTest(async () => {
      const { username: adminUsername, password: adminPassword } = getAdminCredentials();
      await loginWithCredentials(page, logger, adminUsername, adminPassword);
      logger.logStep('Login as admin user', 'completed');
    });
  });
});
