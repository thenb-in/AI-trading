import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface GetTransactionReportOptions {
  start_date: string; // Format: YYYY-MM-DD
  end_date: string; // Format: YYYY-MM-DD
  employee?: string | number;
  department?: string | number | (string | number)[];
  employment_type?: string;
  is_active?: boolean;
  [key: string]: any;
}

export interface TransactionReportData {
  [key: string]: any;
}

export interface GetTransactionReportResult {
  success: boolean;
  data: TransactionReportData[];
  columns: any[];
  employee_summary?: any;
  totals?: any;
}

/**
 * Get transaction report action - retrieves transaction report data
 * @param apiClient - API client instance (must be authenticated)
 * @param logger - Test logger instance
 * @param options - Report filter options
 * @returns GetTransactionReportResult with report data, columns, and summary
 */
export async function getTransactionReport(
  apiClient: ApiClient,
  logger: TestLogger,
  options: GetTransactionReportOptions
): Promise<GetTransactionReportResult> {
  try {
    logger.logStep(`Fetching transaction report from ${options.start_date} to ${options.end_date}`, 'completed');

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('start_date', options.start_date);
    queryParams.append('end_date', options.end_date);

    if (options.employee) {
      queryParams.append('employee', String(options.employee));
    }
    if (options.department) {
      const deptIds = Array.isArray(options.department)
        ? options.department.join(',')
        : String(options.department);
      queryParams.append('department', deptIds);
    }
    if (options.employment_type) {
      queryParams.append('employment_type', options.employment_type);
    }
    if (options.is_active !== undefined) {
      queryParams.append('is_active', String(options.is_active));
    }

    // Add any additional query parameters
    Object.keys(options).forEach((key) => {
      if (!['start_date', 'end_date', 'employee', 'department', 'employment_type', 'is_active'].includes(key)) {
        const value = options[key];
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }
    });

    const endpoint = `/api/v1/reports/transaction-report?${queryParams.toString()}`;

    const response = await apiClient.get(endpoint);

    if (response.status !== 200) {
      const errorMessage = response.data?.error || `Failed to get transaction report with status ${response.status}`;
      logger.logStep('Get transaction report failed', 'error', errorMessage);
      throw new Error(errorMessage);
    }

    const result = response.data;

    logger.logStep(`Retrieved transaction report with ${result.data?.length || 0} records`, 'completed');

    return {
      success: result.success !== false, // Default to true if not specified
      data: result.data || [],
      columns: result.columns || [],
      employee_summary: result.employee_summary,
      totals: result.totals || {},
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during get transaction report';
    logger.logStep('Get transaction report action failed', 'error', errorMessage);
    throw error;
  }
}
