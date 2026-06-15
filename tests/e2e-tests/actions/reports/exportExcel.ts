import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import { TestLogger } from '../../helpers/logger';

export interface ExportResult {
  fileBuffer: Buffer | null;
  fileName: string | null;
  filePath: string | null;
}

export async function exportReportToExcel(
  page: Page,
  logger: TestLogger,
): Promise<ExportResult> {
  // Wait until data is loaded (at least one table row is visible),
  // then wait until the Export Excel button becomes enabled.
  const firstRow = page.locator('table tbody tr').first();
  await expect(firstRow).toBeVisible({ timeout: 30000 });

  const exportExcelButton = page.locator('#exportExcelBtn');
  await expect(exportExcelButton).toBeVisible({ timeout: 30000 });
  await expect(exportExcelButton).toBeEnabled({ timeout: 30000 });

  // Click Export and capture the downloaded Excel file
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportExcelButton.click(),
  ]);
  logger.logStep('Clicked Export Excel and captured download', 'completed');

  const downloadPath = await download.path();
  const downloadedFileName = download.suggestedFilename();

  let fileBuffer: Buffer | null = null;
  if (downloadPath) {
    fileBuffer = await fs.promises.readFile(downloadPath);
    logger.logStep(`Downloaded Excel file saved at: ${downloadPath}`, 'completed');
  } else {
    logger.logStep('Download path is null; could not read downloaded Excel file from disk', 'error');
  }

  return {
    fileBuffer,
    fileName: downloadedFileName,
    filePath: downloadPath,
  };
}

