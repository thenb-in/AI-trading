import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface DeactivateEmployeeResult {
  success: boolean;
  message?: string;
  data?: any;
}

/**
 * Deactivate one or more employees (sets status to inactive).
 * POST /api/v1/employee/deactivate body: { emp_code: string | string[] }
 * @param apiClient - API client instance (must be authenticated)
 * @param logger - Test logger instance
 * @param empCode - Single emp_code or array of emp_codes
 * @returns DeactivateEmployeeResult
 */
export async function deactivateEmployee(
  apiClient: ApiClient,
  logger: TestLogger,
  empCode: string | string[]
): Promise<DeactivateEmployeeResult> {
  try {
    const codes = Array.isArray(empCode) ? empCode : [empCode];
    logger.logStep(`Deactivating employee(s): ${codes.join(', ')}`, 'pending');

    const response = await apiClient.post('/api/v1/employee/deactivate', { emp_code: empCode });

    if (response.status !== 200) {
      const errorMessage = response.data?.error || response.data?.message || `Failed to deactivate employee with status ${response.status}`;
      logger.logStep('Deactivate employee failed', 'error', errorMessage);
      throw new Error(errorMessage);
    }

    const result = response.data;
    logger.logStep('Employee(s) deactivated successfully', 'completed');

    return {
      success: result?.success !== false,
      message: result?.message,
      data: result?.data,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during deactivate employee';
    logger.logStep('Deactivate employee action failed', 'error', errorMessage);
    throw error;
  }
}
