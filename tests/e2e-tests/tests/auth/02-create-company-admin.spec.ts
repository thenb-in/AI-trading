import { test } from '@playwright/test';
import * as fs from 'fs';
import { setupTest } from '../../helpers/setup';
import { getAdminCredentials } from '../../helpers/testContext';
import { checkIfAdminUserExists } from '../../actions/auth/user';
import { extractCompanyFromAuthUserData } from '../../helpers/uiDataExtractor';
import { createCompanyWithAdmin } from '../../actions/server/company';

test.describe('Auth - Create Company and Admin', () => {
  test('create company with admin user if not exists', async ({ page }) => {
    const { logger, runTest } = setupTest(page, {
      timeout: 60000,
      captureApiResponses: false,
      apiUrlsToCapture: [],
    });

    await runTest(async () => {
      // Load state from previous test
      const { username: adminUsername, password: adminPassword } = getAdminCredentials();
      logger.logStep(`Loaded admin credentials (username="${adminUsername}")`, 'completed');

      logger.logStep('Checking if admin user exists (login attempt)', 'completed');
      const adminExists = await checkIfAdminUserExists(page, logger, adminUsername, adminPassword);
      logger.logStep(`Admin exists check result: ${adminExists}`, 'completed');
      let companyId = '';
      let companyName = '';
      let wasSkipped = false;
   
      if (!adminExists) {
        // Create company with admin user
        logger.logStep('Creating company with admin user (CLI)', 'completed');
        const result = await createCompanyWithAdmin(logger);
        logger.logStep(`Company creation finished (companyId="${result.companyId}")`, 'completed');
        companyId = result.companyId;
        wasSkipped = false;
      } else {
        // Admin already exists, extract company from auth-context userData (company has id + name)
        logger.logStep('Admin already exists - skipping company creation', 'completed');
        wasSkipped = true;

        try {
          logger.logStep('Attempting to extract company from auth userData', 'completed');
          const company = await extractCompanyFromAuthUserData(page);
          if (company?.id) companyId = company.id;
          if (company?.name) companyName = company.name;

          if (companyId || companyName) {
            fs.appendFileSync(
              logger.getLogFilePath(),
              `Using existing company from userData: id="${companyId || 'N/A'}", name="${companyName || 'N/A'}"\n`
            );
            logger.logStep(
              `Extracted company from userData: id="${companyId || 'N/A'}", name="${companyName || 'N/A'}"`,
              'completed'
            );
          } else {
            logger.logStep('Company not found in auth userData', 'error', 'userData.company was empty');
          }
        } catch (error: any) {
          const details = `userData extraction failed: ${error?.message || String(error)}`;
          logger.logStep('Extract company details from auth userData', 'error', details);
          throw new Error(`Could not extract company from auth userData. ${details}`);
        }
      }

      // Final checkpoint for this test block
      logger.logStep(
        `02-create-company-admin finished (wasSkipped=${wasSkipped}, companyId="${companyId || 'N/A'}", companyName="${companyName || 'N/A'}")`,
        'completed'
      );
    });
  });
});
