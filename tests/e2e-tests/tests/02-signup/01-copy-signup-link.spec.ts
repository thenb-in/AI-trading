import { test } from '@playwright/test';
import { setupTest } from '../../helpers/setup';
import { getAdminCredentials } from '../../helpers/testContext';
import { loginWithCredentials } from '../../actions/auth/user';
import { logoutUser } from '../../actions/auth/logout-user';
import { navigateTo } from '../../helpers/navigator';
import { getSignupLink } from '../../actions/ui_getters/sign-up-link';

test.describe('Signup - Copy Signup Link and Navigate to Signup URL', () => {
  test('copy signup link and navigate to signup URL', async ({ page }) => {
    const { logger, runTest } = setupTest(page, {
      timeout: 60000,
      captureApiResponses: true,
      apiUrlsToCapture: ['/api/', '/signup'],
    });

    await runTest(async () => {
      const { username: adminUsername, password: adminPassword } = getAdminCredentials();

      // Login as admin so the sign-up link button is reachable.
      await loginWithCredentials(page, logger, adminUsername, adminPassword);
      logger.logStep('Login as admin user', 'completed');

      // Copy the signup link from the user management page.
      const signupUrl = await getSignupLink(page, logger);
      logger.logStep('Get signup link', 'completed');

      // Log out so the signup page is reached as an anonymous visitor —
      // mirrors how a real invitee would use the link.
      await logoutUser(page, logger);
      logger.logStep('Logout user', 'completed');

      // Navigate to the copied link and confirm the signup form renders.
      await navigateTo(page, logger, signupUrl);
      await page.waitForSelector(
        'input[name="username"], input[id="username"]',
        { state: 'visible', timeout: 10000 }
      );
      logger.logStep(`Navigate to signup URL and confirm form visible: ${signupUrl}`, 'completed');
    });
  });
});
