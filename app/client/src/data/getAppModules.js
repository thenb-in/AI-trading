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
  }
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
