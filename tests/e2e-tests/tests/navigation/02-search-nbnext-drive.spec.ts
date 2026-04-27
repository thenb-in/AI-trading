import { test } from '@playwright/test';
import { setupTest } from '../../helpers/setup';
import { getAdminCredentials } from '../../helpers/testContext';
import { loginWithCredentials } from '../../actions/auth/user';

test.describe('Master Operations - Search NBnext Drive', () => {
  test('navigate back to common masters and search for NBnext Drive', async ({ page }) => {
    const { logger, runTest } = setupTest(page, {
      timeout: 60000,
      captureApiResponses: true,
      apiUrlsToCapture: ['/api/search'],
    });

    await runTest(async () => {
      const { username: adminUsername, password: adminPassword } = getAdminCredentials();
      await loginWithCredentials(page, logger, adminUsername, adminPassword);

      // ========== STEP 1: Navigate back to Common Masters tab in sidebar ==========
      try {
        const mastersSelectors = [
          'aside button:has-text("Masters")',
          'nav button:has-text("Masters")',
          '[role="navigation"] button:has-text("Masters")',
          'button:has-text("Masters")',
        ];

        let navigatedViaSidebar = false;
        for (const selector of mastersSelectors) {
          try {
            const mastersButton = page.locator(selector).first();
            const isVisible = await mastersButton.isVisible({ timeout: 2000 }).catch(() => false);
            if (isVisible) {
              // Hover over Masters button to show flyout
              await mastersButton.hover();
              await page.waitForTimeout(800);
              
              // Look for Common Masters button in the flyout
              const commonMastersButton = page.locator('.flyout-positioned button:has-text("Common Masters"), [class*="flyout"] button:has-text("Common Masters")').first();
              const isCommonMastersVisible = await commonMastersButton.isVisible({ timeout: 2000 }).catch(() => false);
              
              if (isCommonMastersVisible) {
                await commonMastersButton.click();
                await page.waitForURL('**/admin/master**', { timeout: 5000 }).catch(() => {});
                await page.waitForLoadState('domcontentloaded');
                navigatedViaSidebar = true;
                logger.logStep('Navigate back to Common Masters tab in sidebar', 'completed', 'Navigated via sidebar flyout');
                break;
              }
            }
          } catch {
            continue;
          }
        }

        // Fallback: navigate directly via URL
        if (!navigatedViaSidebar) {
          const categoryParam = encodeURIComponent('Common Masters');
          await page.goto(`/admin/master?category=${categoryParam}`, {
            waitUntil: 'domcontentloaded',
            timeout: 10000,
          });
          await page.waitForLoadState('domcontentloaded');
          logger.logStep('Navigate back to Common Masters tab in sidebar', 'completed', 'Navigated directly via URL');
        }
        
        await page.waitForTimeout(2000);
      } catch (error: any) {
        const errorDetails = `Error: ${error.message}`;
        logger.logStep('Navigate back to Common Masters tab in sidebar', 'error', errorDetails);
        // Continue anyway - try direct navigation
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

      // ========== STEP 2: Search for NBnext Drive ==========
      try {
        const searchSelectors = [
          'input[placeholder*="Search" i]',
          'input[placeholder*="module" i]',
          'input[aria-label*="Search" i]',
        ];

        let searchInputFound = false;
        for (const selector of searchSelectors) {
          try {
            const searchInput = page.locator(selector).first();
            const isVisible = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);
            if (isVisible) {
              await searchInput.clear();
              await searchInput.fill('NBnext Drive');
              await page.waitForTimeout(500);
              searchInputFound = true;
              logger.logStep('Search for "NBnext Drive" in search module', 'completed');
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
        logger.logStep('Search for "NBnext Drive" in search module', 'error', errorDetails);
        throw error;
      }
    });
  });
});
