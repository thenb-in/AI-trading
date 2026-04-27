import { describe, test, expect } from 'vitest';
import { setupTest } from '../helpers/setup';
import { login } from '../actions/auth/login';
import { getAllowedCompanies } from '../actions/company/get-allowed-companies';
import { config } from '../helpers/config';

/**
 * Test: Login and get allowed companies
 * This test verifies that a user can login and retrieve their allowed companies
 */
describe('Authentication and Company Access', () => {
  test('should login and retrieve allowed companies', async () => {
    const { logger, apiClient } = setupTest({ testName: 'should login and retrieve allowed companies' });

    // Login
    const username = config.adminUsername;
    const password = config.adminPassword;
    const loginResult = await login(apiClient, logger, { username, password });
    
    expect(loginResult.user).toBeDefined();
    expect(loginResult.user).not.toBeNull();
    expect(loginResult.cookies).toBeDefined();
    expect(loginResult.cookies.length).toBeGreaterThan(0);

    // Get allowed companies
    const companiesResult = await getAllowedCompanies(apiClient, logger);
    
    expect(companiesResult.companies).toBeDefined();
    expect(Array.isArray(companiesResult.companies)).toBe(true);
    expect(companiesResult.activeCompanyId).toBeDefined();

    // Verify companies data if any exist
    if (companiesResult.companies.length > 0) {
      expect(companiesResult.companies.length).toBeGreaterThan(0);
      expect(companiesResult.activeCompanyId).toBeTruthy();
    }
  });
});
