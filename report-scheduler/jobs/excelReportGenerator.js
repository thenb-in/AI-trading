const { chromium } = require('playwright');
const logger = require('../../server/logger.js');
const { URL } = require('url');
const path = require('path');
const fs = require('fs/promises');
const XLSX = require('xlsx');
const { REPORT_GENERATION_GOTO_URL } = require('../constants.js');
require('dotenv').config();

// ------------------ CONFIG ------------------
const config = {
  reports_base_path:
    process.env.REPORTS_PATH ||
    path.join(__dirname, '..', 'uploads', 'reports'),
  temp_base_path: process.env.TEMP_PATH || path.join(__dirname, '..')
};

// ------------------ LOGIN ------------------
async function loginAsAdmin(page) {
  logger.info('🔐 Starting admin login via UI...');

  await page.goto(process.env.BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });

  const username = process.env.SYSTEM_USER_USERNAME;
  const password = process.env.SYSTEM_USER_PASSWORD;
  if (!username || !password) throw new Error('Missing env vars for credentials.');

  // Wait for login elements
  await page.waitForSelector('input[name="username"]', { timeout: 15000 });
  await page.waitForSelector('input[name="password"]', { timeout: 15000 });

  // Prepare to intercept login response
  const loginResponsePromise = page.waitForResponse(
    res => res.url().includes('/api/v1/auth/login') && res.request().method() === 'POST',
    { timeout: 30000 }
  );

  // Perform login
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for login response
  const loginResponse = await loginResponsePromise;
  if (!loginResponse.ok()) throw new Error(`Login failed: ${loginResponse.status()}`);

  const data = await loginResponse.json();
  const companyId = data?.user?.company?.id;
  if (!companyId) throw new Error('Could not extract companyId from login response.');

  // Wait for redirect to /admin
  await page.waitForURL('**/admin/**', { timeout: 30000 });

  logger.info(`✅ Admin login successful for companyId: ${companyId}`);
  return companyId;
}

// ------------------ PLACEHOLDER FILE ------------------
const createPlaceholderFile = async (filePath, { companyId, reportSlug, message }) => {
  const header = ['Company ID', 'Report Slug', 'Message', 'Generated At'];
  const data = [companyId || 'N/A', reportSlug || 'N/A', message || 'N/A', new Date().toISOString()];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, data]), 'Info');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  logger.info(`[Placeholder] File created at: ${filePath}`);
};

// ------------------ FILTER APPLICATION ------------------
/**
 * Applies filters and waits for the data API to respond.
 * Returns { dataPresent: boolean }
 *   dataPresent = true  -> .MuiDataGrid-main is visible, export should be enabled
 *   dataPresent = false -> grid not shown -> generate placeholder
 */
async function applyFiltersAndWaitForData(page) {
  const applyFilterBtnSelector = '#applyFiltersBtn';
  const dataApiUrlPart = '/api/v1/reports';

  try {
    logger.info(`[Filter] Waiting for Apply Filters button`);
    await page.locator(applyFilterBtnSelector).waitFor({ state: 'visible', timeout: 15000 });

    logger.info(`[Filter] Clicking Apply and waiting for data API`);
    await Promise.all([
      page.waitForResponse(
        res => res.url().includes(dataApiUrlPart) && res.status() === 200,
        { timeout: 45000 }
      ),
      page.locator(applyFilterBtnSelector).click()
    ]);

    // Allow UI to render
    await page.waitForTimeout(500);

    // Determine if data grid is actually visible
    const dataGrid = page.locator('.MuiDataGrid-main');
    const dataPresent = await dataGrid.isVisible().catch(() => false);

    logger.info(`[Filter] Data present? ${dataPresent ? 'YES' : 'NO'}`);
    return { dataPresent };
  } catch (err) {
    logger.error(`[Filter] Error applying filters: ${err.message}`);
    // If filters or API fail, treat as no data so the caller can create a placeholder
    return { dataPresent: false };
  }
}

// ------------------ EXCEL DOWNLOAD ------------------
/**
 * Clicks the enabled export button and waits for the download.
 * IMPORTANT: We specifically target the enabled state to avoid matching the disabled twin.
 */
async function clickExcelAndWaitForFileDownload(page, downloadDir, timeoutMs = 30000) {
  const enabledExcelBtnSelector = 'button#exportExcelBtn:not([disabled]):not(.cursor-not-allowed)';

  await fs.mkdir(downloadDir, { recursive: true });

  logger.info(`[Download] Waiting for enabled Excel button...`);
  await page.locator(enabledExcelBtnSelector).waitFor({ state: 'visible', timeout: 20000 });

  logger.info(`[Download] Clicking Excel button...`);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: timeoutMs }),
    page.locator(enabledExcelBtnSelector).click()
  ]);

  const suggestedName = download.suggestedFilename();
  const tempFilePath = path.join(downloadDir, suggestedName);
  await download.saveAs(tempFilePath);

  logger.info(`[Download] File downloaded: ${tempFilePath}`);
  return { clientFilename: suggestedName, tempFilePath };
}

// ------------------ MAIN FILE GENERATION ------------------
const generateExcelFile = async (page, options) => {
  const { url, reportSlug, startDate, endDate } = options;
  await page.setViewportSize({ width: 1280, height: 1024 });

  const companyId = await loginAsAdmin(page); // <- auto extracted here
  logger.info(`[Job] Company ID resolved: ${companyId}`);

  const safeStartDate = startDate.replace(/-/g, '');
  const safeEndDate = endDate.replace(/-/g, '');
  const timestamp = Date.now();

  const finalFileName = `${reportSlug}_${safeStartDate}_to_${safeEndDate}_${timestamp}.xlsx`;
  const finalFilePath = path.join(config.reports_base_path, companyId, finalFileName);

  const tempDownloadDir = await fs.mkdtemp(path.join(config.temp_base_path, 'playwright-excel-'));
  logger.info(`[Job] Temp directory created: ${tempDownloadDir}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    logger.info(`[Job] Navigated to ${url}`);

    const { dataPresent } = await applyFiltersAndWaitForData(page);

    if (!dataPresent) {
      logger.warn(`[Job] No data grid detected. Creating placeholder file...`);
      await createPlaceholderFile(finalFilePath, {
        companyId,
        reportSlug,
        message: 'No data available for the selected date range.'
      });
      return finalFilePath;
    }

    // Optional: ensure any spinners/overlays are gone before clicking Export
    await page.locator('.spinner,.modal-backdrop,.MuiBackdrop-root').waitFor({ state: 'detached', timeout: 10000 }).catch(() => { });

    // Click the enabled export button and download
    const { tempFilePath } = await clickExcelAndWaitForFileDownload(page, tempDownloadDir, 45000);

    await fs.mkdir(path.dirname(finalFilePath), { recursive: true });
    await fs.rename(tempFilePath, finalFilePath);

    logger.info(`[Job] File moved to final path: ${finalFilePath}`);
    return finalFilePath;
  } catch (err) {
    logger.error(`[Job] File generation failed: ${err.message}`);
    await createPlaceholderFile(finalFilePath, {
      companyId,
      reportSlug,
      message: 'No data available for the selected date range.'
    });
    return finalFilePath;
  } finally {
    await fs.rm(tempDownloadDir, { recursive: true, force: true });
    logger.info(`[Job] Cleanup complete for temp directory: ${tempDownloadDir}`);
  }
};

// ------------------ REPORT WRAPPER ------------------
const generateExcelReport = async ({
  startDate,
  endDate,
  reportSlug
}) => {
  if (!startDate || !endDate || !reportSlug) {
    throw new Error(`Missing required parameters.`);
  }

  const baseUrl = new URL(REPORT_GENERATION_GOTO_URL,process.env.BASE_URL);
  baseUrl.searchParams.set('start_date', startDate);
  baseUrl.searchParams.set('end_date', endDate);
  const finalUrl = baseUrl.toString();

  let browser = null;
  let context = null;

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    const savedFilePath = await generateExcelFile(page, {
      url: finalUrl,
      reportSlug,
      startDate,
      endDate
    });

    logger.info(`[ExcelJob] SUCCESS: ${savedFilePath}`);
    return { success: true, filePath: savedFilePath };
  } catch (error) {
    logger.error(`[ExcelJob] FAILED: ${error.message}`);
    throw error;
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    logger.info(`[ExcelJob] Browser closed successfully.`);
  }
};

// ------------------ EXPORTS ------------------
module.exports = { generateExcelReport };
