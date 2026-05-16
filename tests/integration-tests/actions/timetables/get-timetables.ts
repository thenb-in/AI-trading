import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface Timetable {
  id: number;
  alias: string;
  in_time: string;
  checkout_time: string;
  // Add other timetable fields as needed
}

export interface GetTimetablesResult {
  success: boolean;
  message: string;
  data: Timetable[];
}

/**
 * Get all timetables for the current company
 * @param apiClient - API client instance (must be authenticated)
 * @param logger - Test logger instance
 * @returns GetTimetablesResult with array of timetables
 */
export async function getTimetables(
  apiClient: ApiClient,
  logger: TestLogger
): Promise<GetTimetablesResult> {
  try {
    logger.logStep('Getting all timetables', 'completed');

    const response = await apiClient.get('/api/v1/timetable');

    if (response.status !== 200) {
      const errorMessage = response.data?.error || response.data?.message || `Failed to get timetables with status ${response.status}`;
      logger.logStep('Get timetables failed', 'error', errorMessage);
      throw new Error(errorMessage);
    }

    const result = response.data.data.timetables ;

    logger.logStep(`Successfully retrieved ${result.length || 0} timetables`, 'completed');

    return {
      success: result.success !== false,
      message: result.message || 'Timetables retrieved successfully',
      data: result || [],
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during get timetables';
    logger.logStep('Get timetables action failed', 'error', errorMessage);
    throw error;
  }
}
