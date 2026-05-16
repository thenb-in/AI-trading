import { parseExcelData } from '../../tests/att-test-from-excel/helpers';
import { parseLocalDate } from '../../helpers/dateUtils';
import { convertTimeToSeconds } from '../time-utils';
import { ExpectedAttendanceData } from '../attendance-utils';

/**
 * Process attendance data from Txns2 sheet
 * Returns array of expected attendance data objects
 */
export async function processTxns2Attendance(apiClient: any, logger: any): Promise<ExpectedAttendanceData[]> {
  // Parse Excel file to get Txns2 array and get employees from database
  const parseResult = parseExcelData();
  const txns2 = parseResult.txns2 || [];

  // Get all employees from the system
  const { getAllEmployees } = await import('../../actions/employees/get-all-employees');
  const employeesResult = await getAllEmployees(apiClient, logger, { is_active: true });
  const existingEmployees = employeesResult.employees;

  logger.logStep(`Found ${txns2.length} rows in Txns2 sheet for attendance verification`, 'completed');

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

  // Filter rows that have attendance data - Txns2 may have aggregated data or we need to calculate from punches
  const rowsWithAttendanceData = txns2.filter((row: any) => {
    const shiftName = String(row['Shift name'] || '').trim();
    const compoundShift = String(row['Compound shift'] || '').trim();
    const attDate = String(row['Att. Date'] || '').trim();
    const status = String(row['Status'] || '').trim();
    const workingHours = String(row['Working hours'] || '').trim();

    // Check if row has either direct attendance fields or punch data
    const hasDirectAttendance = status.length > 0 && workingHours.length > 0;
    const hasPunchData = shiftName.length > 0 && compoundShift.length > 0 && attDate.length > 0;

    return hasDirectAttendance || hasPunchData;
  });

  logger.logStep(`Found ${rowsWithAttendanceData.length} Txns2 rows with potential attendance data`, 'completed');

  rowsWithAttendanceData.forEach((row: any, index: number) => {
    try {
      const shiftName = String(row['Shift name'] || '').trim();
      const compoundShift = (String(row['Compound shift'] || '').trim()) || 'None';

      // Find employee code by matching shift name and compound shift (empty compound shift treated as "None")
      const combinationKey = `${shiftName}:${compoundShift}`;
      const employeeCode = shiftCombinationMap.get(combinationKey);

      if (!employeeCode) {
        logger.logStep(`Txns2 Row ${index + 1}: No employee found for combination: ${combinationKey}, skipping`, 'error');
        errorCount += 1;
        return;
      }

      // Check if Txns2 has direct attendance fields (Status, Working hours, Att. Date)
      const status = String(row['Status'] || '').trim();
      const workingHours = String(row['Working hours'] || '').trim();
      const attDate = String(row['Att. Date'] || '').trim();

      if (status.length > 0 && workingHours.length > 0 && attDate.length > 0) {
        // Direct attendance data available
        let dateKey: string;
        try {
          dateKey = parseLocalDate(attDate.trim());
        } catch {
          logger.logStep(`Txns2 Row ${index + 1}: Invalid Att. Date: ${attDate}, skipping`, 'error');
          errorCount += 1;
          return;
        }

        const workingHoursSeconds = convertTimeToSeconds(workingHours);

        const expectedData = {
          employee_code: employeeCode,
          attendance_date: dateKey,
          expected_status: status,
          expected_total_work_seconds: workingHoursSeconds,
          shift_name: shiftName,
          compound_shift: compoundShift,
          source: 'txns2',
          row_index: index + 1,
        };

        // Log processed expected data from Excel
        logger.logSubStep(`Expected Data (from Excel): employee_code='${expectedData.employee_code}', attendance_date='${expectedData.attendance_date}'`, 'completed');
        logger.logSubStep(`Expected Data (from Excel): expected_status='${expectedData.expected_status}', expected_total_work_seconds=${expectedData.expected_total_work_seconds} (${Math.round((expectedData.expected_total_work_seconds / 3600) * 100) / 100}h)`, 'completed');
        logger.logSubStep(`Expected Data (from Excel): shift_name='${expectedData.shift_name}', compound_shift='${expectedData.compound_shift}'`, 'completed');
        logger.logSubStep(`--- Verification will compare this expected data with API response data ---`, 'completed');

        expectedAttendanceData.push(expectedData);
      } else {
        // Calculate attendance from punch pairs
        const attDateStr = String(row['Att. Date'] || '').trim();
        if (!attDateStr) {
          logger.logStep(`Txns2 Row ${index + 1}: No Att. Date found for punch calculation, skipping`, 'error');
          errorCount += 1;
          return;
        }

        let dateKey: string;
        try {
          dateKey = parseLocalDate(attDateStr.trim());
        } catch {
          logger.logStep(`Txns2 Row ${index + 1}: Invalid Att. Date: ${attDateStr}, skipping`, 'error');
          errorCount += 1;
          return;
        }

        // Collect all punch times for this date
        const punchTimes: number[] = [];

        // Check for punch pairs (up to Type6/Time6)
        for (let punchIndex = 1; punchIndex <= 6; punchIndex++) {
          const timeKey = `Time${punchIndex}`;
          const timeValue = String(row[timeKey] || '').trim();

          if (timeValue) {
            try {
              // Parse time and convert to timestamp for duration calculation
              const punchTime = new Date(timeValue).getTime();
              punchTimes.push(punchTime);
            } catch {
              logger.logStep(`Txns2 Row ${index + 1}: Invalid Time${punchIndex}: ${timeValue}, skipping this punch`, 'error');
              errorCount += 1;
            }
          }
        }

        if (punchTimes.length >= 2) {
          // Sort punch times and calculate total working time
          punchTimes.sort((a, b) => a - b);
          let totalWorkSeconds = 0;

          // Pair punches: in-out, in-out, etc.
          for (let i = 0; i < punchTimes.length - 1; i += 2) {
            const inTime = punchTimes[i];
            const outTime = punchTimes[i + 1];
            if (outTime > inTime) {
              totalWorkSeconds += Math.round((outTime - inTime) / 1000);
            }
          }

          // Determine status based on working hours and punch count
          let calculatedStatus = 'A'; // Absent by default
          if (totalWorkSeconds > 0) {
            // If there's any working time, mark as present
            calculatedStatus = 'P';
          }

          expectedAttendanceData.push({
            employee_code: employeeCode,
            attendance_date: dateKey,
            expected_status: calculatedStatus,
            expected_total_work_seconds: totalWorkSeconds,
            shift_name: shiftName,
            compound_shift: compoundShift,
            source: 'txns2',
            row_index: index + 1,
          });
        } else {
          // Single punch or no punches: skip row for verification (incomplete data), do not fail the step
          logger.logStep(`Txns2 Row ${index + 1}: Not enough punch data (${punchTimes.length} punches), skipping`, 'completed');
        }
      }
    } catch (error: any) {
      logger.logStep(`Txns2 Row ${index + 1}: Error processing attendance row - ${error.message}`, 'error');
      errorCount += 1;
    }
  });

  logger.logStep(`Txns2 attendance processing completed: ${expectedAttendanceData.length} attendance records prepared`, 'completed');
  if (errorCount > 0) {
    logger.logStep(`Txns2 — Errors in this step: ${errorCount}`, 'error');
    throw new Error(`Txns2 attendance processing had ${errorCount} error(s). Step failed.`);
  }
  return expectedAttendanceData;
}
