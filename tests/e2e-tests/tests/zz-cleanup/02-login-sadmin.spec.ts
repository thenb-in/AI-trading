import { test } from '@playwright/test';
import { setupTest } from '../../helpers/setup';
import { getAdminCredentials } from '../../helpers/testContext';
import { loginWithCredentials } from '../../actions/auth/user';


test.describe('Auth - Login SAdmin', () => {
  test('login as sadmin (super-admin)', async ({ page }) => {

    // Setup test infrastructure (logger, message capture, error handling)
    const { logger, runTest } = setupTest(page, {
      timeout: 60000,
      captureApiResponses: true,
      apiUrlsToCapture: ['/api/', '/login'],
    });

    await runTest(async () => {
      const { username: sadminUsername, password: sadminPassword } = getAdminCredentials();
      await loginWithCredentials(page, logger, sadminUsername, sadminPassword);
      logger.logStep('Login as sadmin', 'completed');
    });
  });
});
