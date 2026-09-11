import {
  People as PeopleIcon,
  Calculate as CalculateIcon,
  CurrencyRupee as CurrencyRupeeIcon,
  Settings as SettingsIcon,
  CloudUpload as CloudUploadIcon,
  Memory as MemoryIcon
} from "@mui/icons-material";

import FingerprintIcon from "@mui/icons-material/Fingerprint";
import { Assessment as AssessmentIcon, Checklist as ChecklistIcon, Badge as BadgeIcon } from "@mui/icons-material";
import { Business as BusinessIcon, Work as WorkIcon, BeachAccess as BeachAccessIcon, AccountBalanceWallet as AccountBalanceWalletIcon, MonetizationOn as MonetizationOnIcon, Category as CategoryIcon, EventNote as EventNoteIcon, ListAlt as ListAltIcon, Merge as MergeIcon, Contacts as ContactsIcon, CalendarToday as CalendarTodayIcon, Devices as DevicesIcon, AccountBalance as AccountBalanceIcon, AccountTree as AccountTreeIcon, Terminal as TerminalCommandsIcon, WhatsApp as WhatsAppIcon, Storage as StorageIcon, SupervisorAccount as ManagementIcon, Build as CommonMastersIcon, Storefront as StorefrontIcon, Restaurant as RestaurantIcon, Inventory2 as InventoryIcon } from "@mui/icons-material";
import { Headset } from "lucide-react";


/**
 * Single source of truth for master category names. Reference these constants
 */
const MASTER_CATEGORIES = {
  COMMON_MASTERS: "Common Masters",
  MANAGEMENT: "Management",
  RAW_DATA: "Raw Data",
  SETUP: "Setup",
  PAYROLL_CALCULATIONS: "Payroll & Calculations",
  PERFORMANCE_MANAGEMENT: "Performance Management",
  CALLBUDDY: "CallBuddy",
  FILE_MANAGEMENT: "File Management",
  SYSTEM_LOGS: "System Logs",
  DEPRECATED: "Deprecated",
};

/**
 * All master category buckets — single source of truth for display order AND icon
 * field fall back to `defaultMasterCategoryIcon`.
 */
const appSpecificMasterCategoryOrder = [
  { name: MASTER_CATEGORIES.COMMON_MASTERS, order: 1, icon: CommonMastersIcon },
  { name: MASTER_CATEGORIES.MANAGEMENT, order: 2, icon: ManagementIcon },
  { name: MASTER_CATEGORIES.RAW_DATA, order: 3, icon: StorageIcon },
  { name: MASTER_CATEGORIES.SETUP, order: 4, icon: SettingsIcon },
  { name: MASTER_CATEGORIES.PAYROLL_CALCULATIONS, order: 5, icon: AccountBalanceIcon },
  { name: MASTER_CATEGORIES.PERFORMANCE_MANAGEMENT, order: 6, icon: AssessmentIcon },
  { name: MASTER_CATEGORIES.CALLBUDDY, order: 7, icon: Headset },
  { name: MASTER_CATEGORIES.FILE_MANAGEMENT, order: 8, icon: CloudUploadIcon },
  { name: MASTER_CATEGORIES.SYSTEM_LOGS, order: 9 },
  { name: MASTER_CATEGORIES.DEPRECATED, order: 10 },
];

const getAppSpecificMasterModules = (handleOpenMaster) => [
  {
    title: "Employee Master",
    description:
      "Comprehensive employee database management including personal details, salary administration, leave policies, and performance tracking with advanced reporting capabilities.",
    icon: PeopleIcon,
    color: "primary",
    onClick: () => handleOpenMaster("employee"),
    buttonText: "Manage Employees",
    tags: ["Employee", "Database", "Salary", "Leave", "Performance"],
    keywords:
      "employee staff personnel database management salary leave performance tracking HR human resources",
    category: MASTER_CATEGORIES.COMMON_MASTERS,
    onboarding: 3,
    masterKey: "employee",
  },
  {
    title: "Leaves Taken",
    description:
      "Centralized management of leaves taken records including leaves taken code, name, and description.",
    icon: EventNoteIcon, // Changed from EventIcon to EventNoteIcon
    color: "warning", // Changed from secondary to info
    onClick: () => handleOpenMaster("leaves-taken"),
    buttonText: "Manage Leaves Taken",
    tags: ["Leave Records", "Attendance", "Time Tracking", "History"],
    keywords: "leave records attendance time tracking history taken",
    category: MASTER_CATEGORIES.COMMON_MASTERS,
  },
  {
    title: "Reimbursement",
    description:
      "Configure and manage employee reimbursement types, limits, and approval workflows. Supports uploading and tracking bills or receipts in image or PDF formats for transparent expense management.",
    icon: AccountBalanceWalletIcon,
    color: "success",
    onClick: () => handleOpenMaster("reimbursement"),
    buttonText: "Manage Reimbursements",
    tags: ["Reimbursement", "Bills", "Expenses", "Finance"],
    keywords: "reimbursement expense claim bills receipt pdf image",
    category: MASTER_CATEGORIES.COMMON_MASTERS,
  },
  {
    title: "Formula Repository",
    description:
      "Centralized management of payroll and attendance formulas including Gross Pay, Overtime, Leave, Holidays, and Entry/Exit calculations.",
    icon: CalculateIcon,
    color: "info",
    onClick: () => handleOpenMaster("formula-master"),
    buttonText: "Manage Formulas",
    tags: ["Formula", "Payroll", "Attendance", "Calculation", "Policy"],
    keywords:
      "formula repository gross pay overtime leave holiday calculation policy hrms attendance payroll",
    category: MASTER_CATEGORIES.PAYROLL_CALCULATIONS,
    permissionName: "read_formula_master",
  },
  {
    title: "Raw Punch",
    description:
      "Manage and review raw punch-in and punch-out records directly from biometric or access control systems for auditing and attendance reconciliation.",
    icon: FingerprintIcon,
    color: "warning",
    onClick: () => handleOpenMaster("raw-punch"),
    buttonText: "Manage Raw Punches",
    tags: ["Punch", "Attendance", "Raw Data", "Biometric", "Access Control"],
    keywords:
      "raw punch attendance punch-in punch-out biometric log time entry exit access device data reconciliation audit",
    category: MASTER_CATEGORIES.RAW_DATA,
  },

  {
    title: "Holidays",
    description:
      "Holiday types, the reusable date calendar, and the holiday lists assigned to employees and departments — all in one place.",
    icon: BeachAccessIcon,
    color: "secondary",
    // Pinned: the gating permission is otherwise derived from the title, and
    // the permission is `read_holiday` (singular). Without this, renaming the
    // card hides it from everyone.
    permissionName: "read_holiday",
    onClick: () => handleOpenMaster("holidays"),
    buttonText: "Manage Holidays",
    tags: ["Calendar", "Holidays", "Events", "Planning"],
    // Keywords from the old Holiday Type / Holiday Days cards are kept here so
    // searching for either still finds the workspace that absorbed them.
    keywords:
      "holiday calendar festive dates public holidays events planning schedule notifications holiday type abbreviation holiday days full day half day list",
    category: MASTER_CATEGORIES.MANAGEMENT,
  },

  {
    title: "GatePass",
    description:
      "Centralized management of gatepass records including entry and exit times, duration, and notes.",
    icon: EventNoteIcon,
    color: "error",
    onClick: () => handleOpenMaster("gatepass"),
    buttonText: "Manage GatePass",
    tags: ["Calendar", "GatePass", "Entry", "Exit", "Duration", "Notes"],
    keywords:
      "gatepass calendar entry exit duration notes planning schedule notifications",
    category: MASTER_CATEGORIES.RAW_DATA,
  },
  {
    title: "Department",
    description:
      "Centralized management of department records including department code, name, and description.",
    icon: BusinessIcon, // Changed from EventIcon to BusinessIcon
    color: "info", // Changed from secondary to info
    onClick: () => handleOpenMaster("department"),
    buttonText: "Manage Department",
    tags: ["Department", "Organization", "Structure", "Management"],
    keywords: "department organization structure management hierarchy company division",
    category: MASTER_CATEGORIES.SETUP,
    onboarding: 1,
    masterKey: "department",
  },
  {
    title: "Cost Center",
    description: "Centralized management of cost centers for employee assignment, budgeting, and financial reporting.",
    icon: AccountTreeIcon,
    color: "info",
    onClick: () => handleOpenMaster("cost-center"),
    buttonText: "Manage Cost Centers",
    tags: ["Cost Center", "Finance", "Budget", "Reporting"],
    keywords: "cost center finance budget reporting department allocation",
    category: MASTER_CATEGORIES.SETUP,
  },
  {
    title: "Personnel Area",
    description: "Manage personnel areas (zones/locations) used to group employees and map biometric terminals to specific sites.",
    icon: BusinessIcon,
    color: "primary",
    onClick: () => handleOpenMaster("personnel-area"),
    buttonText: "Manage Personnel Areas",
    tags: ["Personnel Area", "Zone", "Location", "Terminal", "Site"],
    keywords: "personnel area zone location site terminal biometric area code area name default",
    category: MASTER_CATEGORIES.SETUP,
  },
  {
    title: "Employee Area Assignment",
    description: "Assign employees to the personnel areas they work in, in bulk or by import — a punch is allowed within the geofence of any area they hold.",
    icon: BusinessIcon,
    color: "primary",
    onClick: () => handleOpenMaster("employee-area-assignment"),
    buttonText: "Assign Personnel Areas",
    tags: ["Employee", "Personnel Area", "Assignment", "Geofence"],
    keywords: "employee personnel area assignment assign zone location geofence site import",
    category: MASTER_CATEGORIES.SETUP,
  },
  {
    title: "Position",
    description:
      "Centralized management of position records including position code, name, and description.",
    icon: WorkIcon, // Changed from EventIcon to WorkIcon
    color: "warning", // Changed from secondary to warning
    onClick: () => handleOpenMaster("position"),
    buttonText: "Manage Position",
    tags: ["Position", "Job", "Role", "Career"],
    keywords: "position job role career title designation employment",
    category: MASTER_CATEGORIES.SETUP,
    onboarding: 2,
    masterKey: "position",
  },
  {
    title: "Asset",
    description:
      "Company asset register with allocation tracking — assign assets to employees with handover photos and mark them returned.",
    icon: InventoryIcon,
    color: "info",
    onClick: () => handleOpenMaster("asset"),
    buttonText: "Manage Assets",
    tags: ["Asset", "Allocation", "Inventory", "Issue", "Return"],
    keywords: "asset allocation inventory equipment laptop uniform tool issue return handover employee",
    category: MASTER_CATEGORIES.MANAGEMENT,
    masterKey: "asset",
  },
  {
    title: "Employee Asset Allocation",
    description:
      "Every asset issued to every employee in one grid — review who holds what, export it, and bulk issue or return by import.",
    icon: InventoryIcon,
    color: "primary",
    onClick: () => handleOpenMaster("asset-allocation"),
    buttonText: "Manage Allocations",
    tags: ["Asset", "Allocation", "Issue", "Return", "Employee"],
    keywords: "employee asset allocation issue return handover custody laptop uniform tool export import bulk",
    permissionName: "read_asset_allocation",
    category: MASTER_CATEGORIES.MANAGEMENT,
    masterKey: "asset-allocation",
  },
  {
    title: "Leave Type",
    description:
      "Centralized management of leave type records including leave type code, name, and description.",
    icon: BeachAccessIcon, // Changed from EventIcon to BeachAccessIcon
    color: "success", // Changed from secondary to success
    onClick: () => handleOpenMaster("leave-type"),
    buttonText: "Manage Leave Type",
    tags: ["Leave", "Time Off", "Vacation", "Absence"],
    keywords: "leave time off vacation absence sick personal holiday",
    category: MASTER_CATEGORIES.SETUP,
  },
  {
    title: "Allowance Type",
    description:
      "Centralized management of allowance type records including allowance type code, name, and description.",
    icon: MonetizationOnIcon, // Changed from EventIcon to MonetizationOnIcon
    color: "success", // Changed from secondary to success
    onClick: () => handleOpenMaster("allowance-type"),
    buttonText: "Manage Allowance Type",
    tags: ["Allowance", "Benefits", "Compensation", "Extra"],
    keywords: "allowance benefits compensation extra payment bonus",
    category: MASTER_CATEGORIES.SETUP,
  },
  {
    title: "Job Offer Salary Structure",
    description:
      "Manage salary structure components for job offer letters. Define components with formulas that calculate values based on gross salary (e.g., Basic, HRA, Allowances).",
    icon: MonetizationOnIcon,
    color: "info",
    onClick: () => handleOpenMaster("job-offer-salary-structure"),
    buttonText: "Manage Salary Structure",
    tags: ["Job Offer", "Salary", "Components", "Formula", "Breakdown"],
    keywords: "job offer salary structure components formula breakdown calculation",
    category: MASTER_CATEGORIES.DEPRECATED,
  },
  {
    title: "Salary Structure",
    description:
      "Manage comprehensive salary structures with multiple components (Earnings, Deductions, Contributions, etc.) and map them to formulas for dynamic payroll calculations.",
    icon: CurrencyRupeeIcon,
    color: "success",
    onClick: () => handleOpenMaster("salary-structure"),
    buttonText: "Manage Salary Structures",
    tags: ["Salary", "Structure", "Components", "Formula", "Payroll", "Earnings", "Deductions"],
    keywords: "salary structure components formula payroll earnings deductions contributions variable pay leave",
    category: MASTER_CATEGORIES.PAYROLL_CALCULATIONS,
  },
  // Reviews and appraisals are different events on independent timelines — the recurring
  // conversation and the rating that drives increments — so each gets its own pair of
  // entries. One combined screen means every list has to be read with a Type column in mind,
  // which is how an annual appraisal ends up saved as a monthly review.
  {
    title: "Performance Review Cycle",
    description:
      "Define recurring review rounds — the period they cover, how often they come round, whether a self appraisal is required, and when they are open. Opening a round's reviews for every active employee is one click from here.",
    icon: EventNoteIcon,
    color: "info",
    onClick: () => handleOpenMaster("performance-review-cycle"),
    buttonText: "Manage Review Cycles",
    tags: ["Performance", "Review", "Cycle", "Period"],
    keywords: "performance review cycle period round monthly quarterly recurring generate cadence",
    category: MASTER_CATEGORIES.PERFORMANCE_MANAGEMENT,
    permissionName: "read_performance_cycle",
  },
  {
    title: "Performance Review",
    description:
      "The recurring performance conversation, scored: self and reviewer scores against each KRA, the weighted result and its rating band, and sign-off. Generate a whole round from the Performance Review Cycle master.",
    icon: AssessmentIcon,
    color: "primary",
    onClick: () => handleOpenMaster("performance-review"),
    buttonText: "Manage Reviews",
    tags: ["Performance", "Review", "Rating", "KRA"],
    keywords:
      "performance review rating kra competency score band reviewer self review monthly quarterly",
    category: MASTER_CATEGORIES.PERFORMANCE_MANAGEMENT,
    permissionName: "read_performance_review",
  },
  {
    title: "Appraisal Cycle",
    description:
      "Define appraisal rounds — the periodic rating that drives increments. The period they cover, how often they come round, whether a self appraisal is required, and when they are open.",
    icon: EventNoteIcon,
    color: "info",
    onClick: () => handleOpenMaster("appraisal-cycle"),
    buttonText: "Manage Appraisal Cycles",
    tags: ["Appraisal", "Cycle", "Period", "Annual"],
    keywords: "appraisal cycle period round half yearly annual increment generate cadence",
    category: MASTER_CATEGORIES.PERFORMANCE_MANAGEMENT,
    permissionName: "read_performance_cycle",
  },
  {
    title: "Appraisal",
    description:
      "The periodic rating that drives increments: self and reviewer scores against each KRA, the weighted result and its rating band, and sign-off. Generate a whole round from the Appraisal Cycle master.",
    icon: AssessmentIcon,
    color: "primary",
    onClick: () => handleOpenMaster("appraisal"),
    buttonText: "Manage Appraisals",
    tags: ["Appraisal", "Rating", "KRA", "Increment"],
    keywords:
      "appraisal rating kra competency score band reviewer self appraisal increment annual",
    category: MASTER_CATEGORIES.PERFORMANCE_MANAGEMENT,
    permissionName: "read_performance_review",
  },
  {
    title: "Performance Parameter",
    description:
      "The KRAs and competencies people are scored on, each with its weightage and rating scale. A parameter can apply company-wide or to one department.",
    icon: ChecklistIcon,
    color: "secondary",
    onClick: () => handleOpenMaster("performance-parameter"),
    buttonText: "Manage Parameters",
    tags: ["Performance", "KRA", "Competency", "Weightage"],
    keywords: "performance parameter kra competency weightage rating scale appraisal criteria",
    category: MASTER_CATEGORIES.PERFORMANCE_MANAGEMENT,
    permissionName: "read_performance_parameter",
  },
  {
    title: "Operation Cycle",
    description:
      "Manage the operation cycles employees are assigned to, with cycle code and name.",
    icon: EventNoteIcon,
    color: "secondary",
    onClick: () => handleOpenMaster("operation-cycle"),
    permissionName: "read_operation_cycle",
    buttonText: "Manage Operation Cycles",
    tags: ["Operation", "Cycle", "Shift", "Production"],
    keywords: "operation cycle production shift rotation batch",
    category: MASTER_CATEGORIES.COMMON_MASTERS,
  },
  {
    title: "Role & Responsibility",
    description:
      "Define roles and the responsibilities each one carries; employees inherit the text from the role they are assigned.",
    icon: BadgeIcon,
    color: "secondary",
    onClick: () => handleOpenMaster("role-responsibility"),
    permissionName: "read_role_responsibility",
    buttonText: "Manage Roles",
    tags: ["Role", "Responsibility", "Duties", "Job"],
    keywords: "role responsibility duties job description accountability",
    category: MASTER_CATEGORIES.COMMON_MASTERS,
  },
  {
    title: "Purpose Type",
    description:
      "Centralized management of purpose type records including purpose type code, name, and description.",
    icon: CategoryIcon, // Changed from EventIcon to CategoryIcon
    color: "secondary", // Kept secondary as it fits well
    onClick: () => handleOpenMaster("purpose-type"),
    buttonText: "Manage Purpose Type",
    tags: ["Purpose", "Category", "Classification", "Type"],
    keywords: "purpose category classification type reason objective",
    category: MASTER_CATEGORIES.SETUP,
  },
  {
    title: "Canteen Meal Type",
    description:
      "Manage canteen meal types (Breakfast, Lunch, Snacks, Dinner) with code, name, and active status.",
    icon: RestaurantIcon,
    color: "success",
    onClick: () => handleOpenMaster("canteen-meal-type"),
    buttonText: "Manage Meal Types",
    tags: ["Canteen", "Meal", "Breakfast", "Lunch", "Dinner", "Snacks"],
    keywords: "canteen meal type breakfast lunch snacks dinner food token",
    category: MASTER_CATEGORIES.SETUP,
  },
  {
    title: "Service Offering",
    description:
      "Catalogue the service offerings your company provides to customers. Capture offering code, name, and a detailed description for each offering.",
    icon: WorkIcon,
    color: "primary",
    onClick: () => handleOpenMaster("service-offering"),
    buttonText: "Manage Service Offerings",
    tags: ["Service", "Offering", "Customer", "Catalogue"],
    keywords: "service offering customer catalogue product company",
    category: MASTER_CATEGORIES.SETUP,
  },
  {
    title: "Customer",
    description:
      "Manage your customers — identity, GSTIN/PAN, service offering, contact details, bank info, and company logo. Each customer is backed by a contact record automatically.",
    icon: ContactsIcon,
    color: "info",
    onClick: () => handleOpenMaster("customer"),
    buttonText: "Manage Customers",
    tags: ["Customer", "Client", "GSTIN", "Bank", "Contact"],
    keywords: "customer client gstin pan bank logo contact entity",
    category: MASTER_CATEGORIES.SETUP,
  },
  {
    title: "Leave List",
    description:
      "Centralized management of leave list records including leave list code, name, and description.",
    icon: ListAltIcon, // Changed from EventIcon to ListAltIcon
    color: "warning", // Changed from secondary to warning
    onClick: () => handleOpenMaster("leave-list"),
    buttonText: "Manage Leave List",
    tags: ["Leave List", "Planning", "Schedule", "Calendar"],
    keywords: "leave list planning schedule calendar allocation",
    category: MASTER_CATEGORIES.SETUP,
  },
  {
    title: "Employee Merge",
    description:
      "Centralized management of employee merge records including employee merge code, name, and description.",
    icon: MergeIcon, // Changed from EventIcon to MergeIcon
    color: "error", // Changed from secondary to error
    onClick: () => handleOpenMaster("employee-merge"),
    buttonText: "Manage Employee Merge",
    tags: ["Merge", "Consolidation", "Data", "Integration"],
    keywords: "employee merge consolidation data integration combine",
    category: MASTER_CATEGORIES.MANAGEMENT,
  },
  {
    title: "Timetable",
    description: "Centralized management of timetable records including timetable code, name, and description.",
    icon: EventNoteIcon,
    color: "info",
    onClick: () => handleOpenMaster("timetable"),
    buttonText: "Manage Timetable",
    tags: ["Schedule", "Calendar", "Time", "Shift"],
    keywords: "timetable schedule calendar time interval",
    category: MASTER_CATEGORIES.SETUP,
  },
  {
    title: "Manual Attendance",
    description:
      "Manage manual attendance status updates for employees by date (Present/Absent/etc).",
    icon: EventNoteIcon,
    color: "warning",
    onClick: () => handleOpenMaster("manual-attendance"),
    buttonText: "Manage Manual Attendance",
    tags: ["Attendance", "Manual", "Status", "P/A"],
    keywords: "manual attendance status present absent half day leave",
    category: MASTER_CATEGORIES.MANAGEMENT,
  },
  {
    title: "Manual Punches",
    description: "Record and manage manual check-in and check-out punches for employees with approval workflow.",
    icon: EventNoteIcon,
    color: "info",
    onClick: () => handleOpenMaster("manual-punches"),
    buttonText: "Manage Manual Punches",
    tags: ["Punch", "Attendance", "Manual", "Time"],
    keywords: "manual punch attendance check in check out time approval",
    category: MASTER_CATEGORIES.MANAGEMENT,
  },
  {
    title: "Manual Salaries",
    description: "Manage employee component amounts by date. Assign specific salary component amounts to employees for specific dates with full CRUD operations.",
    icon: MonetizationOnIcon,
    color: "success",
    onClick: () => handleOpenMaster("manual-salaries"),
    buttonText: "Manage Manual Salaries",
    tags: ["Component", "Amount", "Salary", "Date", "Employee"],
    keywords: "manual salary component amount payroll date employee",
    category: MASTER_CATEGORIES.MANAGEMENT,
  },
  {
    title: "Vastram Daily Performance",
    description: "Per employee, per day customer tally (customers, sales, left) backing the Vastram Daily Performance report. Add or correct counts by date.",
    icon: StorefrontIcon,
    color: "warning",
    onClick: () => handleOpenMaster("vastram-daily-performance"),
    buttonText: "Manage Vastram Counters",
    tags: ["Vastram", "Customers", "Sales", "Daily", "Performance"],
    keywords: "vastram daily performance customer sale left counter retail tally",
    category: MASTER_CATEGORIES.MANAGEMENT,
    permissionName: "read_vastram_daily_counter",
    masterKey: "vastram-daily-performance",
  },
  {
    title: "Employee Schedule",
    description: "Centralized management of employee schedule records including employee schedule code, name, and description.",
    icon: EventNoteIcon,
    color: "info",
    onClick: () => handleOpenMaster("employee-schedule"),
    buttonText: "Manage Employee Schedule",
    tags: ["Employee Schedule", "Schedule", "Calendar", "Time"],
    keywords: "employee schedule schedule calendar time interval",
    category: MASTER_CATEGORIES.RAW_DATA,
  },
  {
    title: "Compound Shift",
    description: "Centralized management of compound shift records including compound shift code, name, and description.",
    icon: EventNoteIcon,
    color: "info",
    onClick: () => handleOpenMaster("compound-shift"),
    buttonText: "Manage Compound Shift",
    tags: ["Compound Shift", "Shift", "Time", "Attendance"],
    keywords: "compound shift shift time attendance",
    category: MASTER_CATEGORIES.SETUP,
  },
  // "Holiday Type" and "Holiday Days" used to be separate cards here, in two
  // different categories. They are steps 1 and 2 of the same job, so they now
  // live as tabs inside the "Holidays" card above.
  {
    title: "Weekly Off",
    description: "Centralized management of weekly off days configuration including name, off day, and full day settings for attendance and scheduling.",
    icon: CalendarTodayIcon,
    color: "secondary",
    onClick: () => handleOpenMaster("weekly-off"),
    buttonText: "Manage Weekly Off",
    tags: ["Weekly Off", "Off Day", "Rest Day", "Schedule", "Calendar"],
    keywords: "weekly off rest day off day schedule calendar attendance full day half day",
    category: MASTER_CATEGORIES.SETUP,
  },

  // Location Tracker Master
  {
    title: "Contact Master",
    description: "Comprehensive contact management system for tracking leads, customers, and business contacts with location data, call logs, payment records, and activity history.",
    icon: ContactsIcon,
    color: "primary",
    onClick: () => handleOpenMaster("contact"),
    buttonText: "Manage Contacts",
    tags: ["Contact", "Lead", "Customer", "CRM", "Location", "Call Log"],
    keywords: "contact lead customer CRM location tracking call log payment activity notes description",
    category: MASTER_CATEGORIES.CALLBUDDY,
  },
  {
    title: "User Master",
    description: "Centralized management of user records including user code, name, and description.",
    icon: EventNoteIcon,
    color: "info",
    onClick: () => handleOpenMaster("users"),
    buttonText: "Manage User",
    tags: ["User", "Salesperson", "Sales", "Employee"],
    keywords: "user, salesperson, sales, employee,",
    category: MASTER_CATEGORIES.CALLBUDDY,
    permissionName: "view_user_module",
  },
  {
    title: "Terminal Master",
    description: "Centralized management of terminal devices including serial number (SN) and terminal name. Manage and sync biometric and access control terminals.",
    icon: DevicesIcon,
    color: "primary",
    onClick: () => handleOpenMaster("terminal"),
    buttonText: "Manage Terminals",
    tags: ["Terminal", "Device", "Biometric", "Access Control", "Hardware"],
    keywords: "terminal device biometric access control hardware serial number SN sync",
    category: MASTER_CATEGORIES.RAW_DATA
  },
  {
    title: "Terminal Commands Master",
    description:
      "Review completed ZK / biometric terminal command results: filter by date, terminal, employee, and department. Uses the same standard filters as reports plus a terminal picker.",
    icon: TerminalCommandsIcon,
    color: "secondary",
    onClick: () => handleOpenMaster("terminal-commands"),
    buttonText: "View Terminal Commands",
    tags: ["Terminal", "Commands", "Device", "ZK", "Biometric"],
    keywords: "terminal commands device zk biometric command queue return status filter",
    category: MASTER_CATEGORIES.RAW_DATA,
    permissionName: "read_terminal_commands_master",
  },
  {
    title: "Canteen Token Print Master",
    description:
      "Print canteen tokens from canteen-machine punches. Read-only list filtered to canteen machines; supports real-time auto-print of new tokens.",
    icon: FingerprintIcon,
    color: "warning",
    onClick: () => handleOpenMaster("canteen-token-print"),
    buttonText: "View Canteen Tokens",
    tags: ["Canteen", "Token", "Print", "Punch", "Raw Data"],
    keywords: "canteen token print meal machine punch thermal kiosk auto print receipt",
    category: MASTER_CATEGORIES.RAW_DATA,
    permissionName: "read_canteen_token_print",
  },
  {
    title: "Advance",
    description: "Manage employee advance records including applications, approvals, disbursements, repayment schedules, and recovery with comprehensive tracking and reporting.",
    icon: AccountBalanceIcon,
    color: "info",
    onClick: () => handleOpenMaster("advance"),
    buttonText: "Manage Advance",
    tags: ["Advance", "Finance", "Employee", "Repayment", "Recovery", "Disbursement"],
    keywords: "advance finance employee repayment recovery disbursement application approval schedule",
    category: MASTER_CATEGORIES.COMMON_MASTERS,

  },
  {
  title: "CallBuddy WhatsApp Templates",
  description: "Manage reusable WhatsApp message templates for CallBuddy. Define a template name and the message body to be sent to contacts.",
  icon: WhatsAppIcon,
  color: "success",
  onClick: () => handleOpenMaster("whatsapp-template"),
  buttonText: "Manage Templates",
  tags: ["WhatsApp", "Template", "Message", "CallBuddy"],
  keywords: "whatsapp template message callbuddy send contact",
  category: MASTER_CATEGORIES.CALLBUDDY,
  permissionName: "read_whatsapp_template",
},
{
  id: "cache",
  title: "Cache Manager",
  description: "Inspect what this browser tab is caching — filter option lists, employee rosters, sizes and expiry — and drop any of it to force a fresh load.",
  icon: MemoryIcon,
  color: "warning",
  onClick: () => handleOpenMaster("cache"),
  buttonText: "Open Cache Manager",
  tags: ["Cache","Session","Performance","Filters","Refresh"],
  keywords: "cache session storage memory bust clear refresh stale filters options performance",
  category: MASTER_CATEGORIES.SYSTEM_LOGS,
  // Client-side only: it shows sizes and expiry, never cached values, and the
  // worst a bust can do is make the next page load slower. No server permission
  // exists to check against.
  skipPermissionCheck: true,
}
];



const defaultMasterCategoryIcon = CategoryIcon;

export {
  getAppSpecificMasterModules,
  appSpecificMasterCategoryOrder,
  defaultMasterCategoryIcon,
};
