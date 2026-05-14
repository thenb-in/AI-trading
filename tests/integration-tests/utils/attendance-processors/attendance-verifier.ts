import { utcToLocalDateString } from '../../helpers/dateUtils';
import { buildDetailedAttendanceReportUrl } from '../../helpers/reportUrl';
import { ExpectedAttendanceData } from '../attendance-utils';

export interface VerificationResult {
  employee_code: string;
  /** Employee id from report (for report URL filter). */
  employee_id?: string | number;
  attendance_date: string;
  shift_name: string;
  expected_status: string;
  actual_status: string;
  expected_work_seconds: number;
  actual_work_seconds: number;
  status_match: boolean;
  work_seconds_match: boolean;
  overall_match: boolean;
}

export interface VerifyAttendanceReturn {
  verificationResults: VerificationResult[];
  invalidRecordCount: number;
}

/**
 * Verify attendance data against API and return results (no expect). Used when spec runs per-case tests.
 */
export async function verifyAttendanceDataAndReturnResults(
  expectedAttendanceData: ExpectedAttendanceData[],
  apiClient: any,
  logger: any,
  sourceName: string
): Promise<VerifyAttendanceReturn> {
  logger.logStep(`\n--- Processing ${expectedAttendanceData.length} ${sourceName} attendance records ---`, 'completed');

  const dateStrings: string[] = expectedAttendanceData.map((data) => data.attendance_date);
  const uniqueDates: string[] = [...new Set(dateStrings)].sort();

  if (uniqueDates.length === 0) {
    logger.logStep(`No valid dates found in ${sourceName} attendance data`, 'error');
    throw new Error(`No valid dates found in ${sourceName} attendance data. Step failed.`);
  }

  const startDate: string = uniqueDates[0];
  const endDate: string = uniqueDates[uniqueDates.length - 1];
  logger.logStep(`${sourceName} date range: ${startDate} to ${endDate}`, 'completed');

  const reportOptions = {
    start_date: String(startDate),
    end_date: String(endDate),
    show_working_hours: true,
    show_attendance: true,
    show_attendance_timings: true,
    is_active: true
  };

  logger.logStep(`\n--- ${sourceName}: Fetching API Response Data ---`, 'completed');
  logger.logSubStep(`API Request: start_date='${reportOptions.start_date}', end_date='${reportOptions.end_date}'`, 'completed');

  const { getDetailedAttendanceReport } = await import('../../actions/reports/get-detailed-attendance-report');
  let reportResult;
  try {
    logger.logSubStep(`Calling API: getDetailedAttendanceReport...`, 'completed');
    reportResult = await getDetailedAttendanceReport(apiClient, logger, reportOptions);
  } catch (error: any) {
    logger.logStep(`API call failed: ${error.message}`, 'error');
    throw error;
  }
  if (!reportResult.success || !reportResult.data || !Array.isArray(reportResult.data)) {
    logger.logStep(`${sourceName}: Invalid report response - success=${reportResult.success}`, 'error');
    throw new Error(`${sourceName}: Invalid report response`);
  }

  const attendanceRecords = reportResult.data;
  logger.logStep(`${sourceName}: Retrieved ${attendanceRecords.length} attendance records from API`, 'completed');
  
  // Log sample API response data
  if (attendanceRecords.length > 0) {
    logger.logStep(`\n--- ${sourceName}: Sample API Response Data (first 3 records) ---`, 'completed');
    attendanceRecords.slice(0, 3).forEach((record: any, idx: number) => {
      logger.logSubStep(`API Record ${idx + 1}: employee_code='${record.employee_code || record.employee_name}', date='${record.attendance_date}'`, 'completed');
      logger.logSubStep(`API Record ${idx + 1}: status='${record.status || ''}', work_seconds=${record.total_work_seconds || 0} (${Math.round(((record.total_work_seconds || 0) / 3600) * 100) / 100}h)`, 'completed');
    });
  }

  logger.logStep(`\n--- ${sourceName}: Building Expected Data Map from Excel ---`, 'completed');
  const expectedAttendanceMap = new Map<string, any>();
  expectedAttendanceData.forEach((data) => {
    const mapKey = `${data.employee_code}:${data.attendance_date}`;
    expectedAttendanceMap.set(mapKey, data);
  });
  logger.logStep(`${sourceName}: Created ${expectedAttendanceMap.size} expected attendance records map`, 'completed');
  
  // Log sample expected data from Excel
  if (expectedAttendanceMap.size > 0) {
    logger.logStep(`\n--- ${sourceName}: Sample Expected Data from Excel (first 5 records) ---`, 'completed');
    let keyCount = 0;
    expectedAttendanceMap.forEach((data, key) => {
      if (keyCount < 5) {
        logger.logSubStep(`Expected ${keyCount + 1}: Key='${key}'`, 'completed');
        logger.logSubStep(`Expected ${keyCount + 1}: employee_code='${data.employee_code}', date='${data.attendance_date}', status='${data.expected_status}', work_seconds=${data.expected_total_work_seconds} (${Math.round((data.expected_total_work_seconds / 3600) * 100) / 100}h)`, 'completed');
        keyCount++;
      }
    });
  }

  logger.logStep(`\n--- ${sourceName}: Starting Verification Process ---`, 'completed');
  logger.logSubStep(`Comparing ${attendanceRecords.length} API records against ${expectedAttendanceMap.size} expected Excel records`, 'completed');

  const verificationResults: VerificationResult[] = [];
  let invalidRecordCount = 0;
  let matchedCount = 0;

  attendanceRecords.forEach((record: any, recordIndex: number) => {
    const employeeCode = record.employee_code || record.employee_name;
    const attendanceDateStr = record.attendance_date;

    if (!employeeCode || !attendanceDateStr) {
      logger.logStep(`API Record ${recordIndex + 1}: Invalid - missing employee_code or attendance_date`, 'error');
      invalidRecordCount += 1;
      return;
    }

    let dateKey: string;
    try {
      if (attendanceDateStr.includes('T')) {
        dateKey = utcToLocalDateString(attendanceDateStr);
      } else {
        dateKey = attendanceDateStr;
      }
    } catch {
      logger.logStep(`API Record ${recordIndex + 1}: Invalid attendance date: ${attendanceDateStr}`, 'error');
      invalidRecordCount += 1;
      return;
    }

    const mapKey = `${employeeCode}:${dateKey}`;
    const expectedData = expectedAttendanceMap.get(mapKey);
    if (!expectedData) return; // Not in expected list, skip

    // Found a match - now verify
    matchedCount++;
    logger.logStep(`\n═══════════════════════════════════════════════════════════════`, 'completed');
    logger.logStep(`--- ${sourceName}: Verifying Record ${matchedCount} ---`, 'completed');
    logger.logSubStep(`Match Key: '${mapKey}'`, 'completed');
    
    // Show Excel Data (Expected)
    logger.logStep(`\n📊 EXCEL DATA (Expected from Excel):`, 'completed');
    logger.logSubStep(`  Employee Code: '${expectedData.employee_code}'`, 'completed');
    logger.logSubStep(`  Attendance Date: '${expectedData.attendance_date}'`, 'completed');
    logger.logSubStep(`  Shift Name: '${expectedData.shift_name || ''}'`, 'completed');
    logger.logSubStep(`  Compound Shift: '${expectedData.compound_shift || ''}'`, 'completed');
    logger.logSubStep(`  Expected Status: '${expectedData.expected_status}'`, 'completed');
    logger.logSubStep(`  Expected Work Seconds: ${expectedData.expected_total_work_seconds}s (${Math.round((expectedData.expected_total_work_seconds / 3600) * 100) / 100}h)`, 'completed');
    logger.logSubStep(`  Source: '${expectedData.source || 'unknown'}'`, 'completed');
    logger.logSubStep(`  Row Index: ${expectedData.row_index || 'N/A'}`, 'completed');
    
    // Show API Response Data (Actual)
    logger.logStep(`\n🌐 API RESPONSE DATA (Actual from API):`, 'completed');
    logger.logSubStep(`  Employee Code: '${employeeCode}'`, 'completed');
    logger.logSubStep(`  Attendance Date: '${dateKey}'`, 'completed');
    logger.logSubStep(`  Actual Status: '${record.status || ''}'`, 'completed');
    logger.logSubStep(`  Actual Work Seconds: ${record.total_work_seconds || 0}s (${Math.round(((record.total_work_seconds || 0) / 3600) * 100) / 100}h)`, 'completed');
    logger.logSubStep(`  Employee ID: ${record.employee_id ?? record.emp_id ?? 'N/A'}`, 'completed');
    
    // Perform verification
    const actualStatus = String(record.status || '').trim();
    const actualWorkSeconds = Number(record.total_work_seconds || 0);
    const expectedStatusNorm = String(expectedData.expected_status || '').trim().toLowerCase();
    const actualStatusNorm = actualStatus.trim().toLowerCase();
    const statusMatch = actualStatusNorm === expectedStatusNorm;
    const workSecondsDiff = Math.abs(actualWorkSeconds - expectedData.expected_total_work_seconds);
    const workSecondsMatch = workSecondsDiff <= 300;

    // Show How Verification Works
    logger.logStep(`\n🔍 HOW VERIFICATION WORKS:`, 'completed');
    logger.logSubStep(`  1. Status Verification:`, 'completed');
    logger.logSubStep(`     - Compare: Expected '${expectedData.expected_status}' (normalized: '${expectedStatusNorm}') vs Actual '${actualStatus}' (normalized: '${actualStatusNorm}')`, 'completed');
    logger.logSubStep(`     - Method: Case-insensitive string comparison (toLowerCase())`, 'completed');
    logger.logSubStep(`     - Result: ${statusMatch ? '✓ MATCH' : '✗ MISMATCH'}`, statusMatch ? 'completed' : 'error');
    
    logger.logSubStep(`  2. Work Seconds Verification:`, 'completed');
    logger.logSubStep(`     - Compare: Expected ${expectedData.expected_total_work_seconds}s vs Actual ${actualWorkSeconds}s`, 'completed');
    logger.logSubStep(`     - Difference: ${workSecondsDiff}s (${Math.round((workSecondsDiff / 60) * 100) / 100} minutes)`, 'completed');
    logger.logSubStep(`     - Tolerance: ±300 seconds (5 minutes)`, 'completed');
    logger.logSubStep(`     - Method: |Actual - Expected| <= 300`, 'completed');
    logger.logSubStep(`     - Calculation: |${actualWorkSeconds} - ${expectedData.expected_total_work_seconds}| = ${workSecondsDiff} <= 300 ? ${workSecondsMatch ? 'YES' : 'NO'}`, 'completed');
    logger.logSubStep(`     - Result: ${workSecondsMatch ? '✓ MATCH' : '✗ MISMATCH'}`, workSecondsMatch ? 'completed' : 'error');
    
    const overallMatch = statusMatch && workSecondsMatch;
    logger.logStep(`\n✅ VERIFICATION RESULT:`, overallMatch ? 'completed' : 'error');
    logger.logSubStep(`  Status Match: ${statusMatch ? '✓ PASS' : '✗ FAIL'}`, statusMatch ? 'completed' : 'error');
    logger.logSubStep(`  Work Seconds Match: ${workSecondsMatch ? '✓ PASS' : '✗ FAIL'}`, workSecondsMatch ? 'completed' : 'error');
    logger.logSubStep(`  Overall Result: ${overallMatch ? '✓ PASS - All checks passed' : '✗ FAIL - One or more checks failed'}`, overallMatch ? 'completed' : 'error');
    logger.logStep(`═══════════════════════════════════════════════════════════════`, 'completed');

    const employeeId = record.employee_id ?? record.emp_id;
    verificationResults.push({
      employee_code: employeeCode,
      employee_id: employeeId != null ? employeeId : undefined,
      attendance_date: dateKey,
      shift_name: expectedData.shift_name || '',
      expected_status: expectedData.expected_status,
      actual_status: actualStatus,
      expected_work_seconds: expectedData.expected_total_work_seconds,
      actual_work_seconds: actualWorkSeconds,
      status_match: statusMatch,
      work_seconds_match: workSecondsMatch,
      overall_match: overallMatch
    });
  });

  logger.logStep(`\n--- ${sourceName}: Verification Summary ---`, 'completed');
  logger.logSubStep(`Total API records processed: ${attendanceRecords.length}`, 'completed');
  logger.logSubStep(`Records matched for verification: ${matchedCount}`, 'completed');
  logger.logSubStep(`Records not in expected list: ${attendanceRecords.length - matchedCount - invalidRecordCount}`, 'completed');
  logger.logSubStep(`Invalid records: ${invalidRecordCount}`, invalidRecordCount > 0 ? 'error' : 'completed');
  logger.logSubStep(`Verification results created: ${verificationResults.length}`, 'completed');

  return { verificationResults, invalidRecordCount };
}

/**
 * Verify attendance data against API for a specific source (logs and expects).
 */
export async function verifyAttendanceData(
  expectedAttendanceData: ExpectedAttendanceData[],
  apiClient: any,
  logger: any,
  sourceName: string
) {
  const { verificationResults, invalidRecordCount } = await verifyAttendanceDataAndReturnResults(
    expectedAttendanceData,
    apiClient,
    logger,
    sourceName
  );

  const totalVerified = verificationResults.length;
  const passedRecords = verificationResults.filter(r => r.overall_match);
  const failedRecords = verificationResults.filter(r => !r.overall_match);
  const statusMatches = verificationResults.filter(r => r.status_match).length;
  const workSecondsMatches = verificationResults.filter(r => r.work_seconds_match).length;
  const overallMatches = passedRecords.length;

  logger.logStep(`\n${sourceName} Verification Results:`, 'completed');
  logger.logSubStep(`Total records verified: ${totalVerified}`, 'completed');
  logger.logSubStep(`Status matches: ${statusMatches}/${totalVerified}`, 'completed');
  logger.logSubStep(`Working hours matches: ${workSecondsMatches}/${totalVerified}`, 'completed');
  logger.logSubStep(`Overall matches: ${overallMatches}/${totalVerified}`, 'completed');

  logger.logStep(`\n=== ${sourceName} PASSED RECORDS (${passedRecords.length}) ===`, 'completed');
  if (passedRecords.length === 0) {
    logger.logSubStep(`No ${sourceName} records passed verification`, 'error', 'Zero records passed');
  }
  logger.logSubStep(`Total ${sourceName} PASSED: ${passedRecords.length}`, 'completed');

  logger.logStep(`\n=== ${sourceName} FAILED RECORDS (${failedRecords.length}) ===`, failedRecords.length > 0 ? 'error' : 'completed');
  if (failedRecords.length > 0) {
    const dates = verificationResults.map(r => r.attendance_date).sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const firstFailed = failedRecords[0];
    const employeeParam = firstFailed.employee_id;
    const reportUrl = buildDetailedAttendanceReportUrl(startDate, endDate, employeeParam);
    logger.logSubStep(`View Detailed Attendance Report: ${reportUrl}`, 'error');
    failedRecords.forEach(record => {
      const isStatusError = !record.status_match;
      const isWorkError = !record.work_seconds_match;
      const reasons: string[] = [];
      if (isStatusError) {
        reasons.push(`Status: expected '${record.expected_status}', got '${record.actual_status}'`);
      }
      if (isWorkError) {
        reasons.push(
          `Work hours: expected ${Math.round((record.expected_work_seconds / 3600) * 100) / 100}h (${record.expected_work_seconds}s), got ${Math.round((record.actual_work_seconds / 3600) * 100) / 100}h (${record.actual_work_seconds}s)`
        );
      }
      logger.logSubStep(
        `FAIL: ${record.employee_code} on ${record.attendance_date} (${record.shift_name})`,
        'error',
        reasons.join('; ')
      );
    });
  } else {
    logger.logSubStep(`No ${sourceName} records failed verification`, 'completed');
  }
  logger.logSubStep(`Total ${sourceName} FAILED: ${failedRecords.length}`, failedRecords.length > 0 ? 'error' : 'completed');

  const statusMismatchCount = failedRecords.filter(r => !r.status_match).length;
  const workHoursMismatchCount = failedRecords.filter(r => !r.work_seconds_match).length;
  const errorCount = failedRecords.length;
  logger.logSubStep(
    `Errors in this step: ${errorCount} (status mismatches: ${statusMismatchCount}, work hours mismatches: ${workHoursMismatchCount})`,
    errorCount > 0 ? 'error' : 'completed'
  );

  if (invalidRecordCount > 0) {
    logger.logStep(`${sourceName} — Invalid records in this step: ${invalidRecordCount}`, 'error');
    expect(invalidRecordCount).toBe(0);
  }
  if (totalVerified > 0 && errorCount > 0) {
    expect(failedRecords.length).toBe(0);
  }
  if (totalVerified > 0 && errorCount === 0) {
    const statusMatchPercentage = (statusMatches / totalVerified) * 100;
    const workSecondsMatchPercentage = (workSecondsMatches / totalVerified) * 100;
    logger.logSubStep(
      `${sourceName} results: ${statusMatchPercentage.toFixed(1)}% status matches, ${workSecondsMatchPercentage.toFixed(1)}% working hours matches within tolerance`,
      'completed'
    );
  } else if (totalVerified === 0) {
    logger.logSubStep(`No ${sourceName} records to verify`, 'completed');
  }
}

