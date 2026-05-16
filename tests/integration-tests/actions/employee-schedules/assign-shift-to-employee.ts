import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface AssignShiftData {
  employees: string[]; // Array of employee codes
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  shift_id: number;
}

export interface AssignShiftResult {
  success: boolean;
  message: string;
  data: any;
}

/**
 * Assign shift to employee action - assigns a shift to employees through employee schedule
 * @param apiClient - API client instance (must be authenticated)
 * @param logger - Test logger instance
 * @param assignData - Assignment data containing employees, dates, and shift
 * @returns AssignShiftResult with assignment result
 */
export async function assignShiftToEmployee(
  apiClient: ApiClient,
  logger: TestLogger,
  assignData: AssignShiftData
): Promise<AssignShiftResult> {
  try {
    logger.logStep(`Assigning shift ${assignData.shift_id} to ${assignData.employees.length} employee(s)`, 'completed');

    const response = await apiClient.post('/api/v1/employee-schedule', assignData);

    if (response.status !== 201 && response.status !== 200) {
      const errorMessage = response.data?.error || response.data?.message || `Failed to assign shift with status ${response.status}`;
      logger.logStep('Assign shift failed', 'error', errorMessage);
      throw new Error(errorMessage);
    }

    const result = response.data;

    logger.logStep('Shift assigned to employees successfully', 'completed');

    return {
      success: result.success !== false, // Default to true if not specified
      message: result.message || 'Shift assigned successfully',
      data: result.data || result,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during assign shift';
    logger.logStep('Assign shift action failed', 'error', errorMessage);
    throw error;
  }
}
