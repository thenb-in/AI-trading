import { Page } from "@playwright/test";
import { TestLogger } from "../../helpers/logger";
import { isPageAccessible, navigateTo } from "../../helpers/navigator";
import { LoginResult } from "../../interface/auth";

/**
 * Helper function to check if admin user already exists by attempting login
 * Returns true if login succeeds, false otherwise
 */
export async function checkIfAdminUserExists(
    page: Page,
    logger: TestLogger,
    username: string,
    password: string
): Promise<boolean> {
    try {
        await loginWithCredentials(page, logger, username, password);
        return true;
    } catch (error: any) {
        logger.logStep('Check if admin user exists', 'error', error.message);
        return false;
    }
}


/**
 * Helper function to login with credentials
 * @param page - Playwright page object
 * @param logger - TestLogger object
 * @param username - Username to login with
 * @param password - Password to login with
 * @returns LoginResult object
 */
export async function loginWithCredentials(page: Page, logger: TestLogger, username: string, password: string): Promise<LoginResult> {
    // Check current page state
    const isLoggedIn = await isPageAccessible(page, logger, '/admin/users');
    if (isLoggedIn) {
        // todo: check if the user is the same user as asked
        logger.logStep('Already logged in, navigating to user management', 'completed');
        return { needsPasswordReset: false, username: username, password: password } as LoginResult;
    }

    // Navigate to login page
    await navigateTo(page, logger, '/');
    // Fill login credentials
    await page.fill('input[name="username"], input[id="username"]', username);
    await page.fill('input[name="password"], input[id="password"]', password);
    await page.click('button[type="submit"]');

    // First-login users are intercepted by a "Setup Google Authenticator" dialog
    // before navigation. Login.jsx#handleTotpPopupClose still navigates to /admin
    // when the dialog is closed, so dismissing it is enough for tests.
    const totpDialog = page.getByRole('dialog', { name: 'Setup Google Authenticator' });
    try {
      await totpDialog.waitFor({ state: 'visible', timeout: 5000 });
      logger.logStep('TOTP setup dialog detected, dismissing', 'completed');
      await totpDialog.locator('button').first().click();
      await totpDialog.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // Dialog never appeared (TOTP already enabled, or login redirected straight to forgot-password)
    }

    // Wait for navigation
    await page.waitForTimeout(3000);
    const loginUrl = page.url();

    if (loginUrl.includes('/admin')) {
        logger.logStep('Login successful', 'completed');
        await page.goto('/admin/users', {
            waitUntil: 'networkidle',
            timeout: 30000,
        });
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);
        return { needsPasswordReset: false, username: username, password: password } as LoginResult;
    } else if (loginUrl.includes('/forgot-password')) {
        // Password reset required - this will be handled in next test
        logger.logStep('Login redirected to password reset', 'completed');
        return { needsPasswordReset: true, username, password } as LoginResult;
    } else {
        // Capture any visible error toast/message on the login page so the failure
        // mode is obvious instead of just "still on /".
        const visibleError = await page
            .locator('[role="alert"], .Toastify__toast, [class*="error" i], [class*="toast" i]')
            .first()
            .textContent({ timeout: 1000 })
            .catch(() => null);

        const isSupportUser = username === process.env.TEST_SADMIN_USERNAME;
        const hint = isSupportUser
            ? ` Verify TEST_SADMIN_USERNAME/TEST_SADMIN_PASSWORD in .env match the credentials in the database — a previous test run may have rotated the sadmin password.`
            : '';
        const errorDetails = `Login failed for "${username}" (still on ${loginUrl}).${visibleError ? ` UI error: ${visibleError.trim()}.` : ''}${hint}`;
        logger.logStep('Login failed', 'error', errorDetails);
        throw new Error(errorDetails);
    }
}
