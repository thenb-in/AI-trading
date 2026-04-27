import { test } from '@playwright/test';
import { getAdminCredentials } from '../../helpers/testContext';
import { setupTest } from '../../helpers/setup';
import { checkIfAdminUserExists } from '../../actions/auth/user';

test.describe('Auth - Check Admin Exists', () => {
  test('check if admin user already exists', async ({ page }) => {
    const { logger, runTest } = setupTest(page, {
      timeout: 60000,
      captureApiResponses: false,
      apiUrlsToCapture: [],
    });

    await runTest(async () => {
      const { username: adminUsername, password: adminPassword } = getAdminCredentials();
      
      // Check if admin user already exists
      const adminExists = await checkIfAdminUserExists(page, logger, adminUsername, adminPassword);
      if (adminExists) {
        logger.logStep('Admin user exists', 'completed');
      } else {
        logger.logStep('Admin user does not exist', 'error');
      }
    });
  });
});
