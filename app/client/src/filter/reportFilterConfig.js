import { dateFiltersYesterday, commonFilters, userBasedFilters, TODAY } from './filterConfig';

const standardReportFilters = [...dateFiltersYesterday, ...commonFilters];
const userBasedReportFilters = [...dateFiltersYesterday, ...userBasedFilters];

const DefaultReportFilters = standardReportFilters;
const SalaryChangeReportFilters = [
  ...standardReportFilters,
  { name: 'include_unchanged', label: 'Include Unchanged', type: 'checkbox', default: false, is_standard: false, order: 7 },
  { name: 'is_debug_mode', label: 'Debug Mode', type: 'checkbox', default: true, is_standard: false, order: 2, debug: true },
];

// Reports scoped by system user (field sales, call buddy) — drop Employee /
// Department / Cost Center, surface a single User picker instead.
const CallBuddyReportFilters = userBasedReportFilters;

const LocationLogReportFilters = userBasedReportFilters;

const HaltPointsReportFilters = [
  ...userBasedReportFilters,
  { name: 'halt_min_minutes', label: 'Stopped For At Least (min)', type: 'number', default: 5, is_standard: true, order: 4 },
  { name: 'fetch_address', label: 'Refetch Address', type: 'checkbox', default: false, is_standard: false, order: 5 },
];

const IdentifyOfficerReportFilters = [
  ...userBasedReportFilters,
  { name: 'event_type', label: 'Event', type: 'select', default: 'all', is_standard: true, order: 4,
    options: [
      { value: 'all', label: 'All' },
      { value: 'start', label: 'Start' },
      { value: 'reachedMilestone', label: 'Reached' },
      { value: 'stop', label: 'Stop' },
    ],
  },
];

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
  // "Look out" lists what is worth checking on a day — a withheld weekly off, a late
  // penalty, a mispunch — so a red cell can be answered without opening four screens.
  // Ordinary days say nothing, so the column only speaks up where it has something to add.
  { name: 'show_reason', label: 'Why?', type: 'checkbox', default: false, is_standard: false, order: 9 },
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
  // Same day-wise "Look out" notes as the Detailed Attendance Report — the salary
  // register is where the question usually gets asked about a paid day.
  { name: 'show_reason', label: 'Why?', type: 'checkbox', default: false, is_standard: false, order: ++salary_order },
  { name: 'is_print_view', label: 'Print View', type: 'checkbox', default: false, is_standard: false, order: ++salary_order },
  { name: 'is_debug_mode', label: 'Debug Mode', type: 'checkbox', default: true, is_standard: false, order: ++salary_order, debug: true },
];

const deactivationUserReportFilters = [
  ...standardReportFilters,
  { name: 'deactivate_zero_punches', label: 'Deactivate Zero Punches', type: 'checkbox', default: false, is_standard: false, order: 1 },
  { name: 'check_face_errors', label: 'Check Face Errors', type: 'checkbox', default: false, is_standard: false, order: 2 },
];

// Employee Lifecycle Report: date range + standard employee/department/cost
// center filters, shared by both tabs (Additions / Deletions). The window is
// interpreted against the joining date (hire_date) for additions and the
// deactivation event time (audit log) for deletions. The "Is Active" toggle is
// dropped because each tab is, by definition, scoped to one lifecycle event and
// surfaces current status via a dedicated column instead.
//
// "Basis Punch Date" re-reads the window against the first punch instead of the
// joining date, for sites whose joining dates were filled in later — or never —
// and whose punches are the real record of when people started.
const EmployeeLifecycleReportFilters = [
  ...standardReportFilters.filter((f) => f.name !== 'is_active'),
  { name: 'basis_punch_date', label: 'Basis Punch Date', type: 'checkbox', default: false, is_standard: false, order: 1 },
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

// Canteen Report: the same punch list, plus a repeat-punch collapse. A second
// punch for the same meal within 10 minutes is the machine (or the employee)
// repeating itself, not a second meal — on by default so counts and meal
// amounts stay honest. Untick it to see every raw punch.
const CanteenReportFilters = [
  ...CanteenTokenFilters,
  { name: 'compress_repeat_punch', label: 'Compress Repeat Punch', type: 'checkbox', default: true, is_standard: false, order: 1 },
];

const TransactionReportFilters = [
  ...standardReportFilters,
  { name: 'raw_punch', label: 'Raw Punch', type: 'checkbox', default: true, is_standard: false, order: 1 },
  { name: 'has_direction_conflict', label: 'Direction Conflicts', type: 'checkbox', default: false, is_standard: false, order: 2 },
  { name: 'fetch_address', label: 'Refetch Address', type: 'checkbox', default: false, is_standard: false, order: 3 },
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

// Vastram Daily Performance: a single-day operational view — both bounds
// default to today so staff see the current day's customers/sales on open.
const VastramDailyPerformanceReportFilters = standardReportFilters.map((f) =>
  f.name === 'start_date' || f.name === 'end_date' ? { ...f, default: TODAY } : f
);

// ── Readiness reports ───────────────────────────────────────────────────────
// "Is the data right, before this run / this close?" Each defaults to showing
// only the rows that need work, because that is how they are read 95% of the
// time; untick to get the full population, which is what an audit or a
// completeness percentage needs.

// Payroll Readiness: the requirement toggles are not cosmetic. A site outside
// ESIC's wage ceiling has no use for an ESIC column, and a permanently blank
// column is how a report stops being read.
const PayrollReadinessReportFilters = [
  ...standardReportFilters,
  { name: 'only_incomplete', label: 'Only Incomplete', type: 'checkbox', default: true, is_standard: false, order: 1 },
  { name: 'payroll_only', label: 'On Payroll Only', type: 'checkbox', default: true, is_standard: false, order: 2 },
  { name: 'require_bank', label: 'Require Bank Details', type: 'checkbox', default: true, is_standard: false, order: 3 },
  { name: 'require_statutory', label: 'Require Statutory IDs', type: 'checkbox', default: true, is_standard: false, order: 4 },
  { name: 'require_salary', label: 'Require Salary Structure', type: 'checkbox', default: true, is_standard: false, order: 5 },
  // Off by default: the report is normally about everyone on payroll, not
  // about a joining window. On, the date range reads against the joining date
  // — which is how the checklist asks for "joiners of the last 30 days".
  { name: 'joined_in_range', label: 'Only Joiners In Range', type: 'checkbox', default: false, is_standard: false, order: 6 },
];

// Employment Age Compliance: a "who is at risk right now" question, so the date
// range is irrelevant — age is read against today. Adults are excluded by
// default because they are the overwhelming majority of any roster and would
// bury the handful of rows this report exists to surface.
const EmploymentAgeComplianceReportFilters = [
  ...standardReportFilters.filter((f) => f.name !== 'start_date' && f.name !== 'end_date'),
  { name: 'only_non_compliant', label: 'Only Non-Compliant', type: 'checkbox', default: true, is_standard: false, order: 1 },
  { name: 'include_adults', label: 'Include Adults', type: 'checkbox', default: false, is_standard: false, order: 2 },
];


const RosterCoverageReportFilters = [
  ...standardReportFilters
    .filter((filter) => filter.name !== 'end_date')
    .map((filter) => (filter.name === 'start_date' ? { ...filter, label: 'As On Date' } : filter)),
  { name: 'only_gaps', label: 'Only Gaps', type: 'checkbox', default: true, is_standard: false, order: 1 },
  { name: 'expiring_within_days', label: 'Expiring Within (days)', type: 'number', default: 7, is_standard: false, order: 2 },
];

// Pending Approvals: one grid across attendance corrections, manual punches
// and gate passes. "Waiting At Least" is the ageing filter — everything is
// pending, the question is what has been pending too long.
const PendingApprovalsReportFilters = [
  ...standardReportFilters.filter((f) => f.name !== 'start_date' && f.name !== 'end_date'),
  { name: 'request_type', label: 'Request Type', type: 'select', default: 'all', is_standard: true, order: 0.5, alwaysInclude: true,
    options: [
      { value: 'all', label: 'All' },
      { value: 'Attendance correction', label: 'Attendance Correction' },
      { value: 'Manual punch', label: 'Manual Punch' },
      { value: 'Gate pass', label: 'Gate Pass' },
    ],
  },
  { name: 'min_waiting_days', label: 'Waiting At Least (days)', type: 'number', default: 0, is_standard: true, order: 0.6 },
];

// Terminal Health: devices, not employees — the employee/department scoping
// filters have nothing to bind to, so they are dropped entirely.
const TerminalHealthReportFilters = [
  { name: 'only_silent', label: 'Only Silent', type: 'checkbox', default: true, is_standard: false, order: 1 },
  { name: 'include_disabled', label: 'Include Disabled', type: 'checkbox', default: false, is_standard: false, order: 2 },
];

// Advance Recovery: "what is still owed" is a timeless question, so the date
// range is off unless explicitly applied — it filters by when the advance was
// given, which is rarely what is being asked.
const AdvanceRecoveryReportFilters = [
  ...standardReportFilters,
  { name: 'only_overdue', label: 'Only Overdue', type: 'checkbox', default: true, is_standard: false, order: 1 },
  { name: 'ignore_date_range', label: 'Ignore Date Range', type: 'checkbox', default: true, is_standard: false, order: 2 },
];

// Area-wise Headcount: "how many people are at each site, right now". A date
// range would answer a different question — headcount as of a past month needs
// a joining/leaving reconstruction this report deliberately does not do — so
// the range is dropped rather than accepted and ignored.
//
// Areas holding nobody are hidden by default: a company sets up an area before
// it staffs one, and a run of zero rows at the top is how a report stops being
// read. "Only Uncovered" turns the same grid into the worklist — sites with
// people and no terminal to collect their attendance.
const AreaHeadcountReportFilters = [
  ...standardReportFilters.filter((f) => f.name !== 'start_date' && f.name !== 'end_date'),
  { name: 'include_empty_areas', label: 'Include Empty Areas', type: 'checkbox', default: false, is_standard: false, order: 1 },
  { name: 'only_uncovered', label: 'Only Uncovered', type: 'checkbox', default: false, is_standard: false, order: 2 },
];

// Multi-location HR ------------------------------------------------------
//
// Campus Presence is a "right now" question — a date range would answer a
// different one, since presence is decided by today's punches and nothing else.
const CampusPresenceReportFilters = [
  ...standardReportFilters.filter((f) => f.name !== 'start_date' && f.name !== 'end_date'),
  { name: 'include_empty_areas', label: 'Include Empty Sites', type: 'checkbox', default: false, is_standard: false, order: 1 },
];

// Site Attendance Comparison spans a period, because comparing sites on one
// day compares their rosters rather than their discipline.
const SiteAttendanceReportFilters = [
  ...standardReportFilters,
  { name: 'include_empty_areas', label: 'Include Empty Sites', type: 'checkbox', default: false, is_standard: false, order: 1 },
];

// Cross-Site Movement defaults to the people who actually moved: a full roster
// of "Settled" rows is how a worklist stops being read.
const CrossSiteMovementReportFilters = [
  ...standardReportFilters,
  { name: 'only_movers', label: 'Only Movers', type: 'checkbox', default: true, is_standard: false, order: 1 },
];

// Site Coverage defaults to the sites where something is wrong.
const SiteCoverageReportFilters = [
  ...standardReportFilters,
  { name: 'only_gaps', label: 'Only Gaps', type: 'checkbox', default: true, is_standard: false, order: 1 },
];

const CanteenBySiteReportFilters = [
  ...standardReportFilters,
  { name: 'include_empty_areas', label: 'Include Sites With No Meals', type: 'checkbox', default: false, is_standard: false, order: 1 },
];

// Negative Leave Balance: a preset over the Leave Bank Report. Same grid, same
// numbers, filtered to the overdrafts.
const NegativeLeaveBalanceReportFilters = [
  ...standardReportFilters,
  { name: 'only_negative', label: 'Only Negative', type: 'checkbox', default: true, is_standard: false, order: 1 },
];


/**
 * The performance reports read one appraisal round at a time, so the cycle is the primary
 * filter and there is no date range -- the cycle already is the period. Employee, department
 * and designation narrow the group; "Is Active" is dropped because an appraisal belongs to
 * the round it was raised in, not to who is on the payroll today.
 */
const performanceCycleFilter = {
  name: 'cycle_id', label: 'Cycle', type: 'select', options: [], dynamic: true, is_standard: true, order: 1,
};

const performanceReportGroupFilters = commonFilters.filter(
  (filter) => ['employee', 'department', 'position'].includes(filter.name)
);

const AppraisalSummaryReportFilters = [performanceCycleFilter, ...performanceReportGroupFilters];

// Band distribution is a shape, not a list, so it swaps the per-person filters for the
// choice of which axis to count along.
const BandDistributionReportFilters = [
  performanceCycleFilter,
  {
    name: 'group_by',
    label: 'Group By',
    type: 'select',
    default: 'department',
    is_standard: true,
    order: 2,
    options: [
      { value: 'department', label: 'Department' },
      { value: 'position', label: 'Designation' },
    ],
  },
];

// Averaging one KRA across cycles that weighted it differently says nothing, so this report
// takes the cycle alone and the server refuses to blend rounds.
const KraAnalysisReportFilters = [performanceCycleFilter];

const CycleProgressReportFilters = [performanceCycleFilter];

export {
  PayrollReadinessReportFilters,
  EmploymentAgeComplianceReportFilters,
  RosterCoverageReportFilters,
  PendingApprovalsReportFilters,
  TerminalHealthReportFilters,
  AdvanceRecoveryReportFilters,
  AreaHeadcountReportFilters,
  CampusPresenceReportFilters,
  SiteAttendanceReportFilters,
  CrossSiteMovementReportFilters,
  SiteCoverageReportFilters,
  CanteenBySiteReportFilters,
  NegativeLeaveBalanceReportFilters,
  DefaultReportFilters,
  SalaryChangeReportFilters,
  CheckInOutReportFilters,
  VastramDailyPerformanceReportFilters,
  DetailedAttendanceReportFilters,
  SalaryRegisterReportFilters,
  deactivationUserReportFilters,
  EmployeeLifecycleReportFilters,
  RawPunchFilters,
  CanteenTokenFilters,
  CanteenReportFilters,
  TransactionReportFilters,
  FinalWageReportForContractorFilters,
  DailySalesPersonReportFilters,
  CallBuddyReportFilters,
  LocationLogReportFilters,
  HaltPointsReportFilters,
  IdentifyOfficerReportFilters,
  SalesActivityReportFilters,
  AppraisalSummaryReportFilters,
  BandDistributionReportFilters,
  KraAnalysisReportFilters,
  CycleProgressReportFilters,
};
