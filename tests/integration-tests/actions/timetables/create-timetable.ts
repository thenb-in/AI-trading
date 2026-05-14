import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface CreateTimetableData {
  alias: string;
  in_time: string; // Format: HH:mm:ss
  checkout_time: string; // Format: HH:mm:ss
  work_time_duration?: number; // Will be calculated if not provided
  available_interval?: number;
  [key: string]: any;
}

export interface Timetable {
  id: number;
  alias: string;
  in_time: string;
  checkout_time: string;
  work_time_duration: number;
  company_id: string;
  available_interval: number;
  is_default: boolean;
  duration: number;
  company?: any;
}

export interface CreateTimetableResult {
  success: boolean;
  message: string;
  data: Timetable;
}

/**
 * Create timetable action - creates a new timetable (which automatically creates a shift)
 * @param apiClient - API client instance (must be authenticated)
 * @param logger - Test logger instance
 * @param timetableData - Timetable data to create
 * @returns CreateTimetableResult with created timetable data
 */
export async function createTimetable(
  apiClient: ApiClient,
  logger: TestLogger,
  timetableData: CreateTimetableData
): Promise<CreateTimetableResult> {
  try {
    logger.logStep(`Creating timetable with alias: ${timetableData.alias}`, 'pending');

    // Set defaults if not provided
    const finalData = {
      ...timetableData,
      available_interval: timetableData.available_interval || 1,
    };

    const response = await apiClient.post('/api/v1/timetable', finalData);

    if (response.status !== 201 && response.status !== 200) {
      const errorMessage = response.data?.error || response.data?.message || `Failed to create timetable with status ${response.status}`;
      logger.logStep('Create timetable failed', 'error', errorMessage);
      throw new Error(errorMessage);
    }

    const result = response.data;

    logger.logStep('Timetable created successfully (shift created automatically)', 'completed');

    return {
      success: result.success !== false, // Default to true if not specified
      message: result.message || 'Timetable created successfully',
      data: result.data || result,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during create timetable';
    logger.logStep('Create timetable action failed', 'error', errorMessage);
    throw error;
  }
}
