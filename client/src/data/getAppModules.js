import {
  BarChart3,
  Layers,
  LayoutDashboard,
  Navigation,
  User,
  Shield,
  CopySlash,
  Crown,
  BookOpen,
  Building
} from "lucide-react";


/**
 * App-level modules (sidebar / top nav): searchable alongside masters and reports.
 * Sidebar order: `order` field; visibility: `isAppModuleVisible` (used by `useAppMenuItems`).
 */
const getAppModuleDefinitions = () => [
  {
    id: "navigator",
    title: "Navigator",
    description:
      "Open the navigator to browse masters, app modules, and reports in one place.",
    category: "Navigation",
    tags: ["Navigator", "Browse", "Home"],
    keywords: "navigator browse home menu app module modules search hub",
    skipPermissionCheck: true,
    navigatePath: "/admin/navigator",
    icon: Navigation,
    order: 1,
  },
  {
    id: "dashboards",
    title: "Dashboards",
    description: "View dashboards and analytics summaries.",
    category: "Analytics",
    tags: ["Dashboard", "Analytics", "Charts"],
    keywords: "dashboard dashboards analytics charts kpi module",
    permissionName: "view_dashboard_module",
    navigatePath: "/admin/dashboard",
    icon: LayoutDashboard,
    order: 3,
  },
  {
    id: "reportsListing",
    title: "Reports",
    description: "Open the reports library to run payroll and HR reports.",
    category: "Reports",
    tags: ["Reports", "Library", "Analytics"],
    keywords: "reports listing library payroll hr module report hub",
    permissionName: "view_report_module",
    navigatePath: "/admin/report",
    icon: BarChart3,
    order: 4,
  },
  {
    id: "mastersListing",
    title: "Masters",
    description: "Open the masters area to manage reference and configuration data.",
    category: "Masters",
    tags: ["Masters", "Setup", "Configuration"],
    keywords: "masters master setup configuration reference data module",
    permissionName: "view_master_module",
    navigatePath: "/admin/master",
    icon: Layers,
    order: 5,
  },
  {
    id: "userManagement",
    title: "User Management",
    description: "Manage users, roles assignment, and access.",
    category: "Administration",
    tags: ["Users", "Accounts", "Access"],
    keywords: "users user management accounts administration module",
    permissionName: "view_user_module",
    navigatePath: "/admin/users",
    icon: User,
    order: 6,
  },
  {
    id: "companySettings",
    title: "Company Settings",
    description: "Configure company profile and application settings.",
    category: "Administration",
    tags: ["Company", "Settings", "Profile"],
    keywords: "company settings profile configuration administration module",
    permissionName: "view_company_settings",
    navigatePath: "/admin/company",
    icon: Building,
    order: 7,
  },
  {
    id: "rolesPermissions",
    title: "Roles & Permissions",
    description: "Configure roles and fine-grained permissions.",
    category: "Administration",
    tags: ["Roles", "Permissions", "Security"],
    keywords: "roles permissions rbac security access control module",
    permissionName: "view_role_permission_module",
    navigatePath: "/admin/role-permissions",
    icon: Shield,
    order: 11,
  },
  {
    id: "multiCompanySetup",
    title: "Multi-Company Setup",
    description: "Superadmin tools for multi-company configuration.",
    category: "Superadmin",
    tags: ["Multi-Company", "Setup"],
    keywords: "multi company setup superadmin module",
    requireSadmin: true,
    navigatePath: "/admin/multi-company-setup",
    icon: CopySlash,
    order: 12,
  },
  {
    id: "subscription",
    title: "Subscription",
    description: "Manage subscription and billing (superadmin).",
    category: "Superadmin",
    tags: ["Subscription", "Billing"],
    keywords: "subscription billing plans superadmin module",
    requireSadmin: true,
    navigatePath: "/admin/subscription",
    icon: Crown,
    order: 13,
  },
 {
    id: "appGuide",
    title: "App Guide",
    description: "In-app guide and documentation.",
    category: "Help",
    tags: ["Guide", "Documentation", "Help"],
    keywords: "app guide documentation help tutorial module",
    skipPermissionCheck: true,
    navigatePath: "/admin/app-guide",
    icon: BookOpen,
    order: 14,
  },
];

/**
 * @param {{ navigate: import('react-router-dom').NavigateFunction }} handlers
 * @param {{ hasPermissionFn: (name: string, ctx: unknown) => boolean; dataContext: unknown; userData: { isSadmin?: boolean } | undefined }} access
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
  if (def.requireSadmin) {
    return Boolean(userData?.isSadmin);
  }
  if (def.skipPermissionCheck) {
    return true;
  }
  if (def.permissionName) {
    return hasPermissionFn(def.permissionName, dataContext);
  }
  return false;
}

export { getAppModuleDefinitions, getAppModuleSearchItems, isAppModuleVisible };
