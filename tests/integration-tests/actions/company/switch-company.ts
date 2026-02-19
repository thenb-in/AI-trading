import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface SwitchCompanyResult {
  updatedUser: any;
  message: string;
  cookies: string[];
}

/**
 * Switch company action - switches the user's active company
 * @param apiClient - API client instance (must be authenticated)
 * @param logger - Test logger instance
 * @param companyId - ID of the company to switch to
 * @returns SwitchCompanyResult with updated user data and cookies
 */
export async function switchCompany(
  apiClient: ApiClient,
  logger: TestLogger,
  companyId: string
): Promise<SwitchCompanyResult> {
  try {
    logger.logStep(`Switching to company: ${companyId}`, 'completed');

    const response = await apiClient.post('/api/v1/company/switch', {
      companyId,
    });

    if (response.status !== 200) {
      const errorMessage = response.data?.error || `Failed to switch company with status ${response.status}`;
      logger.logStep('Switch company failed', 'error', errorMessage);
      throw new Error(errorMessage);
    }

    // Update API client cookies
    if (response.cookies.length > 0) {
      apiClient.setCookies(response.cookies);
    }

    logger.logStep('Company switched successfully', 'completed');

    return {
      updatedUser: response.data.updatedUser || response.data,
      message: response.data.message || 'Company switched successfully',
      cookies: response.cookies,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during switch company';
    logger.logStep('Switch company action failed', 'error', errorMessage);
    throw error;
  }
}
