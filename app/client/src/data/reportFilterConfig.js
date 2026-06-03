import { dateFiltersYesterday, commonFilters, userBasedFilters, TODAY } from './filterConfig';

const standardReportFilters = [...dateFiltersYesterday, ...commonFilters];
const userBasedReportFilters = [...dateFiltersYesterday, ...userBasedFilters];

const DefaultReportFilters = standardReportFilters;

// Reports scoped by system user (field sales, call buddy) — drop Employee /
// Department / Cost Center, surface a single User picker instead.
const CallBuddyReportFilters = userBasedReportFilters;

const CheckInOutReportFilters = [
  ...standardReportFilters,
  { name: 'show_shift_details', label: 'Shift Details', type: 'checkbox', default: false, is_standard: false, order: 1 },
  { name: 'show_missing_punches', label: 'Missing Punches', type: 'checkbox', default: false, is_standard: false, order: 2 },
];

const DetailedAttendanceReportFilters = [
  ...standardReportFilters,
  { name: 'is_horizontal', label: 'Horizontal View', type: 'checkbox', default: false, is_standard: false, order: 1 },
  { name: 'show_attendance', label: 'Show Attendance', type: 'checkbox', default: true, is_standard: false, order: 2 },
  { name: 'show_attendance_timings', label: 'Show Timings', type: 'checkbox', default: false, is_standard: false, order: 3 },
  { name: 'show_factor', label: 'Show Factor', type: 'checkbox', default: false, is_standard: false, order: 4 },
  { name: 'show_working_hours', label: 'Working Hours', type: 'checkbox', default: true, is_standard: false, order: 5 },
  { name: 'show_ot_short', label: 'OT & Short Hrs', type: 'checkbox', default: true, is_standard: false, order: 6 },
  { name: 'show_late_early', label: 'Late & Early Hrs', type: 'checkbox', default: false, is_standard: false, order: 7 },
  { name: 'show_shift_details', label: 'Shift Details', type: 'checkbox', default: true, is_standard: false, order: 8 },
  { name: 'show_summary_view', label: 'Summary View', type: 'checkbox', default: true, is_standard: false, order: 10 },
  { name: 'is_print_view', label: 'Print View', type: 'checkbox', default: false, is_standard: false, order: 11 },
  { name: 'is_manual', label: 'Manual Attendance', type: 'checkbox', default: true, is_standard: false, order: 12 },
  { name: 'is_debug_mode', label: 'Debug Mode', type: 'checkbox', default: true, is_standard: false, order: 13, debug: true },
  { name: 'is_working_on_leave', label: 'Working On Leave', type: 'checkbox', default: false, is_standard: false, order: 14 },
  { name: 'is_lock', label: 'Lock Status', type: 'select', default: 'all', is_standard: true, order: 5.1, alwaysInclude: true,
    options: [
      { value: 'all', label: 'All' },
      { value: 'locked', label: 'Locked' },
      { value: 'unlock', label: 'Unlock' },
    ],
  },
];

let salary_order = 0;
const SalaryRegisterReportFilters = [
  ...standardReportFilters,
  { name: 'is_horizontal', label: 'Horizontal View', type: 'checkbox', default: false, hidden: true, is_standard: false, order: ++salary_order },
  { name: 'show_attendance', label: 'Show Attendance', type: 'checkbox', default: true, is_standard: false, order: ++salary_order },
  { name: 'show_factor', label: 'Show Factor', type: 'checkbox', default: false, is_standard: false, order: ++salary_order },
  { name: 'show_attendance_timings', label: 'Show Timings', type: 'checkbox', default: false, is_standard: false, order: ++salary_order },
  { name: 'show_working_hours', label: 'Working Hours', type: 'checkbox', default: false, is_standard: false, order: ++salary_order },
  { name: 'show_ot_short', label: 'OT & Short Hrs', type: 'checkbox', default: false, is_standard: false, order: ++salary_order },
  { name: 'show_late_early', label: 'Late & Early Hrs', type: 'checkbox', default: false, is_standard: false, order: ++salary_order },
  { name: 'show_shift_details', label: 'Shift Details', type: 'checkbox', default: false, is_standard: false, order: ++salary_order },
  { name: 'show_summary_view', label: 'Summary View', type: 'checkbox', default: true, is_standard: false, order: ++salary_order },
  { name: 'is_print_view', label: 'Print View', type: 'checkbox', default: false, is_standard: false, order: ++salary_order },
  { name: 'is_debug_mode', label: 'Debug Mode', type: 'checkbox', default: true, is_standard: false, order: ++salary_order, debug: true },
];

const deactivationUserReportFilters = [
  ...standardReportFilters,
  { name: 'deactivate_zero_punches', label: 'Deactivate Zero Punches', type: 'checkbox', default: false, is_standard: false, order: 1 },
  { name: 'check_face_errors', label: 'Check Face Errors', type: 'checkbox', default: false, is_standard: false, order: 2 },
];

const RawPunchFilters = [
  ...standardReportFilters,
  { name: 'is_manual', label: 'Manual Punches', type: 'checkbox', default: true, is_standard: false, order: 1 },
];

// Canteen Token Print Master: read-only list of canteen-machine punches.
// Standard date + employee/department filters; no extra toggles. Operators
// watch the current day's tokens, so the end date defaults to today (start
// stays yesterday).
const CanteenTokenFilters = standardReportFilters.map((f) =>
  f.name === 'end_date' ? { ...f, default: TODAY } : f
);

const TransactionReportFilters = [
  ...standardReportFilters,
  { name: 'raw_punch', label: 'Raw Punch', type: 'checkbox', default: true, is_standard: false, order: 1 },
  { name: 'has_direction_conflict', label: 'Direction Conflicts', type: 'checkbox', default: false, is_standard: false, order: 2 },
];

const FinalWageReportForContractorFilters = [
  ...standardReportFilters,
  { name: 'is_debug_mode', label: 'Debug Mode', type: 'checkbox', default: true, is_standard: false, order: 1, debug: true },
];

const DailySalesPersonReportFilters = [
  ...userBasedReportFilters,
  { name: 'compute_if_missing', label: 'Compute if not in DB', type: 'checkbox', default: false, is_standard: false, order: 1 },
  { name: 'is_debug_mode', label: 'Debug Mode', type: 'checkbox', default: true, is_standard: false, order: 2, debug: true },
];

const SalesActivityReportFilters = [
  ...userBasedReportFilters,
  { name: 'compute_if_missing', label: 'Compute if not in DB', type: 'checkbox', default: false, is_standard: false, order: 1 },
  { name: 'is_debug_mode', label: 'Debug Mode', type: 'checkbox', default: true, is_standard: false, order: 2, debug: true },
];

export {
  DefaultReportFilters,
  CheckInOutReportFilters,
  DetailedAttendanceReportFilters,
  SalaryRegisterReportFilters,
  deactivationUserReportFilters,
  RawPunchFilters,
  CanteenTokenFilters,
  TransactionReportFilters,
  FinalWageReportForContractorFilters,
  DailySalesPersonReportFilters,
  CallBuddyReportFilters,
  SalesActivityReportFilters,
};
