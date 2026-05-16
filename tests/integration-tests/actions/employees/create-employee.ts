import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface CreateEmployeeData {
  emp_code: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  department_id?: number;
  position_id?: number;
  gender?: string;
  hire_date?: string; // ISO date string
  [key: string]: any;
}

export interface CreateEmployeeResult {
  success: boolean;
  message: string;
  data: any;
}

/**
 * Create employee action - creates a new employee in the system
 * @param apiClient - API client instance (must be authenticated)
 * @param logger - Test logger instance
 * @param employeeData - Employee data to create
 * @returns CreateEmployeeResult with created employee data
 */
export async function createEmployee(
  apiClient: ApiClient,
  logger: TestLogger,
  employeeData: CreateEmployeeData
): Promise<CreateEmployeeResult> {
  try {
    logger.logStep(`Creating employee with code: ${employeeData.emp_code}`, 'completed');

    const response = await apiClient.post('/api/v1/employees', employeeData);

    if (response.status !== 201 && response.status !== 200) {
      const errorMessage = response.data?.error || response.data?.message || `Failed to create employee with status ${response.status}`;
      logger.logStep('Create employee failed', 'error', errorMessage);
      throw new Error(errorMessage);
    }

    const result = response.data;

    logger.logStep('Employee created successfully', 'completed');

    return {
      success: result.success !== false, // Default to true if not specified
      message: result.message || 'Employee created successfully',
      data: result.data || result,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during create employee';
    logger.logStep('Create employee action failed', 'error', errorMessage);
    throw error;
  }
}
