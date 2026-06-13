import {
    FileText,
    Clock,
    AlertTriangle,
    BarChart3,
    IndianRupee,
    UserX,
    UserMinus,
    UserPlus,
    Shield,
    Building2,
    CalendarDays,
    ScanFace,
    Fingerprint,
    Landmark,
    HeartHandshake,
    ReceiptIndianRupee,
  } from 'lucide-react';
import { format } from 'date-fns';
import { getDefaultReportDateRange, getPrevMonthStartYesterdayRange } from '@utils/dateTimeUtils';

  import { DetailedAttendanceReport } from '../components/report/reports/detailed_attendance/DetailedAttendanceReport';
  import { CheckInOutReport } from '../components/report/reports/check_in_out/CheckInOutReport';
  import { MissingCheckinsReport } from '../components/report/reports/missing_checkins/MissingCheckinsReport';
  import { TransactionReport } from '../components/report/reports/transaction/TransactionReport';
  import { SalaryRegisterReport } from '../components/report/reports/salary_register/SalaryRegisterReport';
  import { SalaryChangeReport } from '../components/report/reports/salary_change/SalaryChangeReport';
  import { DeactivationUserReport } from '../components/report/reports/deactivation_user/DeactivationUserReport';
  import { DeactivatedEmployeesReport } from '../components/report/reports/deactivated_employees/DeactivatedEmployeesReport';
  import { NewEmployeesReport } from '../components/report/reports/new_employees/NewEmployeesReport';
  import { ShiftSummaryReport } from '../components/report/reports/shift_summary/ShiftSummaryReport';
import { PFReport } from '../components/report/reports/pf_report/PFReport';
import { ESICReport } from '../components/report/reports/esic_report/ESICReport';
import { ProfessionalTaxReport } from '../components/report/reports/professional_tax_report/ProfessionalTaxReport';
import { LwfReport } from '../components/report/reports/lwf_report/LwfReport';
import { TdsReport } from '../components/report/reports/tds_report/TdsReport';
import { PfForm5Report } from '../components/report/reports/pf_form5_report/PfForm5Report';
import { PfForm10Report } from '../components/report/reports/pf_form10_report/PfForm10Report';
import { PfForm6aReport } from '../components/report/reports/pf_form6a_report/PfForm6aReport';
import { EsicForm5Report } from '../components/report/reports/esic_form5_report/EsicForm5Report';
import { LeaveBankReport } from '../components/report/reports/leave_bank/LeaveBankReport';
import { AllLeavesReport } from '../components/report/reports/all_leaves/AllLeavesReport';
import { UnregisteredFacesReport } from '../components/report/reports/unregistered_faces/UnregisteredFacesReport';
import { BiotemplateReport } from '../components/report/reports/biotemplate/BiotemplateReport';
import { CallBuddyReport } from '../components/report/reports/call_buddy/CallBuddyReport';
import { FinalWageReportForContractor } from '../components/report/reports/final_wage_report_for_contractor/FinalWageReportForContractorReport';
import { DailySalesPersonReport } from '../components/report/reports/daily_sales_person/DailySalesPersonReport';
import { SalesActivityReport } from '../components/report/reports/sales_activity/SalesActivityReport';
const DEFAULT_REPORT_DATE_RANGE = getDefaultReportDateRange();
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
      id: 'deactivated-employees-report',
      title: 'Deactivated Employees Report',
      slug: 'deactivated-employees-report',
      permissionName: 'read_deactivated-employees-report', // Maps to server permission name
      desc: 'Employees deactivated within a date range, with who deactivated them and when, sourced from the audit trail',
      category: 'administration',
      color: 'purple',
      icon: UserMinus,
      component: DeactivatedEmployeesReport,
      defaultFilters: PREV_MONTH_START_YESTERDAY_RANGE,
    },
    {
      id: 'new-employees-report',
      title: 'New Employees Report',
      slug: 'new-employees-report',
      permissionName: 'read_new-employees-report', // Maps to server permission name
      desc: 'Employees who joined within a date range, with their joining date, department and current status',
      category: 'administration',
      color: 'purple',
      icon: UserPlus,
      component: NewEmployeesReport,
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
      title: 'PF Report (EPFO ECR)',
      slug: 'pf-report',
      permissionName: 'read_pf-report', // Maps to server permission name
      desc: 'EPFO ECR v2.0 member-line report (UAN, EPF/EPS/EDLI wages, contributions, NCP days). Download the portal-ready ECR (.txt) for direct upload on the EPFO Unified Portal.',
      category: 'india-compliance',
      color: 'blue',
      icon: Shield,
      component: PFReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'esic-report',
      title: 'ESIC Report (Monthly Contribution)',
      slug: 'esic-report',
      permissionName: 'read_esic-report', // Maps to server permission name
      desc: 'ESIC Monthly Contribution (MC) sheet in the exact portal upload format (IP Number, IP Name, No. of Days, Total Monthly Wages, Reason Code, Last Working Day), plus contribution breakdown. Excel export is portal-ready.',
      category: 'india-compliance',
      color: 'green',
      icon: Building2,
      component: ESICReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'professional-tax-report',
      title: 'Professional Tax Report',
      slug: 'professional-tax-report',
      permissionName: 'read_professional-tax-report', // Maps to server permission name
      desc: 'State-wise Professional Tax (PT) deduction sheet with per-state slabs and women-exemption handling. Excel export is the PT remittance sheet.',
      category: 'india-compliance',
      color: 'purple',
      icon: Landmark,
      component: ProfessionalTaxReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'lwf-report',
      title: 'LWF Report',
      slug: 'lwf-report',
      permissionName: 'read_lwf-report', // Maps to server permission name
      desc: 'State-wise Labour Welfare Fund (LWF) deduction sheet (employee + employer share) computed for the state contribution period. Excel export is the LWF remittance sheet.',
      category: 'india-compliance',
      color: 'teal',
      icon: HeartHandshake,
      component: LwfReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'tds-report',
      title: 'TDS Report (Form 24Q / TRACES)',
      slug: 'tds-report',
      permissionName: 'read_tds-report', // Maps to server permission name
      desc: 'Deductee-wise TDS-on-salary sheet (PAN, name, section 92B, amount paid, TDS deducted, dates) matching the NSDL RPU / TRACES Form 24Q import. Excel export is the RPU import sheet.',
      category: 'india-compliance',
      color: 'indigo',
      icon: ReceiptIndianRupee,
      component: TdsReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'pf-form5-report',
      title: 'PF Form 5 (Joiners)',
      slug: 'pf-form5-report',
      permissionName: 'read_pf-form5-report',
      desc: 'EPFO Form 5 — members who became EPF/EPS eligible (joined) during the period: UAN, PF account, name, father/husband, DOB, sex, date of joining, Aadhaar.',
      category: 'india-compliance',
      color: 'blue',
      icon: UserPlus,
      component: PfForm5Report,
      defaultFilters: PREV_MONTH_START_YESTERDAY_RANGE,
    },
    {
      id: 'pf-form10-report',
      title: 'PF Form 10 (Leavers)',
      slug: 'pf-form10-report',
      permissionName: 'read_pf-form10-report',
      desc: 'EPFO Form 10 — members who left service during the period (from employee deactivation audit trail): UAN, PF account, name, father/husband, date of leaving, reason.',
      category: 'india-compliance',
      color: 'blue',
      icon: UserMinus,
      component: PfForm10Report,
      defaultFilters: PREV_MONTH_START_YESTERDAY_RANGE,
    },
    {
      id: 'pf-form6a-report',
      title: 'PF Form 6A (Annual)',
      slug: 'pf-form6a-report',
      permissionName: 'read_pf-form6a-report',
      desc: 'EPFO Form 6A — annual consolidated statement of contributions per member (EPF wages, EE 12%, employer EPF 3.67%, EPS 8.33%, NCP days). Computed month-by-month; select Apr–Mar for the full financial year.',
      category: 'india-compliance',
      color: 'blue',
      icon: Shield,
      component: PfForm6aReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'esic-form5-report',
      title: 'ESIC Form 5 (Return of Contributions)',
      slug: 'esic-form5-report',
      permissionName: 'read_esic-form5-report',
      desc: 'ESIC Return of Contributions — consolidated per-IP statement for the contribution period (total days, wages, employee + employer contributions). Computed month-by-month; select a half-year (Apr–Sep / Oct–Mar).',
      category: 'india-compliance',
      color: 'green',
      icon: Building2,
      component: EsicForm5Report,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'leave-bank-report',
      title: 'Leave Bank Report',
      slug: 'leave-bank-report',
      permissionName: 'read_leave-bank-report', // Maps to server permission name
      desc: 'Leave bank balance report showing opening balances for all employees by leave type',
      category: 'attendance',
      color: 'teal',
      icon: CalendarDays,
      component: LeaveBankReport,
      defaultFilters: DEFAULT_REPORT_DATE_RANGE,
    },
    {
      id: 'all-leaves-report',
      title: 'All Leaves Report',
      slug: 'all-leaves-report',
      permissionName: 'read_all-leaves-report', // Maps to server permission name
      desc: 'Transaction report showing opening balances and manual attendance impacts as transactions with running balance',
      category: 'attendance',
      color: 'teal',
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
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
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
