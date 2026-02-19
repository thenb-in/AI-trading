import { Page } from '@playwright/test';
import { TestLogger } from '../../helpers/logger';
import { getTestUserCredentials } from '../../helpers/testContext';
import { navigateTo } from '../../helpers/navigator';
import { User } from '../../interface/auth';

/**
 * Helper function to perform signup with provided signup URL
 */
export async function performSignup(
    page: Page,
    logger: TestLogger,
    signupUrl: string,
    testUser: User,
): Promise<void> {
    // ========== STEP 1: Navigate to signup page ==========
    navigateTo(page, logger, signupUrl);

    await page.waitForSelector('input[type="text"], input[name*="name"], input[placeholder*="name" i], input[id*="name" i]', { state: 'visible' });
    logger.logStep('Wait for signup form to be visible', 'completed');

    // ========== STEP 3: Fill full name field ==========
    await page.fill('input[name="name"], input[id="name"]', testUser.username);
    logger.logStep(`Fill full name field with "${testUser.username}"`, 'completed');

    // ========== STEP 4: Fill username field ==========
    await page.fill('input[name="username"], input[id="username"]', testUser.username);
    logger.logStep(`Fill username field with "${testUser.username}"`, 'completed');

    // ========== STEP 5: Fill phone number field ==========
    await page.fill('input[name="phone"], input[id="phone"]', testUser.phone);
    logger.logStep(`Fill phone number field with "${testUser.phone}"`, 'completed');

    // ========== STEP 6: Fill password field ==========
    await page.fill('input[name="password"], input[id="password"]', testUser.password);
    logger.logStep('Fill password field', 'completed');

    // ========== STEP 7: Fill confirm password field ==========
    await page.fill('input[name="confirmPassword"], input[id="confirmPassword"]', testUser.password);
    logger.logStep('Fill confirm password field', 'completed');

    // ========== STEP 8: Submit the form ==========
    await page.waitForSelector('button[type="submit"]', { state: 'visible', timeout: 5000 });
    await page.click('button[type="submit"]');
    logger.logStep('Submit the signup form', 'completed');

    // ========== STEP 9: Wait for response and capture toast messages ==========
    // Wait for API response
    await page.waitForResponse(
        (response) => response.url().includes('/api/') && response.status() !== 0,
        { timeout: 10000 }
    ).catch(() => {
        // Continue even if no response is captured
    });

    // Wait a bit for toast to appear
    await page.waitForTimeout(2000);

    // Capture react-toastify toast messages
    const toastSelectors = [
        '[id*="toast"]',
        '.Toastify__toast',
        '[class*="Toastify"]',
        '[role="alert"]',
        '.toast',
        '.notification',
    ];

    // todo: are these supposed to be new variables?
    let toastMessages: string[] = [];
    let consoleMessages: string[] = [];

    for (const selector of toastSelectors) {
        try {
            const toasts = await page.locator(selector).all();
            for (const toast of toasts) {
                const text = await toast.textContent();
                if (text && text.trim()) {
                    toastMessages.push(`Toast: ${text.trim()}`);
                }
            }
        } catch {
            continue;
        }
    }

    // Also check for error messages in the form
    try {
        const errorElement = await page.locator('[class*="error"], [class*="Error"]').first();
        if (await errorElement.isVisible({ timeout: 1000 })) {
            const errorText = await errorElement.textContent();
            if (errorText && errorText.trim()) {
                toastMessages.push(`Form Error: ${errorText.trim()}`);
            }
        }
    } catch {
        // No error element found, that's okay
    }

    // Check if there were any errors (toast messages with error content)
    const hasErrors = toastMessages.some(msg =>
        msg.toLowerCase().includes('error') ||
        msg.toLowerCase().includes('failed') ||
        msg.toLowerCase().includes('validation')
    );

    if (hasErrors) {
        const errorDetails = `Console: ${consoleMessages.filter(m => m.includes('ERROR') || m.includes('error')).slice(-5).join('; ')}. Toast: ${toastMessages.join('; ')}`;
        logger.logStep('Wait for signup response and capture toast messages', 'error', errorDetails);
    } else {
        logger.logStep('Wait for signup response and capture toast messages', 'completed');
    }
}
