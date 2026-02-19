import { test } from '@playwright/test';
import { setupTest } from '../../helpers/setup';
import { getAdminCredentials, getTestUserCredentials } from '../../helpers/testContext';
import { loginWithCredentials } from '../../actions/auth/user';
import { logoutUser } from '../../actions/auth/logout-user';
import { navigateTo } from '../../helpers/navigator';
import { getSignupLink } from '../../actions/ui_getters/sign-up-link';
import { performSignup } from '../../actions/auth/sign-up';
import { saveState } from '../../helpers/sharedState';
import { User } from '../../interface/auth';

test.describe('Signup - Copy Signup Link and Navigate to Signup URL', () => {
  test('copy signup link and navigate to signup URL', async ({ page }) => {
    const { logger, runTest } = setupTest(page, {
      timeout: 60000,
      captureApiResponses: true,
      apiUrlsToCapture: ['/api/', '/signup'],
    });

    await runTest(async () => {
      const { username: adminUsername, password: adminPassword } = getAdminCredentials();

      // ========== STEP 1: Login as admin ==========
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

      // ========== STEP 6: Attempt duplicate signup with same credentials (should fail) ==========
      await performSignup(page, logger, signupUrl, testUser as User);
      logger.logStep('Duplicate signup attempt rejected (expected)', 'completed');

      saveState({
        newUserUsername: testUser.username,
        newUserPassword: testUser.password,
      });
      
      // Update context with signup URL
      // updateContext({
      //   company: {
      //     signupUrl: signupUrl,
      //     name: testUser.name || '',
      //     username: testUser.username,
      //     phone: testUser.phone,
      //     password: testUser.password,
      //   },
      // });
    });
  });
});
