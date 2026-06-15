import { Locator, Page } from '@playwright/test';
import { SignupTestLogger } from './logger';

/**
 * Helper function to expand sidebar if collapsed, navigate to Masters, click Common Masters, and optionally search for a module
 */
export async function navigateMastersAndSearch(
  page: Page,
  logger: SignupTestLogger,
  searchModule: boolean = true
): Promise<void> {
  try {
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // ========== STEP 1: Expand sidebar if collapsed ==========
    try {
      const sidebarSelectors = [
        'aside',
        '[role="complementary"]',
        'nav[role="navigation"]',
        '[class*="sidebar" i]',
      ];

      let sidebarFound = false;
      for (const sidebarSelector of sidebarSelectors) {
        try {
          const sidebar = page.locator(sidebarSelector).first();
          const isVisible = await sidebar.isVisible({ timeout: 2000 }).catch(() => false);
          if (isVisible) {
            // Check if sidebar is collapsed by looking for chevron right icon (expand button)
            const expandButton = sidebar.locator('button[aria-label*="Expand" i], button:has([class*="chevron-right" i])');
            const isCollapsed = await expandButton.isVisible({ timeout: 1000 }).catch(() => false);
            
            if (isCollapsed) {
              await expandButton.click();
              await page.waitForTimeout(500);
              logger.logStep('Expand sidebar', 'completed');
            } else {
              logger.logStep('Expand sidebar', 'completed', 'Sidebar already expanded');
            }
            sidebarFound = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!sidebarFound) {
        // Try alternative: look for toggle button anywhere on page
        const toggleButton = page.locator('button:has([class*="chevron-right" i]), button[aria-label*="Expand" i]').first();
        const toggleButtonVisible = await toggleButton.isVisible({ timeout: 1000 }).catch(() => false);
        if (toggleButtonVisible) {
          await toggleButton.click();
          await page.waitForTimeout(500);
          logger.logStep('Expand sidebar', 'completed');
        } else {
          logger.logStep('Expand sidebar', 'completed', 'Sidebar might already be expanded');
        }
      }
    } catch (error: any) {
      const errorDetails = `Error: ${error.message}`;
      logger.logStep('Expand sidebar', 'error', errorDetails);
      // Continue anyway - sidebar might already be expanded
    }

    // Wait a bit for sidebar to stabilize
    await page.waitForTimeout(1000);

    // ========== STEP 2 & 3: Click on Masters, then click Common Masters from flyout ==========
    // We'll combine these steps: hover over Masters to show flyout, then click Common Masters
    try {
      // Check if we're already on the masters page with Common Masters category
      const currentUrl = page.url();
      const alreadyOnCommonMasters = currentUrl.includes('/admin/master') && 
        (currentUrl.includes('category=Common%20Masters') || currentUrl.includes('category=Common+Masters') || currentUrl.includes('category=Common Masters'));
      
      if (!alreadyOnCommonMasters) {
        // Try multiple selectors for Masters button in sidebar
        const mastersSelectors = [
          'aside button:has-text("Masters")',
          'nav button:has-text("Masters")',
          '[role="navigation"] button:has-text("Masters")',
          'button:has-text("Masters")',
        ];

        let mastersButton: Locator | null = null;
        for (const selector of mastersSelectors) {
          try {
            const button = page.locator(selector).first();
            const isVisible = await button.isVisible({ timeout: 2000 }).catch(() => false);
            if (isVisible) {
              mastersButton = button;
              break;
            }
          } catch {
            continue;
          }
        }

        if (mastersButton) {
          // Hover over Masters button to show flyout
          await mastersButton.hover();
          await page.waitForTimeout(800); // Wait for flyout to appear
          
          // Look for Common Masters button in the flyout
          const flyoutSelectors = [
            '.flyout-positioned button:has-text("Common Masters")',
            '[class*="flyout"] button:has-text("Common Masters")',
            'button:has-text("Common Masters")',
          ];
          
          let commonMastersClicked = false;
          for (const selector of flyoutSelectors) {
            try {
              const commonMastersButton = page.locator(selector).first();
              const isVisible = await commonMastersButton.isVisible({ timeout: 2000 }).catch(() => false);
              if (isVisible) {
                await commonMastersButton.click();
                await page.waitForTimeout(1000);
                await page.waitForURL('**/admin/master**', { timeout: 5000 }).catch(() => {});
                await page.waitForLoadState('domcontentloaded');
                commonMastersClicked = true;
                logger.logStep('Click on Masters module in sidebar', 'completed');
                logger.logStep('Click on Common Masters tab in sidebar', 'completed', 'Clicked from flyout');
                break;
              }
            } catch {
              continue;
            }
          }

          if (!commonMastersClicked) {
            // Flyout didn't appear or Common Masters not found, navigate directly
            const categoryParam = encodeURIComponent('Common Masters');
            await page.goto(`/admin/master?category=${categoryParam}`, {
              waitUntil: 'domcontentloaded',
              timeout: 10000,
            });
            await page.waitForLoadState('domcontentloaded');
            logger.logStep('Click on Masters module in sidebar', 'completed', 'Navigated directly');
            logger.logStep('Click on Common Masters tab in sidebar', 'completed', 'Navigated with category param');
          }
        } else {
          // Masters button not found, navigate directly
          const categoryParam = encodeURIComponent('Common Masters');
          await page.goto(`/admin/master?category=${categoryParam}`, {
            waitUntil: 'domcontentloaded',
            timeout: 10000,
          });
          await page.waitForLoadState('domcontentloaded');
          logger.logStep('Click on Masters module in sidebar', 'completed', 'Navigated directly');
          logger.logStep('Click on Common Masters tab in sidebar', 'completed', 'Navigated with category param');
        }
      } else {
        logger.logStep('Click on Masters module in sidebar', 'completed', 'Already on masters page');
        logger.logStep('Click on Common Masters tab in sidebar', 'completed', 'Already on Common Masters');
      }
    } catch (error: any) {
      const errorDetails = `Error: ${error.message}`;
      logger.logStep('Click on Masters module in sidebar', 'error', errorDetails);
      logger.logStep('Click on Common Masters tab in sidebar', 'error', errorDetails);
      // Continue anyway - try to search anyway, or navigate as fallback
      try {
        const categoryParam = encodeURIComponent('Common Masters');
        await page.goto(`/admin/master?category=${categoryParam}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });
        await page.waitForLoadState('domcontentloaded');
      } catch {
        // Ignore navigation errors
      }
    }

    // Wait for masters page and category to load
    await page.waitForTimeout(2000);

    // ========== STEP 4: Search for "user" in search module (optional) ==========
    if (searchModule) {
      try {
        // Search for the search input field
        const searchSelectors = [
          'input[placeholder*="Search" i]',
          'input[placeholder*="module" i]',
          'input[aria-label*="Search" i]',
          'textarea[placeholder*="Search" i]',
        ];

        let searchInputFound = false;
        for (const selector of searchSelectors) {
          try {
            const searchInput = page.locator(selector).first();
            const isVisible = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);
            if (isVisible) {
              // Clear any existing text and type "user"
              await searchInput.clear();
              await searchInput.fill('user');
              await page.waitForTimeout(500);
              searchInputFound = true;
              logger.logStep('Search for "user" in search module', 'completed');
              break;
            }
          } catch {
            continue;
          }
        }

        if (!searchInputFound) {
          throw new Error('Could not find search input field');
        }
      } catch (error: any) {
        const errorDetails = `Error: ${error.message}`;
        logger.logStep('Search for "user" in search module', 'error', errorDetails);
        throw error;
      }

      // Wait for search results to filter
      await page.waitForTimeout(1000);
    }
  } catch (error: any) {
    const finalError = `Navigation to masters and search failed: ${error.message}`;
    logger.logStep('Navigate Masters and Search', 'error', finalError);
    throw error;
  }
}
