import { EmployeeMaster } from "@app/components/masters/employee_master/EmployeeMaster";
import { HolidayWorkspace } from "@app/components/masters/holiday_workspace/HolidayWorkspace";
import { FormulaMaster } from "@app/components/masters/formula_master/FormulaMaster";
import { RawPunchMaster } from "@app/components/masters/raw_punch_master/RawPunchMaster";
import { GatePassMaster } from "@app/components/masters/gate_pass_master/GatePassMaster";
import { DepartmentMaster } from "@app/components/masters/department_master/DepartmentMaster";
import { PositionMaster } from "@app/components/masters/position_master/PositionMaster";
import { AssetMaster } from "@app/components/masters/asset_master/AssetMaster";
import { AssetAllocationMaster } from "@app/components/masters/asset_allocation_master/AssetAllocationMaster";
import { LeaveTypeMaster } from "@app/components/masters/leave_type_master/LeaveTypeMaster";
import { AllowanceTypeMaster } from "@app/components/masters/allowance_type_master/AllowanceTypeMaster";
import { PurposeTypeMaster } from "@app/components/masters/purpose_type_master/PurposeTypeMaster";
import { ContactStatusMaster } from "@app/components/masters/contact_status_master/ContactStatusMaster";
import { OperationCycleMaster } from "@app/components/masters/operation_cycle_master/OperationCycleMaster";
import { RoleResponsibilityMaster } from "@app/components/masters/role_responsibility_master/RoleResponsibilityMaster";
import { CanteenMealTypeMaster } from "@app/components/masters/canteen_meal_type_master/CanteenMealTypeMaster";
import { ServiceOfferingMaster } from "@app/components/masters/service_offering_master/ServiceOfferingMaster";
import { CustomerMaster } from "@app/components/masters/customer_master/CustomerMaster";
import { LeavesTakenMaster } from "@app/components/masters/leaves_taken_master/LeavesTakenMaster";
import { LeaveListMaster } from "@app/components/masters/leave_list_master/LeaveListMaster";
import { EmployeeMergeMaster } from "@app/components/masters/employee_merge_master/EmployeeMergeMaster";
import { TimetableMaster } from "@app/components/masters/timetable_master/TimetableMaster";
import { ManualLogMaster } from "@app/components/masters/manual_log_master/ManualLogMaster";
import { ManualLogEntryMaster } from "@app/components/masters/manual_log_entry_master/ManualLogEntryMaster";
import { VastramDailyPerformanceMaster } from "@app/components/masters/vastram_daily_performance_master/VastramDailyPerformanceMaster";
import { EmployeeScheduleMaster } from "@app/components/masters/employee_schedule/EmployeeScheduleMaster";
import { CompoundShiftMaster } from "@app/components/masters/compound_shift_master/CompoundShiftMaster";
import { ManualAttendanceMaster } from "@app/components/masters/manual_attendance_master/ManualAttendanceMaster";
import { ReimbursementMaster } from "@app/components/masters/reimbursement_master/ReimbursementMaster";
import { JobOfferSalaryStructureMaster } from "@app/components/masters/job_offer_salary_structure_master/JobOfferSalaryStructureMaster";
import { SalaryStructureMaster } from "@app/components/masters/salary_structure_master/SalaryStructureMaster";
import { ContactMaster } from "@app/components/masters/contact_master/ContactMaster";
import { WeeklyOffMaster } from "@app/components/masters/weekly_off_master/WeeklyOffMaster";
import { TerminalMaster } from "@app/components/masters/terminal_master/TerminalMaster";
import { TerminalCommandsMaster } from "@app/components/masters/terminal_commands_master/TerminalCommandsMaster";
import { CanteenTokenPrintMaster } from "@app/components/masters/canteen_token_print_master/CanteenTokenPrintMaster";
import { AdvanceMaster } from "@app/components/masters/advance_master/AdvanceMaster";
import { CostCenterMaster } from "@app/components/masters/cost_center_master/CostCenterMaster";
import { PersonnelAreaMaster } from "@app/components/masters/personnel_area_master/PersonnelAreaMaster";
import { EmployeeAreaAssignmentMaster } from "@app/components/masters/employee_area_assignment_master/EmployeeAreaAssignmentMaster";
import { WhatsappTemplateMaster } from "@app/components/masters/whatsapp_template_master/WhatsappTemplateMaster";
import { PerformanceCycleMaster } from "@app/components/masters/performance_cycle_master/PerformanceCycleMaster";
import { PerformanceParameterMaster } from "@app/components/masters/performance_parameter_master/PerformanceParameterMaster";
import { PerformanceReviewMaster } from "@app/components/masters/performance_review_master/PerformanceReviewMaster";
import { CYCLE_TYPE } from "@app/constants/performance";

import { WageMasterDashboard } from "@app/components/wagemaster/WageMasterDashboard";
import { UserDashboardPlaceholder } from "@app/components/wagemaster/UserDashboardPlaceholder";
import { QuickCheckIn } from "@app/components/quick_check_in/QuickCheckIn";
import { HRDashboardContent } from "@app/pages/HRDashboard";
import { LeadConversionDashboard } from "@app/pages/LeadConversionDashboard";
import { ChecklistContent } from "@app/pages/Checklist";
import { LogHistory } from "@app/components/wage_master_phone_app_components/LogHistory";
import { FeedBackForm } from "@app/components/wage_master_phone_app_components/FeedBackForm";
import { OrganizationStructureContent } from "@app/pages/OrganizationStructure";

// Routes that render inside the AdminLayout / sidebar.
const appRoutes = [
  { path: "master/employee", element: <EmployeeMaster /> },
  { path: "master/holidays", element: <HolidayWorkspace defaultTab="lists" /> },
  { path: "master/formula-master", element: <FormulaMaster /> },
  { path: "master/raw-punch", element: <RawPunchMaster /> },
  { path: "master/gatepass", element: <GatePassMaster /> },
  { path: "master/department", element: <DepartmentMaster /> },
  { path: "master/position", element: <PositionMaster /> },
  { path: "master/asset", element: <AssetMaster /> },
  { path: "master/asset-allocation", element: <AssetAllocationMaster /> },
  { path: "master/leave-type", element: <LeaveTypeMaster /> },
  { path: "master/allowance-type", element: <AllowanceTypeMaster /> },
  { path: "master/purpose-type", element: <PurposeTypeMaster /> },
  { path: "master/contact-status", element: <ContactStatusMaster /> },
  { path: "master/operation-cycle", element: <OperationCycleMaster /> },
  { path: "master/role-responsibility", element: <RoleResponsibilityMaster /> },
  { path: "master/canteen-meal-type", element: <CanteenMealTypeMaster /> },
  { path: "master/service-offering", element: <ServiceOfferingMaster /> },
  { path: "master/customer", element: <CustomerMaster /> },
  { path: "master/leaves-taken", element: <LeavesTakenMaster /> },
  { path: "master/leave-list", element: <LeaveListMaster /> },
  { path: "master/employee-merge", element: <EmployeeMergeMaster /> },
  { path: "master/timetable", element: <TimetableMaster /> },
  { path: "master/manual-attendance", element: <ManualAttendanceMaster /> },
  { path: "master/manual-punches", element: <ManualLogMaster /> },
  { path: "master/manual-salaries", element: <ManualLogEntryMaster /> },
  { path: "master/vastram-daily-performance", element: <VastramDailyPerformanceMaster /> },
  { path: "master/employee-schedule", element: <EmployeeScheduleMaster /> },
  { path: "master/compound-shift", element: <CompoundShiftMaster /> },
  { path: "master/reimbursement", element: <ReimbursementMaster /> },
  { path: "master/job-offer-salary-structure", element: <JobOfferSalaryStructureMaster /> },
  { path: "master/salary-structure", element: <SalaryStructureMaster /> },
  { path: "master/contact", element: <ContactMaster /> },
  { path: "master/weekly-off", element: <WeeklyOffMaster /> },
  { path: "master/terminal", element: <TerminalMaster /> },
  { path: "master/terminal-commands", element: <TerminalCommandsMaster /> },
  { path: "master/canteen-token-print", element: <CanteenTokenPrintMaster /> },
  { path: "master/advance", element: <AdvanceMaster /> },
  // Kept so existing links and bookmarks still resolve — they now open the
  // matching tab of the unified Holidays workspace.
  { path: 'master/holiday-type', element: <HolidayWorkspace defaultTab="types" /> },
  { path: 'master/holiday-days', element: <HolidayWorkspace defaultTab="lists" /> },
  { path: 'master/cost-center', element: <CostCenterMaster /> },
  { path: 'master/personnel-area', element: <PersonnelAreaMaster /> },
  { path: 'master/employee-area-assignment', element: <EmployeeAreaAssignmentMaster /> },
  { path: 'master/whatsapp-template', element: <WhatsappTemplateMaster /> },
  // Reviews and appraisals are separate rounds on separate timelines, so each gets its own
  // pair of screens rather than one list with a Type column to squint at.
  { path: 'master/performance-review-cycle', element: <PerformanceCycleMaster cycleType={CYCLE_TYPE.REVIEW} /> },
  { path: 'master/appraisal-cycle', element: <PerformanceCycleMaster cycleType={CYCLE_TYPE.APPRAISAL} /> },
  { path: 'master/performance-review', element: <PerformanceReviewMaster cycleType={CYCLE_TYPE.REVIEW} /> },
  { path: 'master/appraisal', element: <PerformanceReviewMaster cycleType={CYCLE_TYPE.APPRAISAL} /> },
  { path: 'master/performance-parameter', element: <PerformanceParameterMaster /> },
  { path: "wagemaster/dashboard", element: <WageMasterDashboard /> },
  { path: "wagemaster/dashboard/:userId", element: <UserDashboardPlaceholder /> },
  { path: "quick-check-in", element: <QuickCheckIn /> },
  {path:'hr-dashboard',element:<HRDashboardContent />},
  { path: 'lead-conversion-dashboard', element: <LeadConversionDashboard /> },
  { path: 'checklist', element: <ChecklistContent /> },
  { path: 'organization-structure', element: <OrganizationStructureContent /> }
];

// Routes that should NOT use the AdminLayout / sidebar.
const appRoutesWithoutSidebar = [
  { path: "salarymitra/biometric", element: <QuickCheckIn /> },
  { path: "wagemaster/log-history", element: <LogHistory /> },
  { path: "wagemaster/feedback", element: <FeedBackForm /> },
];

// Report pages the app owns that are not themselves reports. The Reporting
// Manager that replaced "past reports" is a framework page and routes itself.
const reportStaticPages = [];

export { appRoutes, appRoutesWithoutSidebar, reportStaticPages };
