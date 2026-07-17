import {
  Fingerprint,
  LayoutDashboard,
  ScanFace,
  MapPinCheckInside,
  Activity as ActivityIcon,
  Gauge,
} from "lucide-react";
import { getGenericAppModuleDefinitions } from "@startup/data/getAppModules";

/**
 * etime-specific app modules (sidebar / top nav): searchable alongside
 * masters and reports. These are the modules whose pages live in the app
 * layer (quick check-in, HR dashboard, dashboards, WageMaster). They are
 * merged with the framework's generic modules to form the full list.
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
  {
    id: "activitiesLogs",
    title: "Activities Logs",
    description: "Review activity and audit logs.",
    category: "WageMaster",
    color: "warning",
    tags: ["Activities", "Logs", "Audit"],
    keywords: "activities logs audit trail module wagemaster",
    permissionName: "view_activities_module",
    navigatePath: "/admin/wagemaster/activities",
    icon: ActivityIcon,
    order: 10,
  },
  {
    id: "identifyOfficer",
    title: "Identify Officer",
    description: "Identify and verify officer records.",
    category: "WageMaster",
    color: "warning",
    tags: ["Officer", "Identify", "Fingerprint"],
    keywords: "identify officer fingerprint verification module",
    permissionName: "view_identify_officer_module",
    navigatePath: "/admin/identify-officer",
    icon: Fingerprint,
    order: 11,
  },
];

/**
 * Full app module list: framework generics + etime-specific modules.
 * Consumers (sidebar, navigator, search, route titles) read this.
 */
const getAppModuleDefinitions = () =>
  [...getGenericAppModuleDefinitions(), ...getEtimeAppModuleDefinitions()].sort(
    (a, b) => a.order - b.order
  );

export { getAppModuleDefinitions, getEtimeAppModuleDefinitions };
