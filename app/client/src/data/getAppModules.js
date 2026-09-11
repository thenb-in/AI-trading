import {
  LayoutDashboard,
  ScanFace,
  MapPinCheckInside,
  Gauge,
  ListChecks,
  Trophy,
} from "lucide-react";
import { getGenericAppModuleDefinitions } from "@startup/data/getAppModules";

/**
 * etime-specific app modules (sidebar / top nav): searchable alongside
 * masters and reports. These are the modules whose pages live in the app
 * layer (quick check-in, HR dashboard, dashboards, WageMaster). Registered via
 * registerAppModules(); the framework's appModuleRegistry appends the generic
 * modules to this list, so only app-specific ones belong here.
 *
 * Sidebar order: `order` field; visibility: `isAppModuleVisible` (used by
 * `useAppMenuItems`). `color` is the ModuleCard accent (kept on the
 * definition itself so the navigator and the signup plan preview both read
 * it straight from here).
 */
const getEtimeAppModuleDefinitions = () => [
  {
    id: "biometricPunch",
    title: "Biometric Punch",
    description: "Quick biometric punch and attendance capture.",
    category: "Attendance",
    color: "teal",
    tags: ["Biometric", "Punch", "Attendance"],
    keywords: "biometric punch scan face attendance quick check in module",
    permissionName: "view_biometric_punch_module",
    navigatePath: "/admin/quick-check-in",
    icon: ScanFace,
    order: 2,
  },
  {
    id: "checklist",
    title: "Checklist",
    description: "The daily, weekly and monthly worklist — what must be cleared before you close.",
    category: "Attendance",
    color: "danger",
    tags: ["Checklist", "Worklist", "Todo", "Data Quality"],
    keywords: "checklist worklist todo daily weekly monthly close pending missing data quality module",
    permissionName: "view_checklist_module",
    navigatePath: "/admin/checklist",
    icon: ListChecks,
    // Sits directly under Navigator — this is the page the day starts on. The
    // sidebar sorts `order` numerically, so a fraction slots it in without
    // renumbering the nine modules below it.
    order: 1.5,
  },
  {
    id: "myAppraisal",
    title: "My Appraisal",
    description: "Your own appraisals, and the ones you review for your team.",
    category: "Attendance",
    color: "warning",
    tags: ["Appraisal", "Performance", "KRA", "Self Service"],
    keywords: "my appraisal performance kra kpi self review rating band self service module",
    permissionName: "view_my_appraisal_module",
    navigatePath: "/admin/my-appraisal",
    icon: Trophy,
    // Sits just under the worklist: it is a personal page rather than an administrative
    // one, so it belongs above the HR modules an ordinary employee has no permission for.
    order: 1.6,
  },
  {
    id: "hrDashboard",
    title: "HR Dashboard",
    description: "HR analytics, attendance trends, and pending approvals.",
    category: "Analytics",
    color: "purple",
    tags: ["HR", "Dashboard", "Analytics", "Attendance"],
    keywords: "hr dashboard analytics attendance trends heatmap approvals module",
    permissionName: "view_hr_dashboard_module",
    navigatePath: "/admin/hr-dashboard",
    icon: Gauge,
    order: 3,
  },
  {
    id: "dashboards",
    title: "Dashboards",
    description: "View dashboards and analytics summaries.",
    category: "Analytics",
    color: "purple",
    tags: ["Dashboard", "Analytics", "Charts"],
    keywords: "dashboard dashboards analytics charts kpi module",
    permissionName: "view_dashboard_module",
    navigatePath: "/admin/dashboard",
    icon: LayoutDashboard,
    order: 4,
  },
  {
    id: "locationCallBuddy",
    title: "Location & CallBuddy",
    description: "WageMaster location and CallBuddy user views.",
    category: "WageMaster",
    color: "warning",
    tags: ["Location", "CallBuddy", "Map"],
    keywords: "location callbuddy wagemaster map module",
    permissionName: "view_wagemaster_module",
    navigatePath: "/admin/wagemaster/dashboard",
    icon: MapPinCheckInside,
    order: 9,
  },
];

/**
 * Full app module list: framework generics + etime-specific modules.
 * Consumers (sidebar, navigator, search, route titles) read this.
 */
const getAppModuleDefinitions = () => [
  ...getGenericAppModuleDefinitions(),
  ...getEtimeAppModuleDefinitions(),
];

export { getAppModuleDefinitions, getEtimeAppModuleDefinitions };
