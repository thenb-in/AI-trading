import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface Employee {
  id: number | string;
  employee_code?: string;
  emp_code?: string; // API may return emp_code instead of employee_code
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  [key: string]: any;
}

export interface GetAllEmployeesOptions {
  department_id?: string | number;
  department_ids?: string | number | (string | number)[];
  emp_type?: string;
  is_active?: boolean;
  search?: string;
  employee?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface GetAllEmployeesResult {
  employees: Employee[];
  total?: number;
}

/**
 * Get all employees action - retrieves all employees for the current company
 * @param apiClient - API client instance (must be authenticated)
 * @param logger - Test logger instance
 * @param options - Optional filters and sorting options
 * @returns GetAllEmployeesResult with employees array
 */
export async function getAllEmployees(
  apiClient: ApiClient,
  logger: TestLogger,
  options: GetAllEmployeesOptions = {}
): Promise<GetAllEmployeesResult> {
  try {
    logger.logStep('Fetching all employees', 'completed');

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (options.department_id) {
      queryParams.append('department_id', String(options.department_id));
    }
    if (options.department_ids) {
      const deptIds = Array.isArray(options.department_ids)
        ? options.department_ids.join(',')
        : String(options.department_ids);
      queryParams.append('department_ids', deptIds);
    }
    if (options.emp_type) {
      queryParams.append('emp_type', options.emp_type);
    }
    if (options.is_active !== undefined) {
      queryParams.append('is_active', String(options.is_active));
    }
    if (options.search) {
      queryParams.append('search', options.search);
    }
    if (options.employee) {
      queryParams.append('employee', options.employee);
    }
    if (options.sort_by) {
      queryParams.append('sort_by', options.sort_by);
    }
    if (options.sort_order) {
      queryParams.append('sort_order', options.sort_order);
    }

    const queryString = queryParams.toString();
    const endpoint = `/api/v1/employees${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get(endpoint);

    if (response.status !== 200) {
      const errorMessage = response.data?.error || `Failed to get employees with status ${response.status}`;
      logger.logStep('Get all employees failed', 'error', errorMessage);
      throw new Error(errorMessage);
    }

    // Response structure: { success: true, data: { employees: [...], columns: [...] }, message: "..." }
    let employees: Employee[] = [];
    let total: number = 0;

    if (response.data && typeof response.data === 'object') {
      // Check for nested structure: response.data.data.employees (API returns { success: true, data: { employees: [...] } })
      if (response.data.data && typeof response.data.data === 'object' && Array.isArray(response.data.data.employees)) {
        employees = response.data.data.employees;
        total = response.data.data.employees.length;
      }
      // Check for direct data.employees (when response.data is { employees: [...] })
      else if (Array.isArray(response.data.employees)) {
        employees = response.data.employees;
        total = response.data.employees.length;
      }
      // Check if response.data.data is an array
      else if (Array.isArray(response.data.data)) {
        employees = response.data.data;
        total = response.data.data.length;
      }
      // Check if response.data itself is an array
      else if (Array.isArray(response.data)) {
        employees = response.data;
        total = response.data.length;
      }
      // Try to find any array property in the response
      else {
        const arrayKeys = Object.keys(response.data).filter(key => Array.isArray(response.data[key]));
        if (arrayKeys.length > 0) {
          employees = response.data[arrayKeys[0]];
          total = employees.length;
        } else {
          // Log the actual response structure for debugging
          logger.logStep(`Unexpected response structure. Keys: ${JSON.stringify(Object.keys(response.data))}`, 'error');
          throw new Error(`Unexpected response structure from getAllEmployees API`);
        }
      }
    } else if (Array.isArray(response.data)) {
      // Response is directly an array
      employees = response.data;
      total = response.data.length;
    }

    logger.logStep(`Retrieved ${employees.length} employees`, 'completed');

    return {
      employees,
      total,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during get all employees';
    logger.logStep('Get all employees action failed', 'error', errorMessage);
    throw error;
  }
}
