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
    ShieldAlert,
    Hourglass,
    Router,
    LockOpen,
    TrendingDown,
    Gauge,
    Trophy,
    Target,
    ListChecks,
    MapPin,
    Route,
    RadioTower,
    Soup,
    Camera,
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
  import { PerformanceReport } from '../components/report/reports/performance/PerformanceReport';
import { PFReport } from '../components/report/reports/pf_report/PFReport';
import { ESICReport } from '../components/report/reports/esic_report/ESICReport';
import { LeaveBankReport } from '../components/report/reports/leave_bank/LeaveBankReport';
import { LeaveTransactionReport } from '../components/report/reports/leave_transaction/LeaveTransactionReport';
import { AllLeavesReport } from '../components/report/reports/all_leaves/AllLeavesReport';
import { UnregisteredFacesReport } from '../components/report/reports/unregistered_faces/UnregisteredFacesReport';
import { BiotemplateReport } from '../components/report/reports/biotemplate/BiotemplateReport';
import { CallBuddyReport } from '../components/report/reports/call_buddy/CallBuddyReport';
import { LeadConversionReport } from '../components/report/reports/call_buddy/LeadConversionReport';
import { RepeatedCallsReport } from '../components/report/reports/call_buddy/RepeatedCallsReport';
import { CommonContactsReport } from '../components/report/reports/call_buddy/CommonContactsReport';
import { ContactFollowupReport } from '../components/report/reports/contact_followup/ContactFollowupReport';
import { FinalWageReportForContractor } from '../components/report/reports/final_wage_report_for_contractor/FinalWageReportForContractorReport';
import { DailySalesPersonReport } from '../components/report/reports/daily_sales_person/DailySalesPersonReport';
import { SalesActivityReport } from '../components/report/reports/sales_activity/SalesActivityReport';
import { LocationLogReport } from '../components/report/reports/location_log/LocationLogReport';
import { HaltPointsReport } from '../components/report/reports/halt_points/HaltPointsReport';
import { IdentifyOfficerReport } from '../components/report/reports/identify_officer/IdentifyOfficerReport';
import { VastramDailyPerformanceReport } from '../components/report/reports/vastram_daily_performance/VastramDailyPerformanceReport';
import { CanteenReport } from '../components/report/reports/canteen/CanteenReport';
import { PayrollReadinessReport } from '@app/components/report/reports/readiness/PayrollReadinessReport';
import { EmploymentAgeComplianceReport } from '@app/components/report/reports/readiness/EmploymentAgeComplianceReport';
import { RosterCoverageReport } from '@app/components/report/reports/readiness/RosterCoverageReport';
import { PendingApprovalsReport } from '@app/components/report/reports/readiness/PendingApprovalsReport';
import { TerminalHealthReport } from '@app/components/report/reports/readiness/TerminalHealthReport';
import { AdvanceRecoveryReport } from '@app/components/report/reports/readiness/AdvanceRecoveryReport';
import { AreaHeadcountReport } from '@app/components/report/reports/readiness/AreaHeadcountReport';
import { CampusPresenceReport } from '@app/components/report/reports/readiness/CampusPresenceReport';
import { SiteAttendanceReport } from '@app/components/report/reports/readiness/SiteAttendanceReport';
import { CrossSiteMovementReport } from '@app/components/report/reports/readiness/CrossSiteMovementReport';
import { SiteCoverageReport } from '@app/components/report/reports/readiness/SiteCoverageReport';
import { CanteenBySiteReport } from '@app/components/report/reports/readiness/CanteenBySiteReport';
import { UnlockedAttendanceReport } from '../components/report/reports/readiness/UnlockedAttendanceReport';
import { NegativeLeaveBalanceReport } from '../components/report/reports/readiness/NegativeLeaveBalanceReport';
// Customer-specific reports. They are declared in custom/ and spread in at the
// end of the list, so this file never grows an entry per customer.
import { CUSTOM_REPORTS } from '@custom/client';
import {
  NegativeLeaveBalanceReportFilters,
} from '../filter/reportFilterConfig';
const DEFAULT_REPORT_DATE_RANGE = getDefaultReportDateRange();
const TODAY_REPORT_DATE_RANGE = {
  start_date: getLocalDateStringYmd(),
  end_date: getLocalDateStringYmd(),
};
const TODAY_REPORT_DATE = { start_date: getLocalDateStringYmd() };
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
      id: 'lead-conversion-report',
      title: 'Lead Conversion Report',
      slug: 'lead-conversion-report',
      permissionName: 'read_call-buddy-report',
      desc: 'The cold-calling pipeline end to end — a lead-status funnel, per-agent conversion, and which sources actually convert. Tabs: Funnel, By Agent, By Source, All Leads.',
      category: 'callbuddy',
      color: 'indigo',
      icon: Target,
      component: LeadConversionReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'repeated-calls-report',
      title: 'Repeated Calls Report',
      slug: 'repeated-calls-report',
      permissionName: 'read_call-buddy-report',
      desc: 'Numbers called past the ceiling their pipeline step allows (Calls Per Step × step) — possible call-count padding. Internal and sub-10s calls are excluded.',
      category: 'callbuddy',
      color: 'rose',
      icon: BarChart3,
      component: RepeatedCallsReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'common-contacts-report',
      title: 'Shared Contacts Report',
      slug: 'common-contacts-report',
      permissionName: 'read_call-buddy-report',
      desc: 'Numbers worked by more than one caller — overlap that usually means duplicated effort. "Min Callers" sets the bar. Internal and sub-10s calls are excluded.',
      category: 'callbuddy',
      color: 'amber',
      icon: Users,
      component: CommonContactsReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'contact-followup-report',
      title: 'Contact Followup Report',
      slug: 'contact-followup-report',
      permissionName: 'read_contact-followup-report',
      desc: 'Every contact with the next call due and the last call made, with the status editable in the row.',
      category: 'callbuddy',
      color: 'green',
      icon: Users,
      component: ContactFollowupReport,
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
      id: 'location-log-report',
      title: 'Location Log Report',
      slug: 'location-log-report',
      permissionName: 'read_location-log-report',
      desc: 'The movement trail the field app recorded per user — every tracking event with its coordinates, GPS accuracy, transport mode and handset battery',
      category: 'field-sales',
      color: 'orange',
      icon: MapPin,
      component: LocationLogReport,
      defaultFilters: TODAY_REPORT_DATE_RANGE,
    },
    {
      id: 'halt-points-report',
      title: 'Halt Points Report',
      slug: 'halt-points-report',
      permissionName: 'read_halt-points-report',
      desc: 'Every place a user stood still longer than the minutes you set — start, end, how long, and the address — found from the GPS trail rather than from anything the user marked.',
      category: 'field-sales',
      color: 'orange',
      icon: Hourglass,
      component: HaltPointsReport,
      defaultFilters: TODAY_REPORT_DATE_RANGE,
    },
    {
      id: 'identify-officer-report',
      title: 'Identify Officer Report',
      slug: 'identify-officer-report',
      permissionName: 'read_identify-officer-report',
      desc: 'Every photo the mobile app captured — check-in, dealer reached, contact captured, check-out — with who, when, where and how they travelled. Click a photo to open it full screen.',
      category: 'field-sales',
      color: 'orange',
      icon: Camera,
      component: IdentifyOfficerReport,
      defaultFilters: TODAY_REPORT_DATE_RANGE,
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
      component: PayrollReadinessReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'employment-age-compliance-report',
      title: 'Employment Age Compliance Report',
      slug: 'employment-age-compliance-report',
      permissionName: 'read_employment-age-compliance-report',
      desc: 'Employees the statutory age rules bite on — anyone below the minimum employment age, and every adolescent whose certificate of fitness is missing or expired',
      // Sits with PF and ESIC: it answers to the Child Labour Act and the
      // Factories Act, not to an internal HR process.
      category: 'india-compliance',
      color: 'red',
      icon: ShieldAlert,
      component: EmploymentAgeComplianceReport,
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
      component: RosterCoverageReport,
      defaultFilters: TODAY_REPORT_DATE,
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
      component: PendingApprovalsReport,
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
      component: TerminalHealthReport,
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
      component: AdvanceRecoveryReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },

    {
      id: 'area-headcount-report',
      title: 'Area-wise Headcount Report',
      slug: 'area-headcount-report',
      permissionName: 'read_area-headcount-report',
      desc: 'How many active employees each personnel area holds, and which areas have people but no terminal to collect their attendance',
      category: 'administration',
      color: 'blue',
      icon: MapPin,
      component: AreaHeadcountReport,
    },

    // Multi-location HR. Every other report in the product answers per employee or
    // per department, and a department spans sites — so a company running four
    // locations could see that Maintenance was 12% absent and never which location.
    {
      id: 'campus-presence-report',
      title: 'Campus Presence Report',
      slug: 'campus-presence-report',
      permissionName: 'read_campus-presence-report',
      desc: 'Who is on site right now and at which area, plus the presences that are really a missed OUT punch',
      category: 'attendance',
      color: 'blue',
      icon: Building2,
      component: CampusPresenceReport,
    },
    {
      id: 'site-attendance-report',
      title: 'Site Attendance Comparison',
      slug: 'site-attendance-report',
      permissionName: 'read_site-attendance-report',
      desc: 'Present, absent, late and overtime for each site side by side \u2014 which location is actually running well',
      category: 'attendance',
      color: 'orange',
      icon: MapPin,
      component: SiteAttendanceReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'cross-site-movement-report',
      title: 'Cross-Site Movement Report',
      slug: 'cross-site-movement-report',
      permissionName: 'read_cross-site-movement-report',
      desc: 'Employees who worked at more than one site, and those punching where they are not assigned \u2014 read this before enforcing area scoping',
      category: 'attendance',
      color: 'purple',
      icon: Route,
      component: CrossSiteMovementReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'site-coverage-report',
      title: 'Site Roster & Coverage Gaps',
      slug: 'site-coverage-report',
      permissionName: 'read_site-coverage-report',
      desc: 'Per site: who was expected, who was seen, and whether the terminals there were even reporting \u2014 what each site\u2019s attendance data is worth',
      category: 'administration',
      color: 'red',
      icon: RadioTower,
      component: SiteCoverageReport,
      defaultFilters: TODAY_REPORT_DATE_RANGE,
    },
    {
      id: 'canteen-by-site-report',
      title: 'Canteen By Site Report',
      slug: 'canteen-by-site-report',
      permissionName: 'read_canteen-by-site-report',
      desc: 'Meals, spend and how many staff actually use the canteen at each site \u2014 the uptake rate a per-meal list cannot show',
      category: 'administration',
      color: 'green',
      icon: Soup,
      component: CanteenBySiteReport,
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
    // --- Performance management -------------------------------------------------
    // One appraisal round, four ways of reading it. All four render through the same
    // component; the slug picks the filters.
    {
      id: 'appraisal-summary-report',
      title: 'Appraisal Summary',
      slug: 'appraisal-summary-report',
      permissionName: 'read_appraisal-summary-report',
      desc: 'Every appraisal in a cycle: self and reviewer scores, band, reviewer and where it has reached',
      category: 'performance',
      color: 'indigo',
      icon: Trophy,
      component: PerformanceReport,
    },
    {
      id: 'band-distribution-report',
      title: 'Band Distribution',
      slug: 'band-distribution-report',
      permissionName: 'read_band-distribution-report',
      desc: 'How many people landed in each rating band, by department or designation — the bell-curve check before a round is signed off',
      category: 'performance',
      color: 'indigo',
      icon: Gauge,
      component: PerformanceReport,
    },
    {
      id: 'kra-analysis-report',
      title: 'KRA-wise Analysis',
      slug: 'kra-analysis-report',
      permissionName: 'read_kra-analysis-report',
      desc: 'Average, lowest and highest score each KRA earned across a cycle — what the organisation is weak at, weakest first',
      category: 'performance',
      color: 'indigo',
      icon: Target,
      component: PerformanceReport,
    },
    {
      id: 'cycle-progress-report',
      title: 'Appraisal Cycle Progress',
      slug: 'cycle-progress-report',
      permissionName: 'read_cycle-progress-report',
      desc: 'What is still outstanding in a round, grouped by the reviewer who owes it, most pending first',
      category: 'performance',
      color: 'indigo',
      icon: ListChecks,
      component: PerformanceReport,
    },
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
    { id: 'performance', name: 'Performance' },
  ];

export {
  reports,
  categories,
};
