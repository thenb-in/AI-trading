import { Page } from '@playwright/test';
import { TestLogger } from '../../helpers/logger';
import { isPageAccessible } from '../../helpers/navigator';
import { logoutUser } from './logout-user';
import { loginWithCredentials } from './user';

/**
 * First-login forced password reset flow.
 *
 * Why this shape: the server's POST /auth/reset-password endpoint un-approves
 * the user (`is_approved = false`) when called without `isFirstLogin: true` or
 * a valid OTP — see startup/server/src/services/authService.js:resetPassword.
 * The frontend only sends `isFirstLogin: true` when ForgotPassword.jsx is
 * reached via React Router state from Login.jsx's first-login redirect, NOT
 * when the user clicks the public "Forgot Password?" link.
 *
 * So we drive the natural flow: log in with the old password, let the server
 * detect last_active=null and redirect to /forgot-password with the
 * isFirstLogin state set, then fill the new password. The user stays approved.
 *
 * Prerequisite: the user must have been approved with "User must reset
 * password on next login" CHECKED — see actions/auth/approve-user.ts.
 */
export async function resetPassword(
    page: Page,
    logger: TestLogger,
    username: string,
    oldPassword: string,
    // Must satisfy assertPasswordPolicy (startup/server/src/services/auth/passwordPolicy.js):
    // 8+ chars, one uppercase letter, one number.
    newPassword: string = 'Reset@123'
): Promise<void> {
    if (!username) {
        throw new Error('resetPassword requires a username');
    }
    if (!oldPassword) {
        throw new Error('resetPassword requires the old password to drive the first-login redirect');
    }

    // Any active session would short-circuit loginWithCredentials, so tear it down.
    if (await isPageAccessible(page, logger, '/admin/users')) {
        await logoutUser(page, logger);
    }

    // Login should redirect to /forgot-password with state.isFirstLogin=true.
    const result = await loginWithCredentials(page, logger, username, oldPassword);
    if (!result.needsPasswordReset) {
        throw new Error(
            `Expected first-login redirect to /forgot-password for "${username}", ` +
            `but login completed without it. Did approveUser leave "User must reset ` +
            `password on next login" checked?`
        );
    }

    // Fill the new password (the form prefills username from router state and
    // disables editing, so we don't refill it here).
    try {
        await page.waitForSelector('input[name="newPassword"], input[id="newPassword"]', {
            timeout: 10000,
        });
        await page.fill('input[name="newPassword"], input[id="newPassword"]', newPassword);
        await page.fill('input[name="confirmPassword"], input[id="confirmPassword"]', newPassword);
        logger.logStep('Fill new password and confirm password', 'completed');
    } catch (error: any) {
        logger.logStep('Fill new password and confirm password', 'error', `Error: ${error.message}`);
        throw error;
    }

    // Submit and assert the API response — this is what proves the reset
    // actually landed (and with isFirstLogin=true, that the user is still approved).
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

        logger.logStep('First-login password reset API success', 'completed', responseBody?.message || 'Password reset successful');

        // UI navigates back to login.
        await page.waitForURL('**/', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
    } catch (error: any) {
        logger.logStep('First-login password reset API success', 'error', `Error: ${error.message}`);
        throw error;
    }
}
