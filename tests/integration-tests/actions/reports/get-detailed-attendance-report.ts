import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface GetDetailedAttendanceReportOptions {
  start_date: string; // Format: YYYY-MM-DD
  end_date: string; // Format: YYYY-MM-DD
  employee?: string | number;
  department?: string | number | (string | number)[];
  employment_type?: string;
  is_active?: boolean;
  // Detailed attendance specific filters
  is_horizontal?: boolean;
  show_attendance?: boolean;
  show_attendance_timings?: boolean;
  show_factor?: boolean;
  show_working_hours?: boolean;
  show_ot_short?: boolean;
  show_late_early?: boolean;
  show_shift_details?: boolean;
  show_summary_view?: boolean;
  is_print_view?: boolean;
  is_manual?: boolean;
  is_debug_mode?: boolean;
  [key: string]: any;
}

export interface DetailedAttendanceReportData {
  [key: string]: any;
}

export interface GetDetailedAttendanceReportResult {
  success: boolean;
  data: DetailedAttendanceReportData[];
  columns?: any[];
  status_definitions?: any;
  employee_summary?: any;
  totals?: any;
  message?: string;
}

/**
 * Get detailed attendance report action - retrieves detailed attendance report data
 * @param apiClient - API client instance (must be authenticated)
 * @param logger - Test logger instance
 * @param options - Report filter options
 * @returns GetDetailedAttendanceReportResult with report data, columns, and status definitions
 */
export async function getDetailedAttendanceReport(
  apiClient: ApiClient,
  logger: TestLogger,
  options: GetDetailedAttendanceReportOptions
): Promise<GetDetailedAttendanceReportResult> {
  try {
    logger.logStep(`Fetching detailed attendance report from ${options.start_date} to ${options.end_date}`, 'pending');

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('start_date', options.start_date);
    queryParams.append('end_date', options.end_date);

    // Standard filters
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

    // Detailed attendance specific filters
    if (options.is_horizontal !== undefined) {
      queryParams.append('is_horizontal', String(options.is_horizontal));
    }
    if (options.show_attendance !== undefined) {
      queryParams.append('show_attendance', String(options.show_attendance));
    }
    if (options.show_attendance_timings !== undefined) {
      queryParams.append('show_attendance_timings', String(options.show_attendance_timings));
    }
    if (options.show_factor !== undefined) {
      queryParams.append('show_factor', String(options.show_factor));
    }
    if (options.show_working_hours !== undefined) {
      queryParams.append('show_working_hours', String(options.show_working_hours));
    }
    if (options.show_ot_short !== undefined) {
      queryParams.append('show_ot_short', String(options.show_ot_short));
    }
    if (options.show_late_early !== undefined) {
      queryParams.append('show_late_early', String(options.show_late_early));
    }
    if (options.show_shift_details !== undefined) {
      queryParams.append('show_shift_details', String(options.show_shift_details));
    }
    if (options.show_summary_view !== undefined) {
      queryParams.append('show_summary_view', String(options.show_summary_view));
    }
    if (options.is_print_view !== undefined) {
      queryParams.append('is_print_view', String(options.is_print_view));
    }
    if (options.is_manual !== undefined) {
      queryParams.append('is_manual', String(options.is_manual));
    }
    if (options.is_debug_mode !== undefined) {
      queryParams.append('is_debug_mode', String(options.is_debug_mode));
    }

    // Add any additional query parameters
    const standardAndSpecificKeys = [
      'start_date', 'end_date', 'employee', 'department', 'employment_type', 'is_active',
      'is_horizontal', 'show_attendance', 'show_attendance_timings', 'show_factor',
      'show_working_hours', 'show_ot_short', 'show_late_early', 'show_shift_details',
      'show_summary_view', 'is_print_view', 'is_manual', 'is_debug_mode'
    ];

    Object.keys(options).forEach((key) => {
      if (!standardAndSpecificKeys.includes(key)) {
        const value = options[key];
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }
    });

    const endpoint = `/api/v1/reports/detailed-attendance-report?${queryParams.toString()}`;

    const response = await apiClient.get(endpoint);

    if (response.status !== 200) {
      const errorMessage = response.data?.message || response.data?.error || `Failed to get detailed attendance report with status ${response.status}`;
      logger.logStep('Get detailed attendance report failed', 'error', errorMessage);
      throw new Error(errorMessage);
    }

    const result = response.data;

    logger.logStep(`Retrieved detailed attendance report with ${result.data?.length || 0} records`, 'completed');

    return {
      success: result.success !== false, // Default to true if not specified
      data: result.data || [],
      columns: result.columns,
      status_definitions: result.status_definitions,
      employee_summary: result.employee_summary,
      totals: result.totals || {},
      message: result.message,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during get detailed attendance report';
    logger.logStep('Get detailed attendance report action failed', 'error', errorMessage);
    throw error;
  }
}
