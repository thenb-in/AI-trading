import { config } from './config';

const REPORT_PATH = '/admin/report/detailed-attendance-report';

/**
 * Build the frontend URL for the Detailed Attendance Report with the given date range.
 * Pass employee (id or code) to open the report filtered to that employee (exact use case).
 * Use this in failure messages so users can open the report to investigate.
 */
export function buildDetailedAttendanceReportUrl(
  startDate: string,
  endDate: string,
  employee?: string | number
): string {
  const base = config.frontendBaseUrl.replace(/\/$/, '');
  const path = REPORT_PATH.startsWith('/') ? REPORT_PATH : `/${REPORT_PATH}`;
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  if (employee !== undefined && employee !== null && String(employee).trim() !== '') {
    params.set('employee', String(employee));
  }
  return `${base}${path}?${params.toString()}`;
}
