import {
    FileText,
    Clock,
    AlertTriangle,
    BarChart3,
    IndianRupee,
    UserX,
    Users,
    Shield,
    Building2,
    CalendarDays,
    ScanFace,
    Fingerprint,
    Printer,
    UtensilsCrossed,
    BadgeCheck,
    CalendarCheck,
    Hourglass,
    Router,
    LockOpen,
    TrendingDown,
  } from 'lucide-react';
import { getDefaultReportDateRange, getPrevMonthStartYesterdayRange, getLocalDateStringYmd } from '@utils/dateTimeUtils';

  import { DetailedAttendanceReport } from '../components/report/reports/detailed_attendance/DetailedAttendanceReport';
  import { CheckInOutReport } from '../components/report/reports/check_in_out/CheckInOutReport';
  import { MissingCheckinsReport } from '../components/report/reports/missing_checkins/MissingCheckinsReport';
  import { TransactionReport } from '../components/report/reports/transaction/TransactionReport';
  import { SalaryRegisterReport } from '../components/report/reports/salary_register/SalaryRegisterReport';
  import { SalaryChangeReport } from '../components/report/reports/salary_change/SalaryChangeReport';
  import { DeactivationUserReport } from '../components/report/reports/deactivation_user/DeactivationUserReport';
  import { EmployeeLifecycleReport } from '../components/report/reports/employee_lifecycle/EmployeeLifecycleReport';
  import { ShiftSummaryReport } from '../components/report/reports/shift_summary/ShiftSummaryReport';
import { PFReport } from '../components/report/reports/pf_report/PFReport';
import { ESICReport } from '../components/report/reports/esic_report/ESICReport';
import { LeaveBankReport } from '../components/report/reports/leave_bank/LeaveBankReport';
import { LeaveTransactionReport } from '../components/report/reports/leave_transaction/LeaveTransactionReport';
import { AllLeavesReport } from '../components/report/reports/all_leaves/AllLeavesReport';
import { UnregisteredFacesReport } from '../components/report/reports/unregistered_faces/UnregisteredFacesReport';
import { BiotemplateReport } from '../components/report/reports/biotemplate/BiotemplateReport';
import { CallBuddyReport } from '../components/report/reports/call_buddy/CallBuddyReport';
import { FinalWageReportForContractor } from '../components/report/reports/final_wage_report_for_contractor/FinalWageReportForContractorReport';
import { DailySalesPersonReport } from '../components/report/reports/daily_sales_person/DailySalesPersonReport';
import { SalesActivityReport } from '../components/report/reports/sales_activity/SalesActivityReport';
import { VastramDailyPerformanceReport } from '../components/report/reports/vastram_daily_performance/VastramDailyPerformanceReport';
import { CanteenReport } from '../components/report/reports/canteen/CanteenReport';
import { ReadinessReport } from '../components/report/reports/readiness/ReadinessReport';
import { UnlockedAttendanceReport } from '../components/report/reports/readiness/UnlockedAttendanceReport';
import { NegativeLeaveBalanceReport } from '../components/report/reports/readiness/NegativeLeaveBalanceReport';
// Customer-specific reports. They are declared in custom/ and spread in at the
// end of the list, so this file never grows an entry per customer.
import { CUSTOM_REPORTS } from '@custom/client';
import {
  PayrollReadinessReportFilters,
  RosterCoverageReportFilters,
  PendingApprovalsReportFilters,
  TerminalHealthReportFilters,
  AdvanceRecoveryReportFilters,
  NegativeLeaveBalanceReportFilters,
} from './reportFilterConfig';
const DEFAULT_REPORT_DATE_RANGE = getDefaultReportDateRange();
const TODAY_REPORT_DATE_RANGE = {
  start_date: getLocalDateStringYmd(),
  end_date: getLocalDateStringYmd(),
};
const PREV_MONTH_START_YESTERDAY_RANGE = getPrevMonthStartYesterdayRange();

const MONTHLY_ATTENDANCE_DEFAULT_FILTERS = {
  ...DEFAULT_REPORT_DATE_RANGE,
  is_horizontal: 'true',
  show_attendance: 'true',
  show_attendance_timings: 'false',
  show_working_hours: 'false',
  show_ot_short: 'false',
  show_shift_details: 'false',
  show_summary_view: 'true',
  is_manual: 'true'
};

const MONTHLY_WORK_HOURS_DEFAULT_FILTERS = {
  ...DEFAULT_REPORT_DATE_RANGE,
  is_horizontal: 'true',
  show_attendance: 'false',
  show_attendance_timings: 'false',
  show_working_hours: 'true',
  show_ot_short: 'false',
  show_shift_details: 'false',
  show_summary_view: 'true',
  is_manual: 'true'
};

const DETAILED_HORIZONTAL_DEFAULT_FILTERS = {
  ...DEFAULT_REPORT_DATE_RANGE,
  is_horizontal: 'true',
  show_attendance: 'true',
  show_attendance_timings: 'true',
  show_working_hours: 'true',
  show_ot_short: 'true',
  show_shift_details: 'true',
  show_summary_view: 'true',
  is_manual: 'true'
};

// Print view stacks one parameter row per employee for each ticked detail, so
// every display toggle is on. is_horizontal must stay off: the column builder
// prefers print view while the row formatter prefers horizontal, so enabling
// both yields columns and rows from different views.
const PRINTABLE_ATTENDANCE_DEFAULT_FILTERS = {
  ...DEFAULT_REPORT_DATE_RANGE,
  is_print_view: 'true',
  is_horizontal: 'false',
  show_attendance: 'true',
  show_attendance_timings: 'true',
  show_factor: 'true',
  show_working_hours: 'true',
  show_ot_short: 'true',
  show_late_early: 'true',
  show_shift_details: 'true',
  show_summary_view: 'true',
  is_manual: 'true'
};

  const reports = [
    {
      id: 'detailed-attendance-report',
      title: 'Daily Attendance Report',
      slug: 'detailed-attendance-report',
      permissionName: 'read_detailed-attendance-report', // Maps to server permission name
      desc: 'Comprehensive daily attendance information for all employees with detailed analytics',
      category: 'attendance',
      color: 'blue',
      icon: FileText,
      component: DetailedAttendanceReport,
    },
    {
      id: 'monthly-attendance-report',
      title: 'Monthly Attendance Report',
      slug: 'monthly-attendance-report',
      permissionName: 'read_monthly-attendance-report',
      desc: 'Horizontal monthly attendance view highlighting daily status and summary',
      category: 'attendance',
      color: 'blue',
      icon: Clock,
      component: DetailedAttendanceReport,
      defaultFilters: MONTHLY_ATTENDANCE_DEFAULT_FILTERS,
    },
    {
      id: 'monthly-work-hours-report',
      title: 'Monthly Work Hours Report',
      slug: 'monthly-work-hours-report',
      permissionName: 'read_monthly-work-hours-report',
      desc: 'Horizontal monthly layout focused on working hours per day with summary and manual attendance',
      category: 'attendance',
      color: 'blue',
      icon: BarChart3,
      component: DetailedAttendanceReport,
      defaultFilters: MONTHLY_WORK_HOURS_DEFAULT_FILTERS,
    },
    {
      id: 'detailed-horizontal-report',
      title: 'Detailed Horizontal Report',
      slug: 'detailed-horizontal-report',
      permissionName: 'read_detailed-horizontal-report',
      desc: 'Horizontal view with attendance, timings, working hours, OT/short, shift details, and summary',
      category: 'attendance',
      color: 'blue',
      icon: Clock,
      component: DetailedAttendanceReport,
      defaultFilters: DETAILED_HORIZONTAL_DEFAULT_FILTERS,
    },
    {
      id: 'printable-attendance-report',
      title: 'Printable Attendance Report',
      slug: 'printable-attendance-report',
      permissionName: 'read_printable-attendance-report',
      desc: 'Print-ready layout with attendance, timings, working hours, OT/short, late/early, factor, shift details, and summary',
      category: 'attendance',
      color: 'blue',
      icon: Printer,
      component: DetailedAttendanceReport,
      defaultFilters: PRINTABLE_ATTENDANCE_DEFAULT_FILTERS,
    },
    {
      id: 'checkin-checkout-report',
      title: 'Check-in/Check-out Report',
      slug: 'checkin-checkout-report',
      permissionName: 'read_checkin-checkout-report', // Maps to server permission name
      desc: 'Daily check-in and check-out times with working hours analysis',
      category: 'attendance',
      color: 'yellow',
      icon: Clock,
      component: CheckInOutReport,
    },
    {
      id: 'missing-checkins-report',
      title: 'Missing Check-ins Report',
      slug: 'missing-checkins-report',
      permissionName: 'read_missing-checkins-report', // Maps to server permission name
      desc: 'Identify employees with missing check-ins or incomplete records',
      category: 'attendance',
      color: 'yellow',
      icon: AlertTriangle,
      component: MissingCheckinsReport,
    },
    {
      id: 'transaction-report',
      title: 'Transaction Report',
      slug: 'transaction-report',
      permissionName: 'read_transaction-report', // Maps to server permission name
      desc: 'Detailed transaction analysis based on punch periods and time intervals',
      category: 'finance',
      color: 'indigo',
      icon: BarChart3,
      component: TransactionReport,
    },
    {
      id: 'direction-conflicts-report',
      title: 'Direction Conflicts Report',
      slug: 'direction-conflicts-report',
      permissionName: 'read_direction-conflicts-report',
      desc: 'Transaction punches flagged with direction conflicts (multiple direction changes within the punch period)',
      category: 'finance',
      color: 'indigo',
      icon: AlertTriangle,
      component: TransactionReport,
      defaultFilters: {
        ...DEFAULT_REPORT_DATE_RANGE,
        has_direction_conflict: 'true',
      },
    },
    {
      id: 'salary-register-report',
      title: 'Salary Register Report',
      slug: 'salary-register-report',
      permissionName: 'read_salary-register-report', // Maps to server permission name
      desc: 'Salary register with components from salary structure and attendance details',
      category: 'finance',
      color: 'green',
      icon: IndianRupee,
      component: SalaryRegisterReport,
    },
    {
      id: 'salary-with-attendance-report',
      title: 'Salary with Attendance Report',
      slug: 'salary-with-attendance-report',
      permissionName: 'read_salary-with-attendance-report', // Maps to server permission name
      desc: 'Salary register with day-wise attendance, summary off, and print-friendly column labels',
      category: 'finance',
      color: 'green',
      icon: IndianRupee,
      component: SalaryRegisterReport,
      defaultFilters: {
        ...DEFAULT_REPORT_DATE_RANGE,
        show_attendance: 'true',
        show_summary_view: 'false',
        is_print_view: 'true',
      },
    },
    {
      id: 'salary-change-report',
      title: 'Salary Change Report',
      slug: 'salary-change-report',
      permissionName: 'read_salary-change-report', // Maps to server permission name
      desc: 'Employees with their current and previous salaries, showing increments and reductions',
      category: 'finance',
      color: 'green',
      icon: IndianRupee,
      component: SalaryChangeReport,
    },
    {
      id: 'deactivation-user-report',
      title: 'Deactivation User Report',
      slug: 'deactivation-user-report',
      permissionName: 'read_deactivation-user-report', // Maps to server permission name
      desc: 'User activity analysis for account deactivation and cleanup processes',
      category: 'administration',
      color: 'purple',
      icon: UserX,
      component: DeactivationUserReport,
      defaultFilters: PREV_MONTH_START_YESTERDAY_RANGE,
    },
    {
      id: 'employee-lifecycle-report',
      title: 'Employee Lifecycle Report',
      slug: 'employee-lifecycle-report',
      permissionName: 'read_employee-lifecycle-report', // Maps to server permission name
      desc: 'Workforce changes within a date range across two tabs — Additions (employees who joined) and Deletions (employees who were deactivated)',
      category: 'administration',
      color: 'purple',
      icon: Users,
      component: EmployeeLifecycleReport,
      defaultFilters: PREV_MONTH_START_YESTERDAY_RANGE,
    },
    {
      id: 'shift-summary-report',
      title: 'Shift Summary Report',
      slug: 'shift-summary-report',
      permissionName: 'read_shift-summary-report', // Maps to server permission name
      desc: 'Shift summary analysis for all employees',
      category: 'attendance',
      color: 'red',
      icon: Clock,
      component: ShiftSummaryReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'pf-report',
      title: 'PF Report',
      slug: 'pf-report',
      permissionName: 'read_pf-report', // Maps to server permission name
      desc: 'Provident Fund (PF) contribution report with employee and employer contributions, UAN, and breakdown',
      category: 'india-compliance',
      color: 'blue',
      icon: Shield,
      component: PFReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'esic-report',
      title: 'ESIC Report',
      slug: 'esic-report',
      permissionName: 'read_esic-report', // Maps to server permission name
      desc: 'Employee State Insurance Corporation (ESIC) contribution report with employee and employer contributions',
      category: 'india-compliance',
      color: 'green',
      icon: Building2,
      component: ESICReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'leave-bank-report',
      title: 'Leave Bank Report',
      slug: 'leave-bank-report',
      permissionName: 'read_leave-bank-report', // Maps to server permission name
      desc: 'Leave bank balance report showing opening balances for all employees by leave type',
      category: 'attendance',
      color: 'pink',
      icon: CalendarDays,
      component: LeaveBankReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'leave-transaction-report',
      title: 'Leave Transaction Report',
      slug: 'leave-transaction-report',
      permissionName: 'read_leave-transaction-report', // Maps to server permission name
      desc: 'Date-wise leave bank ledger showing opening balance, credit, debit and closing balance for every transaction, per employee and leave type',
      category: 'attendance',
      color: 'pink',
      icon: CalendarDays,
      component: LeaveTransactionReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'all-leaves-report',
      title: 'All Leaves Report',
      slug: 'all-leaves-report',
      permissionName: 'read_all-leaves-report', // Maps to server permission name
      desc: 'Transaction report showing opening balances and manual attendance impacts as transactions with running balance',
      category: 'attendance',
      color: 'pink',
      icon: CalendarDays,
      component: AllLeavesReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'unregistered-faces-report',
      title: 'Unregistered Faces Report',
      slug: 'unregistered-faces-report',
      permissionName: 'read_unregistered-faces-report',
      desc: 'Review unrecognized face images captured during check-in / check-out. Delete or assign them to employees.',
      category: 'face-recognition',
      color: 'orange',
      icon: ScanFace,
      component: UnregisteredFacesReport,
    },
    {
      id: 'biotemplate-report',
      title: 'Biotemplate Report',
      slug: 'biotemplate-report',
      permissionName: 'read_biotemplate-report',
      desc: 'Per-employee biotemplate enrollment status (fingerprint v10/v13, face, palm, finger-vein) by terminal area, with one-click pull from devices.',
      category: 'face-recognition',
      color: 'blue',
      icon: Fingerprint,
      component: BiotemplateReport,
    },
    {
      id: 'call-buddy-report',
      title: 'Call Buddy Report',
      slug: 'call-buddy-report',
      permissionName: 'read_call-buddy-report',
      desc: 'Detailed call log report showing who called, which number, when, and call duration for all users',
      category: 'callbuddy',
      color: 'indigo',
      icon: BarChart3,
      component: CallBuddyReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'daily-sales-person-report',
      title: 'Daily Sales Person Report',
      slug: 'daily-sales-person-report',
      permissionName: 'read_daily-sales-person-report',
      desc: 'Per salesperson per day: tracking summary (start/end, distance, wage) plus a tab listing every dealer visit with in/out times.',
      category: 'field-sales',
      color: 'orange',
      icon: BarChart3,
      component: DailySalesPersonReport,
      defaultFilters: {
        start_date: getLocalDateStringYmd(),
        end_date: getLocalDateStringYmd(),
      },
    },
    {
      id: 'sales-activity-report',
      title: 'Sales Activity Report',
      slug: 'sales-activity-report',
      permissionName: 'read_sales-activity-report',
      desc: 'Consolidated salesperson activity: field tracking (distance, wage, visits) merged with call-buddy calls, per user per day. Totals tab gives the per-user roll-up.',
      category: 'field-sales',
      color: 'indigo',
      icon: BarChart3,
      component: SalesActivityReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'vastram-daily-performance-report',
      title: 'Vastram Daily Performance',
      slug: 'vastram-daily-performance-report',
      permissionName: 'read_vastram-daily-performance-report',
      desc: 'Per employee per day customer tally on top of check-in/check-out: add customers, mark each as sale or left, with single-step undo.',
      category: 'field-sales',
      color: 'orange',
      icon: BarChart3,
      component: VastramDailyPerformanceReport,
      defaultFilters: TODAY_REPORT_DATE_RANGE,
    },
    {
      id: 'final-wage-report-for-contractor',
      title: 'Final Wage Report for Contractor',
      slug: 'final-wage-report-for-contractor',
      permissionName: 'read_final-wage-report-for-contractor',
      desc: 'Final wage report for contractors with employee, department, and cost center filters',
      category: 'finance',
      color: 'green',
      icon: IndianRupee,
      component: FinalWageReportForContractor,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'canteen-report',
      title: 'Canteen Report',
      slug: 'canteen-report',
      permissionName: 'read_canteen-report', // Maps to server permission name
      desc: 'Canteen punches per employee with meal type and meal amount',
      category: 'finance',
      color: 'orange',
      icon: UtensilsCrossed,
      component: CanteenReport,
    },

    // ── Readiness reports ───────────────────────────────────────────────
    // "Is the data right, before this run / this close?" Each answers one
    // question that otherwise fails silently — nothing errors at the time,
    // the damage surfaces weeks later in a bank rejection, a PF return or a
    // salary dispute. The Checklist page is one saved filter over each.
    {
      id: 'payroll-readiness-report',
      title: 'Payroll Readiness Report',
      slug: 'payroll-readiness-report',
      permissionName: 'read_payroll-readiness-report',
      desc: 'Everything payroll needs from each employee — bank details, statutory IDs and salary structure — with what is still missing',
      category: 'finance',
      color: 'red',
      icon: BadgeCheck,
      component: ReadinessReport,
      filtersConfig: PayrollReadinessReportFilters,
      verdictColumn: 'readiness',
      defaultSortField: 'missing_count',
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'roster-coverage-report',
      title: 'Roster Coverage Report',
      slug: 'roster-coverage-report',
      permissionName: 'read_roster-coverage-report',
      desc: 'Who has a shift and a weekly off on a given date — and whose assignment is about to lapse into the default 24h shift',
      category: 'attendance',
      color: 'red',
      icon: CalendarCheck,
      component: ReadinessReport,
      filtersConfig: RosterCoverageReportFilters,
      verdictColumn: 'coverage',
      defaultSortField: 'gap_count',
      defaultFilters: TODAY_REPORT_DATE_RANGE,
    },
    {
      id: 'pending-approvals-report',
      title: 'Pending Approvals Report',
      slug: 'pending-approvals-report',
      permissionName: 'read_pending-approvals-report',
      desc: 'Attendance corrections, manual punches and gate passes still awaiting action, ranked by how long they have waited',
      category: 'administration',
      color: 'orange',
      icon: Hourglass,
      component: ReadinessReport,
      filtersConfig: PendingApprovalsReportFilters,
      defaultSortField: 'waiting_days',
    },
    {
      id: 'terminal-health-report',
      title: 'Terminal Health Report',
      slug: 'terminal-health-report',
      permissionName: 'read_terminal-health-report',
      desc: 'Which biometric terminals are still reporting, and how long the silent ones have been down',
      category: 'administration',
      color: 'purple',
      icon: Router,
      component: ReadinessReport,
      filtersConfig: TerminalHealthReportFilters,
      verdictColumn: 'health',
      defaultSortField: 'silent_hours',
      frozenColumns: ['terminal_name'],
    },
    {
      id: 'advance-recovery-report',
      title: 'Advance Recovery Report',
      slug: 'advance-recovery-report',
      permissionName: 'read_advance-recovery-report',
      desc: 'Advances with money still outstanding, and those whose repayment schedule has lapsed while a balance remains',
      category: 'finance',
      color: 'green',
      icon: IndianRupee,
      component: ReadinessReport,
      filtersConfig: AdvanceRecoveryReportFilters,
      verdictColumn: 'recovery_state',
      defaultSortField: 'days_past_closure',
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },

    // Filter presets over existing reports — no API of their own, so the rows
    // are by construction the same rows the base report shows.
    {
      id: 'unlocked-attendance-report',
      title: 'Unlocked Attendance Report',
      slug: 'unlocked-attendance-report',
      permissionName: 'read_unlocked-attendance-report',
      desc: 'Attendance days never locked — still able to move under a late punch import after payroll has gone out',
      category: 'attendance',
      color: 'red',
      icon: LockOpen,
      component: UnlockedAttendanceReport,
      defaultFilters: PREV_MONTH_START_YESTERDAY_RANGE,
    },
    {
      id: 'negative-leave-balance-report',
      title: 'Negative Leave Balance Report',
      slug: 'negative-leave-balance-report',
      permissionName: 'read_negative-leave-balance-report',
      desc: 'Employees whose leave bank has gone overdrawn — sanctioned leave that will surface as a payslip deduction',
      category: 'attendance',
      color: 'red',
      icon: TrendingDown,
      component: NegativeLeaveBalanceReport,
      filtersConfig: NegativeLeaveBalanceReportFilters,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    ...CUSTOM_REPORTS,
  ];

  const categories = [
    { id: 'all', name: 'All Reports' },
    { id: 'attendance', name: 'Attendance' },
    { id: 'finance', name: 'Finance' },
    { id: 'administration', name: 'Administration' },
    { id: 'india-compliance', name: 'India Compliance' },
    { id: 'face-recognition', name: 'Face Recognition' },
    { id: 'callbuddy', name: 'Call Buddy' },
    { id: 'field-sales', name: 'Field Sales' },
  ];

export {
  reports,
  categories,
};
