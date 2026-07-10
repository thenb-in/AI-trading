import {
  BarChart3,
  Layers,
  Navigation,
  User,
  Shield,
  CopySlash,
  Crown,
  BookOpen,
  Building,
} from "lucide-react";
import { getAppModuleDefinitions } from '@app/data/getAppModules';

/**
 * Generic, framework-level app modules shared by every product built on
 * startup (navigator, reports, masters, users, company, roles, superadmin,
 * guide). Product-specific modules (dashboards, biometric punch, HR
 * dashboard, WageMaster, ...) live in the app layer and are merged in via
 * `getAppModuleDefinitions` (imported from `@app/data/getAppModules`).
 *
 * Sidebar placement is by the `order` field, so generic and app modules
 * interleave regardless of concat order. `color` is the ModuleCard accent,
 * kept on the definition so the navigator and signup plan preview read it
 * straight from here.
 */
const getGenericAppModuleDefinitions = () => [
  {
    id: "navigator",
    title: "Navigator",
    description:
      "Open the navigator to browse masters, app modules, and reports in one place.",
    category: "Navigation",
    color: "indigo",
    tags: ["Navigator", "Browse", "Home"],
    keywords: "navigator browse home menu app module modules search hub",
    skipPermissionCheck: true,
    navigatePath: "/admin/navigator",
    icon: Navigation,
    order: 1,
  },
  {
    id: "reportsListing",
    title: "Reports",
    description: "Open the reports library to run payroll and HR reports.",
    category: "Reports",
    color: "orange",
    tags: ["Reports", "Library", "Analytics"],
    keywords: "reports listing library payroll hr module report hub",
    permissionName: "view_report_module",
    navigatePath: "/admin/report",
    icon: BarChart3,
    order: 5,
  },
  {
    id: "mastersListing",
    title: "Masters",
    description: "Open the masters area to manage reference and configuration data.",
    category: "Masters",
    color: "blue",
    tags: ["Masters", "Setup", "Configuration"],
    keywords: "masters master setup configuration reference data module",
    permissionName: "view_master_module",
    navigatePath: "/admin/master",
    icon: Layers,
    order: 6,
  },
  {
    id: "userManagement",
    title: "User Management",
    description: "Manage users, roles assignment, and access.",
    category: "Administration",
    color: "red",
    tags: ["Users", "Accounts", "Access"],
    keywords: "users user management accounts administration module",
    permissionName: "view_user_module",
    navigatePath: "/admin/users",
    icon: User,
    order: 7,
  },
  {
    id: "companySettings",
    title: "Company Settings",
    description: "Configure company profile and application settings.",
    category: "Administration",
    color: "red",
    tags: ["Company", "Settings", "Profile"],
    keywords: "company settings profile configuration administration module",
    permissionName: "view_company_settings",
    navigatePath: "/admin/company",
    icon: Building,
    order: 8,
  },
  {
    id: "rolesPermissions",
    title: "Roles & Permissions",
    description: "Configure roles and fine-grained permissions.",
    category: "Administration",
    color: "red",
    tags: ["Roles", "Permissions", "Security"],
    keywords: "roles permissions rbac security access control module",
    permissionName: "view_role_permission_module",
    navigatePath: "/admin/role-permissions",
    icon: Shield,
    order: 12,
  },
  {
    id: "multiCompanySetup",
    title: "Multi-Company Setup",
    description: "Superadmin tools for multi-company configuration.",
    category: "Superadmin",
    color: "secondary",
    tags: ["Multi-Company", "Setup"],
    keywords: "multi company setup superadmin module",
    requireSupportUser: true,
    navigatePath: "/admin/multi-company-setup",
    icon: CopySlash,
    order: 13,
  },
  {
    id: "subscription",
    title: "Subscription",
    description: "Manage subscription and billing (superadmin).",
    category: "Superadmin",
    color: "secondary",
    tags: ["Subscription", "Billing"],
    keywords: "subscription billing plans superadmin module",
    requireSupportUser: true,
    navigatePath: "/admin/subscription",
    icon: Crown,
    order: 14,
  },
  {
    id: "appGuide",
    title: "App Guide",
    description: "In-app guide and documentation.",
    category: "Help",
    color: "green",
    tags: ["Guide", "Documentation", "Help"],
    keywords: "app guide documentation help tutorial module",
    skipPermissionCheck: true,
    navigatePath: "/admin/app-guide",
    icon: BookOpen,
    order: 15,
  },
];

/**
 * @param {{ navigate: import('react-router-dom').NavigateFunction }} handlers
 * @param {{ hasPermissionFn: (name: string, ctx: unknown) => boolean; dataContext: unknown; userData: { isSupportUser?: boolean } | undefined }} access
 */
function getAppModuleSearchItems(handlers, access) {
  const { navigate } = handlers;
  const { hasPermissionFn, dataContext, userData } = access;

  return getAppModuleDefinitions()
    .filter((def) => isAppModuleVisible(def, { hasPermissionFn, dataContext, userData }))
    .map((def) => {
      const onSelect = () => navigate(def.navigatePath);

      return {
        type: "Module",
        title: def.title,
        description: def.description,
        category: def.category,
        tags: def.tags,
        keywords: def.keywords,
        onSelect,
      };
    });
}

function isAppModuleVisible(def, { hasPermissionFn, dataContext, userData }) {
  if (def.requireSupportUser) {
    return Boolean(userData?.isSupportUser);
  }
  if (def.skipPermissionCheck) {
    return true;
  }
  if (def.permissionName) {
    return hasPermissionFn(def.permissionName, dataContext);
  }
  return false;
}

export {
  getAppModuleDefinitions,
  getGenericAppModuleDefinitions,
  getAppModuleSearchItems,
  isAppModuleVisible,
};
