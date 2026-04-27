import { TestLogger } from "../../helpers/logger";
import { Page } from "@playwright/test";

/**
 * Helper function to navigate to user management, copy signup link, logout, then open new tab
 * Returns the signup URL
 */
export async function getSignupLink(
    page: Page,
    logger: TestLogger
): Promise<string> {
    // The clipboard handler runs at click time, so the page must hold the
    // permission BEFORE the user clicks "Copy Sign-up Link" — otherwise
    // navigator.clipboard.writeText() silently fails and there's nothing for
    // the test to read back.
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // ========== STEP 1: Ensure we're on user management page ==========
    try {
        // Check if we're already on the user management page
        const currentUrl = page.url();
        if (!currentUrl.includes('/admin/users')) {
            // Navigate to user management (we should already be logged in and on an admin page)
            await page.goto('/admin/users', {
                waitUntil: 'networkidle',
                timeout: 30000,
            });
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(2000); // Additional wait for React to render
        } else {
            // Already on the page, just wait for it to be fully loaded
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(2000);
        }
        logger.logStep('Navigate to user management', 'completed');
    } catch (error: any) {
        const errorDetails = `Error: ${error.message}`;
        logger.logStep('Navigate to user management', 'error', errorDetails);
        throw error;
    }

    // ========== STEP 2: Wait for copy signup link button and click it ==========
    try {
        // Wait for the page to be fully loaded and interactive
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await page.waitForLoadState('domcontentloaded');

        // Wait for any loading indicators to disappear
        await page.waitForSelector('body', { state: 'visible' });
        await page.waitForTimeout(3000); // Additional wait for React to render

        // Try multiple selectors for the copy signup link button
        const buttonSelectors = [
            'button:has-text("Copy Sign-up Link")',
            'button:has-text("Copy Signup Link")',
            'button:has-text("Copy Sign-up")',
            'button:has-text("Copy Signup")',
            'button[title*="signup" i]',
            'button[title*="sign-up" i]',
            'button[title*="Copy sign-up" i]',
        ];

        let buttonFound = false;
        for (const selector of buttonSelectors) {
            try {
                const button = page.locator(selector).first();
                await button.waitFor({ state: 'visible', timeout: 3000 });
                if (await button.isVisible()) {
                    await button.click();
                    buttonFound = true;
                    break;
                }
            } catch {
                continue;
            }
        }

        if (!buttonFound) {
            // Try to find any button with "Copy" and "Link" in the text
            const allButtons = await page.locator('button').all();
            for (const button of allButtons) {
                try {
                    const text = await button.textContent();
                    if (text && (text.includes('Copy') && (text.includes('Link') || text.includes('Signup') || text.includes('Sign-up')))) {
                        await button.waitFor({ state: 'visible', timeout: 2000 });
                        await button.click();
                        buttonFound = true;
                        break;
                    }
                } catch {
                    continue;
                }
            }
        }

        if (!buttonFound) {
            // Last resort: try to get page content for debugging
            const pageContent = await page.content();
            const hasUserManagement = pageContent.includes('User Management') || pageContent.includes('user management');
            throw new Error(`Could not find copy signup link button. Page has user management: ${hasUserManagement}`);
        }

        // Wait for toast message to appear
        await page.waitForTimeout(2000);
        logger.logStep('Click copy signup link button', 'completed');
    } catch (error: any) {
        const errorDetails = `Error: ${error.message}`;
        logger.logStep('Click copy signup link button', 'error', errorDetails);
        throw error;
    }

    // ========== STEP 3: Get signup URL from clipboard ==========
    let signupUrl = '';
    try {
        // Grant clipboard permissions
        const context = page.context();
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        // Wait a bit for clipboard to be populated
        await page.waitForTimeout(1000);

        // Get clipboard content
        signupUrl = await page.evaluate(async () => {
            return await navigator.clipboard.readText();
        });

        // If clipboard doesn't work, try to extract from the page context
        if (!signupUrl || !signupUrl.includes('/signup')) {
            // Try to get company ID from the page and construct URL
            const companyId = await page.evaluate(() => {
                // Try to get from userData in context or localStorage
                try {
                    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                    return userData?.companyId || userData?.company?.id || '';
                } catch {
                    return '';
                }
            });

            if (companyId) {
                signupUrl = `/signup?company_id=${companyId}`;
            } else {
                // Fallback: extract from toast message or page content
                const urlMatch = await page.textContent('body');
                const match = urlMatch?.match(/signup\?company_id=([a-f0-9-]+)/i);
                if (match) {
                    signupUrl = `/signup?company_id=${match[1]}`;
                }
            }
        }

        if (!signupUrl) {
            throw new Error('Could not retrieve signup URL from clipboard or page');
        }

        logger.logStep(`Get signup URL from clipboard: ${signupUrl}`, 'completed');
    } catch (error: any) {
        const errorDetails = `Error: ${error.message}. Trying alternative method...`;
        logger.logStep('Get signup URL from clipboard', 'error', errorDetails);

        // Alternative: Try to get company ID from API or page state
        try {
            const companyId = await page.evaluate(() => {
                try {
                    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                    return userData?.companyId || userData?.company?.id || '';
                } catch {
                    return '';
                }
            });

            if (companyId) {
                signupUrl = `/signup?company_id=${companyId}`;
                logger.logStep(`Get signup URL from page state: ${signupUrl}`, 'completed');
            } else {
                throw new Error('Could not retrieve company ID from page state');
            }
        } catch (fallbackError: any) {
            const finalError = `Error: ${fallbackError.message}`;
            logger.logStep('Get signup URL (fallback)', 'error', finalError);
            throw fallbackError;
        }
    }

    return signupUrl;
}
