import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface Shift {
  id: number;
  alias: string;
}

export interface GetShiftsResult {
  success: boolean;
  message: string;
  data: Shift[];
}

/**
 * Get all shifts for the current company
 * @param apiClient - API client instance (must be authenticated)
 * @param logger - Test logger instance
 * @returns GetShiftsResult with array of shifts
 */
export async function getShifts(
  apiClient: ApiClient,
  logger: TestLogger
): Promise<GetShiftsResult> {
  try {
    logger.logStep('Getting all shifts', 'pending');

    const response = await apiClient.get('/api/v1/shifts');

    if (response.status !== 200) {
      const errorMessage = response.data?.error || response.data?.message || `Failed to get shifts with status ${response.status}`;
      logger.logStep('Get shifts failed', 'error', errorMessage);
      throw new Error(errorMessage);
    }

    const result = response.data;

    logger.logStep(`Successfully retrieved ${result.data?.length || 0} shifts`, 'completed');

    return {
      success: result.success !== false,
      message: result.message || 'Shifts retrieved successfully',
      data: result.data || [],
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during get shifts';
    logger.logStep('Get shifts action failed', 'error', errorMessage);
    throw error;
  }
}
