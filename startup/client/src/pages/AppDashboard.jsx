import { EmployeeMaster } from "@app/components/masters/employee_master/EmployeeMaster";
import { HolidayMaster } from "@app/components/masters/holiday_master/HolidayMaster";
import { FormulaMaster } from "@app/components/masters/formula_master/FormulaMaster";
import { RawPunchMaster } from "@app/components/masters/raw_punch_master/RawPunchMaster";
import { GatePassMaster } from "@app/components/masters/gate_pass_master/GatePassMaster";
import { DepartmentMaster } from "@app/components/masters/department_master/DepartmentMaster";
import { PositionMaster } from "@app/components/masters/position_master/PositionMaster";
import { LeaveTypeMaster } from "@app/components/masters/leave_type_master/LeaveTypeMaster";
import { AllowanceTypeMaster } from "@app/components/masters/allowance_type_master/AllowanceTypeMaster";
import { PurposeTypeMaster } from "@app/components/masters/purpose_type_master/PurposeTypeMaster";
import { ServiceOfferingMaster } from "@app/components/masters/service_offering_master/ServiceOfferingMaster";
import { CustomerMaster } from "@app/components/masters/customer_master/CustomerMaster";
import { LeavesTakenMaster } from "@app/components/masters/leaves_taken_master/LeavesTakenMaster";
import { LeaveListMaster } from "@app/components/masters/leave_list_master/LeaveListMaster";
import { EmployeeMergeMaster } from "@app/components/masters/employee_merge_master/EmployeeMergeMaster";
import { TimetableMaster } from "@app/components/masters/timetable_master/TimetableMaster";
import { ManualLogMaster } from "@app/components/masters/manual_log_master/ManualLogMaster";
import { ManualLogEntryMaster } from "@app/components/masters/manual_log_entry_master/ManualLogEntryMaster";
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
import {HolidayTypeMaster} from '@app/components/masters/holiday_type_master/HolidayTypeMaster'
import { HolidayDaysMaster } from "@app/components/masters/holiday_days_master/HolidayDaysMaster";
import { CostCenterMaster } from "@app/components/masters/cost_center_master/CostCenterMaster";
import { PersonnelAreaMaster } from "@app/components/masters/personnel_area_master/PersonnelAreaMaster";
import { WhatsappTemplateMaster } from "@app/components/masters/whatsapp_template_master/WhatsappTemplateMaster";

import { WageMasterDashboard } from "@app/components/wagemaster/WageMasterDashboard";
import { UserDashboardPlaceholder } from "@app/components/wagemaster/UserDashboardPlaceholder";
import { Activities } from "@app/components/wagemaster/Activities";
import { IdentifyOfficer } from "@app/components/wagemaster/IdentifyOfficer";
import { QuickCheckIn } from "@app/components/quick_check_in/QuickCheckIn";
import { HRDashboardContent } from "@app/pages/HRDashboard";

const appRoutes = [
  { path: "master/employee", element: <EmployeeMaster /> },
  { path: "master/holidays", element: <HolidayMaster /> },
  { path: "master/formula-master", element: <FormulaMaster /> },
  { path: "master/raw-punch", element: <RawPunchMaster /> },
  { path: "master/gatepass", element: <GatePassMaster /> },
  { path: "master/department", element: <DepartmentMaster /> },
  { path: "master/position", element: <PositionMaster /> },
  { path: "master/leave-type", element: <LeaveTypeMaster /> },
  { path: "master/allowance-type", element: <AllowanceTypeMaster /> },
  { path: "master/purpose-type", element: <PurposeTypeMaster /> },
  { path: "master/service-offering", element: <ServiceOfferingMaster /> },
  { path: "master/customer", element: <CustomerMaster /> },
  { path: "master/leaves-taken", element: <LeavesTakenMaster /> },
  { path: "master/leave-list", element: <LeaveListMaster /> },
  { path: "master/employee-merge", element: <EmployeeMergeMaster /> },
  { path: "master/timetable", element: <TimetableMaster /> },
  { path: "master/manual-attendance", element: <ManualAttendanceMaster /> },
  { path: "master/manual-punches", element: <ManualLogMaster /> },
  { path: "master/manual-salaries", element: <ManualLogEntryMaster /> },
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
  { path: 'master/holiday-type', element: <HolidayTypeMaster/>},
  { path: 'master/holiday-days', element: <HolidayDaysMaster /> },
  { path: 'master/cost-center', element: <CostCenterMaster /> },
  { path: 'master/personnel-area', element: <PersonnelAreaMaster /> },
  { path: 'master/whatsapp-template', element: <WhatsappTemplateMaster /> },
  { path: "wagemaster/dashboard", element: <WageMasterDashboard /> },
  { path: "wagemaster/dashboard/:userId", element: <UserDashboardPlaceholder /> },
  { path: "wagemaster/activities", element: <Activities /> },
  { path: "identify-officer", element: <IdentifyOfficer /> },
  { path: "quick-check-in", element: <QuickCheckIn /> },
  {path:'hr-dashboard',element:<HRDashboardContent />}
];

export { appRoutes };

