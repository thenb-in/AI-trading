/**
 * Expected attendance data structure
 */
export interface ExpectedAttendanceData {
  employee_code: string;
  attendance_date: string;
  expected_status: string;
  expected_total_work_seconds: number;
  shift_name: string;
  compound_shift: string;
  source: string;
  row_index: number;
}

// Re-export functions from separate processors
export { processTxns1Attendance } from './attendance-processors/txns1-attendance-processor';
export { processTxns2Attendance } from './attendance-processors/txns2-attendance-processor';
export {
  verifyAttendanceData,
  verifyAttendanceDataAndReturnResults,
  type VerificationResult,
  type VerifyAttendanceReturn,
} from './attendance-processors/attendance-verifier';
