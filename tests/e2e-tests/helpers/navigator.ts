import { Page } from "@playwright/test";
import { TestLogger } from "./logger";

function toRelativeUrl(inputUrl: string): string {
    if (!inputUrl) return inputUrl;
    if (inputUrl.startsWith('/')) return inputUrl;

    try {
        // Provide a dummy base so relative URLs like "admin" or "/admin" can be parsed.
        const parsed = new URL(inputUrl, 'http://local');
        // Only return relative for normal web URLs; keep special schemes as-is.
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return inputUrl;
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return inputUrl;
    }
}

export async function navigateTo(page: Page, logger: TestLogger, url: string, strict: boolean = true): Promise<string> {
    const expectedRelativeUrl = toRelativeUrl(url);
    const currentRelativeUrl = toRelativeUrl(page.url());
    if (currentRelativeUrl === expectedRelativeUrl) {
        logger.logStep(`Already on ${expectedRelativeUrl}`, 'completed');
        return currentRelativeUrl;
    }
    try {
        await page.goto(url, {
            waitUntil: 'networkidle',
            timeout: 30000,
        });
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);
        const finalRelativeUrl = toRelativeUrl(page.url());

        if (strict && finalRelativeUrl !== expectedRelativeUrl) {
            throw new Error(`Navigated to ${finalRelativeUrl} instead of ${expectedRelativeUrl}`);
        }

        logger.logStep(`Navigated to ${expectedRelativeUrl}`, 'completed');
        return finalRelativeUrl;
    } catch (error: any) {
        logger.logStep(`Error navigating to ${expectedRelativeUrl} ${error.message}`, 'error');
        throw error;
    }
}

export async function isPageAccessible(page: Page, logger: TestLogger, url: string): Promise<boolean> {
    const expectedRelativeUrl = toRelativeUrl(url);
    const finalRelativeUrl = await navigateTo(page, logger, url, false);
    return finalRelativeUrl === expectedRelativeUrl;
}
