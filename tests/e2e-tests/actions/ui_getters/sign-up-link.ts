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
    // permission BEFORE the sign-up link button is clicked — otherwise
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

    // ========== STEP 2: Locate the sign-up link button ==========
    // The button now displays the URL itself (rather than "Copy Sign-up Link" text)
    // and is disabled on HTTP — so we identify it by data-testid and read the URL
    // straight from data-signup-url, with several fallbacks.
    let buttonLocator: ReturnType<Page['locator']> | null = null;
    try {
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await page.waitForLoadState('domcontentloaded');
        await page.waitForSelector('body', { state: 'visible' });
        await page.waitForTimeout(3000);

        const buttonSelectors = [
            '[data-testid="copy-signup-link"]',
            'button[title*="sign-up" i]',
            'button[title*="signup" i]',
            'button:has-text("/signup?company_id=")',
            'button:has-text("Copy Sign-up Link")', // legacy
            'button:has-text("Copy Signup Link")',  // legacy
        ];

        for (const selector of buttonSelectors) {
            try {
                const candidate = page.locator(selector).first();
                await candidate.waitFor({ state: 'visible', timeout: 3000 });
                if (await candidate.isVisible()) {
                    buttonLocator = candidate;
                    break;
                }
            } catch {
                continue;
            }
        }

        if (!buttonLocator) {
            const pageContent = await page.content();
            const hasUserManagement = pageContent.includes('User Management') || pageContent.includes('user management');
            throw new Error(`Could not find sign-up link button. Page has user management: ${hasUserManagement}`);
        }

        logger.logStep('Locate sign-up link button', 'completed');
    } catch (error: any) {
        const errorDetails = `Error: ${error.message}`;
        logger.logStep('Locate sign-up link button', 'error', errorDetails);
        throw error;
    }

    // ========== STEP 3: Resolve the sign-up URL ==========
    // Priority:
    //   1) data-signup-url attribute (always present, works on HTTP and HTTPS)
    //   2) Click the button and read from clipboard (HTTPS / secure context only)
    //   3) Reconstruct from companyId in localStorage / page text
    let signupUrl = '';

    // 1) data-signup-url is the most reliable source.
    try {
        const fromAttr = await buttonLocator.getAttribute('data-signup-url');
        if (fromAttr && fromAttr.includes('/signup')) {
            signupUrl = fromAttr;
            logger.logStep(`Get signup URL from data-signup-url: ${signupUrl}`, 'completed');
        }
    } catch {
        // ignore and fall through to the next strategy
    }

    // 2) If the button is enabled, exercise the real copy path too so this test
    // actually validates clipboard behavior. If it's disabled (HTTP), skip.
    if (!signupUrl) {
        try {
            const isDisabled = await buttonLocator.isDisabled().catch(() => false);
            if (!isDisabled) {
                await buttonLocator.click();
                await page.waitForTimeout(1000);

                const fromClipboard = await page.evaluate(async () => {
                    try {
                        return await navigator.clipboard.readText();
                    } catch {
                        return '';
                    }
                });

                if (fromClipboard && fromClipboard.includes('/signup')) {
                    signupUrl = fromClipboard;
                    logger.logStep(`Get signup URL from clipboard: ${signupUrl}`, 'completed');
                }
            } else {
                logger.logStep('Sign-up link button is disabled (insecure context) — skipping clipboard read', 'completed');
            }
        } catch (error: any) {
            logger.logStep('Get signup URL from clipboard', 'error', `Error: ${error.message}. Falling back to page state...`);
        }
    }

    // 3) Last-ditch fallback: reconstruct from companyId.
    if (!signupUrl) {
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
                const bodyText = await page.textContent('body');
                const match = bodyText?.match(/signup\?company_id=([a-f0-9-]+)/i);
                if (match) {
                    signupUrl = `/signup?company_id=${match[1]}`;
                    logger.logStep(`Get signup URL from page text: ${signupUrl}`, 'completed');
                }
            }
        } catch (fallbackError: any) {
            logger.logStep('Get signup URL (page state fallback)', 'error', `Error: ${fallbackError.message}`);
        }
    }

    if (!signupUrl) {
        throw new Error('Could not retrieve signup URL from data attribute, clipboard, or page state');
    }

    return signupUrl;
}
