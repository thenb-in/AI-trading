import { parseExcelData } from '../../tests/att-test-from-excel/helpers';
import { parseLocalDate } from '../../helpers/dateUtils';
import { convertTimeToSeconds } from '../time-utils';
import { ExpectedAttendanceData } from '../attendance-utils';

/**
 * Process attendance data from Txns1 sheet
 * Returns array of expected attendance data objects
 */
export async function processTxns1Attendance(apiClient: any, logger: any): Promise<ExpectedAttendanceData[]> {
  // Parse Excel file to get Txns1 array and get employees from database
  const parseResult = parseExcelData();
  const txns = parseResult.txns || [];

  // Get all employees from the system
  const { getAllEmployees } = await import('../../actions/employees/get-all-employees');
  const employeesResult = await getAllEmployees(apiClient, logger, { is_active: true });
  const existingEmployees = employeesResult.employees;

  logger.logStep(`Found ${txns.length} rows in Txns1 sheet for attendance verification`, 'completed');

  // Create a map for quick lookup of employee codes by shift name and compound shift
  const shiftCombinationMap = new Map<string, string>();
  existingEmployees.forEach((emp: any) => {
    const empCode = emp.emp_code || emp.employee_code;
    const parts = empCode.split(':');
    if (parts.length >= 3) {
      const shiftName = parts[1];
      const compoundShift = parts[2];
      const key = `${shiftName}:${compoundShift}`;
      shiftCombinationMap.set(key, empCode);
    }
  });

  const expectedAttendanceData: ExpectedAttendanceData[] = [];
  let errorCount = 0;

  // Filter rows that have attendance data
  const rowsWithAttendanceData = txns.filter((row: any) => {
    const status = String(row['Status'] || '').trim();
    const workingHours = String(row['Working hours'] || '').trim();
    const date = String(row['Date'] || '').trim();
    const shiftName = String(row['Shift name'] || '').trim();
    const compoundShift = String(row['Compound shift'] || '').trim();

    return status.length > 0 && workingHours.length > 0 && date.length > 0 &&
           shiftName.length > 0 && compoundShift.length > 0;
  });

  logger.logStep(`Found ${rowsWithAttendanceData.length} Txns1 rows with attendance data (Status, Working hours, Shift name, Compound shift)`, 'completed');

  rowsWithAttendanceData.forEach((row: any, index: number) => {
    try {
      const shiftName = String(row['Shift name'] || '').trim();
      const compoundShift = String(row['Compound shift'] || '').trim();
      const dateStr = String(row['Date'] || '').trim();
      const status = String(row['Status'] || '').trim();
      const workingHoursStr = String(row['Working hours'] || '').trim();

      // Find employee code by matching shift name and compound shift
      const combinationKey = `${shiftName}:${compoundShift}`;
      const employeeCode = shiftCombinationMap.get(combinationKey);

      if (!employeeCode) {
        logger.logStep(`Txns1 Row ${index + 1}: No employee found for combination: ${combinationKey}, skipping`, 'error');
        errorCount += 1;
        return;
      }

      // Parse date - handle Excel date format with potential leading space
      const cleanDateStr = dateStr.trim();
      let dateKey: string;
      try {
        dateKey = parseLocalDate(cleanDateStr);
      } catch {
        logger.logStep(`Txns1 Row ${index + 1}: Invalid date: ${dateStr} (cleaned: ${cleanDateStr}), skipping`, 'error');
        errorCount += 1;
        return;
      }

      // Convert working hours to seconds (HH:MM format to total seconds)
      const workingHoursSeconds = convertTimeToSeconds(workingHoursStr);

      expectedAttendanceData.push({
        employee_code: employeeCode,
        attendance_date: dateKey,
        expected_status: status,
        expected_total_work_seconds: workingHoursSeconds,
        shift_name: shiftName,
        compound_shift: compoundShift,
        source: 'txns1',
        row_index: index + 1,
      });
    } catch (error: any) {
      logger.logStep(`Txns1 Row ${index + 1}: Error processing attendance row - ${error.message}`, 'error');
      errorCount += 1;
    }
  });

  logger.logStep(`Txns1 attendance processing completed: ${expectedAttendanceData.length} attendance records prepared`, 'completed');
  if (errorCount > 0) {
    logger.logStep(`Txns1 — Errors in this step: ${errorCount}`, 'error');
    throw new Error(`Txns1 attendance processing had ${errorCount} error(s). Step failed.`);
  }
  return expectedAttendanceData;
}
