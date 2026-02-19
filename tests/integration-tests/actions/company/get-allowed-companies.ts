import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface Company {
  id: string;
  name: string;
}

export interface GetAllowedCompaniesResult {
  companies: Company[];
  activeCompanyId: string;
}

/**
 * Get allowed companies action - retrieves all companies the user has access to
 * @param apiClient - API client instance (must be authenticated)
 * @param logger - Test logger instance
 * @returns GetAllowedCompaniesResult with companies array and active company ID
 */
export async function getAllowedCompanies(
  apiClient: ApiClient,
  logger: TestLogger
): Promise<GetAllowedCompaniesResult> {
  try {
    logger.logStep('Fetching allowed companies', 'completed');

    const response = await apiClient.get('/api/v1/company/my');

    if (response.status !== 200) {
      const errorMessage = response.data?.error || `Failed to get companies with status ${response.status}`;
      logger.logStep('Get allowed companies failed', 'error', errorMessage);
      throw new Error(errorMessage);
    }

    const companies = response.data.companies || [];
    const activeCompanyId = response.data.activeCompanyId || '';

    logger.logStep(`Retrieved ${companies.length} companies`, 'completed');

    return {
      companies,
      activeCompanyId,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during get allowed companies';
    logger.logStep('Get allowed companies action failed', 'error', errorMessage);
    throw error;
  }
}
