import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface DeleteTimetableResult {
  success: boolean;
  message?: string;
}

/**
 * Delete timetable (or shift) by id.
 * Server accepts either timetable id or shift id; deleting by shift id removes the shift and its timetables.
 * @param apiClient - API client instance (must be authenticated)
 * @param logger - Test logger instance
 * @param id - Timetable id or shift id (number)
 * @returns DeleteTimetableResult
 */
export async function deleteTimetable(
  apiClient: ApiClient,
  logger: TestLogger,
  id: number
): Promise<DeleteTimetableResult> {
  try {
    logger.logStep(`Deleting timetable/shift id: ${id}`, 'pending');

    const response = await apiClient.delete(`/api/v1/timetable/${id}`);

    if (response.status !== 200 && response.status !== 204) {
      const errorMessage = response.data?.error || response.data?.message || `Failed to delete timetable with status ${response.status}`;
      logger.logStep('Delete timetable failed', 'error', errorMessage);
      throw new Error(errorMessage);
    }

    logger.logStep('Timetable/shift deleted successfully', 'completed');

    return {
      success: true,
      message: response.data?.message,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during delete timetable';
    logger.logStep('Delete timetable action failed', 'error', errorMessage);
    throw error;
  }
}
