import { test } from '@playwright/test';
import { setupTest } from '../../helpers/setup';
import { getAdminCredentials, getTestUserCredentials } from '../../helpers/testContext';
import { deleteUser } from '../../helpers/deleteUser';
import { clearState } from '../../helpers/sharedState';

test.describe('Cleanup - Delete User', () => {
  test('delete the automated user account', async ({ page }) => {
    const { logger, runTest } = setupTest(page, {
      timeout: 120000,
      captureApiResponses: true,
      apiUrlsToCapture: ['/api/'],
    });

    await runTest(async () => {
      const { username: adminUsername, password: adminPassword } = getAdminCredentials();
      const testUser = getTestUserCredentials();
      await deleteUser(page, logger, adminUsername, adminPassword, testUser.username);
      clearState();
    });
  });
});
