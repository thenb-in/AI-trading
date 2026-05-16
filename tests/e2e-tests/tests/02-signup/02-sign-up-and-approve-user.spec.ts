import { test } from '@playwright/test';
import { approveUser } from '../../actions/auth/approve-user';
import { setupTest } from '../../helpers/setup';
import { getAdminCredentials, getTestUserCredentials } from '../../helpers/testContext';
import { loginWithCredentials } from '../../actions/auth/user';
import { getSignupLink } from '../../actions/ui_getters/sign-up-link';
import { logoutUser } from '../../actions/auth/logout-user';
import { navigateTo } from '../../helpers/navigator';
import { performSignup } from '../../actions/auth/sign-up';
import { saveState } from '../../helpers/sharedState';
import { User } from '../../interface/auth';

test.describe('Signup - Approve User', () => {
  test('sign up and approve the new user', async ({ page }) => {
    // Signup + admin re-login + multi-step approve modal regularly pushes
    // past the 60s default in playwright.config.ts. The `timeout` field on
    // setupTest options is a no-op (see helpers/setup.ts), so set it here.
    test.setTimeout(120_000);

    const { logger, runTest } = setupTest(page, {
      timeout: 60000,
      captureApiResponses: true,
      apiUrlsToCapture: ['/api/', '/signup'],
    });

    await runTest(async () => {
      const { username: adminUsername, password: adminPassword } = getAdminCredentials();
      await loginWithCredentials(page, logger, adminUsername, adminPassword);
      logger.logStep('Login as admin user', 'completed');
      
      // ========== STEP 2: Copy signup link ==========
      const signupUrl = await getSignupLink(page, logger);
      logger.logStep('Get signup link', 'completed');
      
          // ========== STEP 3: Logout ==========
      await logoutUser(page, logger);
      logger.logStep('Logout user', 'completed');

        // ========== STEP 4: Navigate to signup URL ==========
      await navigateTo(page, logger, signupUrl);
      logger.logStep(`Navigate to signup URL: ${signupUrl}`, 'completed');

      // ========== STEP 5: Perform signup ==========
      const testUser = getTestUserCredentials();
      await performSignup(page, logger, signupUrl, testUser as User);
      logger.logStep('Perform signup', 'completed');

      saveState({
        newUserUsername: testUser.username,
        newUserPassword: testUser.password,
      });

      // Approve the new user
      await approveUser(page, logger, testUser.username);
      logger.logStep('Approve user', 'completed');
    });
  });
});
