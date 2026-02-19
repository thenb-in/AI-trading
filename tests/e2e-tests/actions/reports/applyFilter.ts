import { Page } from '@playwright/test';
import { TestLogger } from '../../helpers/logger';


export async function applyReportFilters(page: Page, logger: TestLogger): Promise<void> {
  const applyButton = page.getByRole('button', { name: /Apply Filters/i });
  if (await applyButton.isVisible()) {
    await applyButton.click();
    logger.logStep('Applied report filters from UI', 'completed');
  } else {
    logger.logStep('Apply Filters button not visible, skipping', 'completed');
  }

  // Wait for data/grid to load (rows present or loading to settle)
  await page.waitForTimeout(5000);
}

