import { test } from '@playwright/test';
import { navigateMastersAndSearchEmployee } from '../../helpers/navigateMastersAndSearch';
import { setupTest } from '../../helpers/setup';
import { getAdminCredentials } from '../../helpers/testContext';
import { loginWithCredentials } from '../../actions/auth/user';

test.describe('Master Operations - Navigate Masters', () => {
  test('navigate to masters and open common masters', async ({ page }) => {
    const { logger, runTest } = setupTest(page, {
      timeout: 60000,
      captureApiResponses: true,
      apiUrlsToCapture: ['/api/', '/master'],
    });
    
    await runTest(async () => {
      const { username: adminUsername, password: adminPassword } = getAdminCredentials();
      await loginWithCredentials(page, logger, adminUsername, adminPassword);

      // Navigate to Masters and click Common Masters (without searching for employee)
      await navigateMastersAndSearchEmployee(page, logger, false);
    });
  });
});
