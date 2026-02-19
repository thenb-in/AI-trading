import { Page } from '@playwright/test';
import { TestLogger } from '../../helpers/logger';
import { navigateTo } from '../../helpers/navigator';

/**
 * Password reset flow via "Forgot Password?" link from the login page.
 *
 * Steps:
 * - Try to go to /admin/users (will redirect to / if not logged in)
 * - Click "Forgot Password?" on the login page
 * - Fill username from env
 * - Set new password (default: 123123)
 * - Submit and assert API response is successful (test passes/fails on this)
 */
export async function resetPassword(
    page: Page,
    logger: TestLogger,
    newPassword: string = '123123'
): Promise<void> {
    const username = process.env.TEST_ADMIN_USERNAME || process.env.E2E_ADMIN_USERNAME;
    if (!username) {
        throw new Error('Missing env username: set TEST_ADMIN_USERNAME (or E2E_ADMIN_USERNAME)');
    }

    // Navigate to a protected page to force redirect to login when not authenticated.
    await navigateTo(page, logger, '/admin/users', false);

    // If we ended up on /admin already, we're logged in; logout flow is handled elsewhere.
    // For password reset we want the login page so the "Forgot Password?" entry point exists.
    if (!page.url().includes('/forgot-password') && !page.url().includes('/admin')) {
        // Best-effort: we should be on login page now.
    }

    // Click "Forgot Password?" on the login page.
    try {
        const forgotSelectors = [
            'text=/^Forgot Password\\??$/i',
            'a:has-text("Forgot Password")',
            'button:has-text("Forgot Password")',
            '[role="link"]:has-text("Forgot Password")',
            '[role="button"]:has-text("Forgot Password")',
        ];

        let clicked = false;
        for (const selector of forgotSelectors) {
            try {
                const el = page.locator(selector).first();
                if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
                    await el.click();
                    clicked = true;
                    break;
                }
            } catch {
                continue;
            }
        }

        if (!clicked) {
            // Fallback: navigate directly (in case UI text differs).
            await navigateTo(page, logger, '/forgot-password', false);
        }

        await page.waitForURL('**/forgot-password**', { timeout: 10000 }).catch(() => {});
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);
        logger.logStep('Navigate to forgot password page', 'completed');
    } catch (error: any) {
        logger.logStep('Navigate to forgot password page', 'error', `Error: ${error.message}`);
        throw error;
    }

    // Fill username (existing user details from env).
    try {
        const usernameSelectors = [
            'input[name="username"]',
            'input[id="username"]',
            'input[placeholder*="user" i]',
        ];
        let usernameFilled = false;
        for (const selector of usernameSelectors) {
            const input = page.locator(selector).first();
            if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
                await input.fill(username);
                usernameFilled = true;
                break;
            }
        }
        if (!usernameFilled) throw new Error('Could not find username field on forgot password page');
        logger.logStep('Fill forgot password username', 'completed');
    } catch (error: any) {
        logger.logStep('Fill forgot password username', 'error', `Error: ${error.message}`);
        throw error;
    }

    // Fill new password and confirm password
    try {
        await page.waitForSelector('input[name="newPassword"], input[id="newPassword"]', {
            timeout: 10000,
        });
        await page.fill('input[name="newPassword"], input[id="newPassword"]', newPassword);
        await page.fill('input[name="confirmPassword"], input[id="confirmPassword"]', newPassword);
        logger.logStep('Fill new password and confirm password', 'completed');
    } catch (error: any) {
        const errorDetails = `Error: ${error.message}`;
        logger.logStep('Fill new password and confirm password', 'error', errorDetails);
        throw error;
    }

    // Submit password reset and assert API response success
    try {
        const submit = page.locator('button[type="submit"], button:has-text("Reset"), button:has-text("Submit")').first();
        const response = await Promise.all([
            page.waitForResponse((r) => {
                const url = r.url();
                const method = r.request().method();
                return method === 'POST' && url.includes('/auth/reset-password');
            }, { timeout: 15000 }),
            submit.click(),
        ]).then(([r]) => r);

        const responseBody = await response.json().catch(() => null);
        if (!response.ok()) {
            const details = responseBody?.error || JSON.stringify(responseBody) || `HTTP ${response.status()}`;
            throw new Error(`Reset password API failed: ${details}`);
        }

        logger.logStep('Reset password API success', 'completed', responseBody?.message || 'Password reset successful');

        // UI usually navigates back to login; don't hard-fail if it doesn't.
        await page.waitForURL('**/', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
    } catch (error: any) {
        const errorDetails = `Error: ${error.message}`;
        logger.logStep('Reset password API success', 'error', errorDetails);
        throw error;
    }
}
