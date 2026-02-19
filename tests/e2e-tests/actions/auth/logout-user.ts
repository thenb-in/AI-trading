import { Page } from '@playwright/test';
import { TestLogger } from '../../helpers/logger';

/**
 * Helper function to logout the current user
 */
export async function logoutUser(
  page: Page,
  logger: TestLogger
): Promise<void> {
  try {
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    let logoutButtonFound = false;

    // Strategy 1: Find sidebar and get the last button (bottom-most button)
    try {
      const sidebarSelectors = [
        'aside',
        '[role="complementary"]',
        'nav[aria-label*="sidebar" i]',
        '[class*="sidebar" i]',
      ];

      for (const sidebarSelector of sidebarSelectors) {
        try {
          const sidebar = page.locator(sidebarSelector).first();
          const isVisible = await sidebar.isVisible({ timeout: 2000 }).catch(() => false);
          if (isVisible) {
            const sidebarButtons = await sidebar.locator('button').all();
            if (sidebarButtons.length > 0) {
              // Get the last button (lowest in sidebar)
              const lastButton = sidebarButtons[sidebarButtons.length - 1];
              await lastButton.scrollIntoViewIfNeeded();
              await page.waitForTimeout(500);
              await lastButton.click();
              logoutButtonFound = true;
              break;
            }
          }
        } catch {
          continue;
        }
      }
    } catch {
      // Continue to next strategy
    }

    // Strategy 2: Find any logout button
    if (!logoutButtonFound) {
      const logoutSelectors = [
        'button:has-text("Logout")',
        'button:has-text("Log out")',
        'button[aria-label*="logout" i]',
      ];

      for (const selector of logoutSelectors) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
            await button.scrollIntoViewIfNeeded();
            await button.click();
            logoutButtonFound = true;
            break;
          }
        } catch {
          continue;
        }
      }
    }

    if (!logoutButtonFound) {
      throw new Error('Could not find logout button');
    }

    // Wait for confirmation dialog to appear
    await page.waitForTimeout(1000);

    // Find and click the logout button in the confirmation dialog
    const confirmSelectors = [
      'button:has-text("Logout"):visible',
      'button:has-text("Log out"):visible',
      'button[type="button"]:has-text("Logout"):visible',
    ];

    let confirmButtonFound = false;
    for (const selector of confirmSelectors) {
      try {
        const confirmButton = page.locator(selector).last();
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
          confirmButtonFound = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!confirmButtonFound) {
      // Try to find any visible button that's not "Cancel"
      const dialogButtons = await page.locator('button:visible').all();
      for (const button of dialogButtons) {
        const text = await button.textContent();
        if (text && !text.toLowerCase().includes('cancel')) {
          await button.click();
          confirmButtonFound = true;
          break;
        }
      }
    }

    // Wait for logout to complete (redirect to login page)
    await page.waitForURL('**/', { timeout: 10000 }).catch(() => {
      // Continue even if URL doesn't match exactly
    });
    await page.waitForTimeout(2000);
    logger.logStep('Logout', 'completed');
  } catch (error: any) {
    const errorDetails = `Error: ${error.message}`;
    logger.logStep('Logout', 'error', errorDetails);
    throw error;
  }
}
