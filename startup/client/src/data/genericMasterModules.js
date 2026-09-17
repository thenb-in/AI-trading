import {
  Settings as SettingsIcon,
  CloudUpload as CloudUploadIcon,
  Category as CategoryIcon,
  History as HistoryIcon,
  NotificationsActive as NotificationsActiveIcon,
  Memory as MemoryIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";


const GENERIC_MASTER_CATEGORIES = {
  COMMUNICATION: "Communication",
  FILE_MANAGEMENT: "File Management",
  REPORTING: "Reporting",
  SYSTEM_LOGS: "System Logs",
};


const genericMasterCategoryOrder = [
  { name: GENERIC_MASTER_CATEGORIES.COMMUNICATION, order: 6, icon: NotificationsActiveIcon },
  { name: GENERIC_MASTER_CATEGORIES.FILE_MANAGEMENT, order: 7, icon: CloudUploadIcon },
  { name: GENERIC_MASTER_CATEGORIES.REPORTING, order: 8, icon: AssessmentIcon },
  { name: GENERIC_MASTER_CATEGORIES.SYSTEM_LOGS, order: 9, icon: HistoryIcon },
];

const defaultMasterCategoryIcon = CategoryIcon;


const getGenericMasterModules = (handleOpenMaster) => [
  {
    id: "notification-rule",
    title: "Notification Rules",
    description:
      "Decide who hears about what, and where it reaches them — in-app, by email or on WhatsApp.",
    icon: NotificationsActiveIcon,
    color: "primary",
    onClick: () => handleOpenMaster("notification-rule"),
    buttonText: "Manage Rules",
    tags: ["Notification", "Alert", "In-App", "Email", "WhatsApp"],
    keywords:
      "notification rule alert in-app bell email mail whatsapp message recipient role permission channel",
    category: GENERIC_MASTER_CATEGORIES.COMMUNICATION,
    permissionName: "read_notification_rule",
  },
  {
    id: "report-run",
    title: "Reporting Manager",
    description:
      "Every report you have run, kept with the filters that produced it. Open one to load it instantly, re-run it, or stop one still computing.",
    icon: AssessmentIcon,
    color: "primary",
    onClick: () => handleOpenMaster("report-run"),
    buttonText: "Open Reporting Manager",
    tags: ["Reports", "Runs", "Saved", "Queue", "History"],
    keywords:
      "report run saved runs reporting manager queue re-run rerun stop cancel export history results",
    category: GENERIC_MASTER_CATEGORIES.REPORTING,
    permissionName: "view_report_module",
  },
  {
    id: "activity",
    title: "Audit Logs",
    description:
      "Track and review all user actions and CRUD operations across every system module and model.",
    icon: SettingsIcon,
    color: "success",
    onClick: () => handleOpenMaster("activity"),
    buttonText: "View Audit Logs",
    tags: ["Audit", "Activity", "Logs", "CRUD", "Tracking", "System"],
    keywords:
      "audit logs activity tracking crud operations user actions system history change log",
    category: GENERIC_MASTER_CATEGORIES.SYSTEM_LOGS,
    permissionName: "read_activity",
  },
  {
    id: "cache",
    title: "Cache Manager",
    description:
      "Inspect what this browser tab is caching — users, roles, permissions and filter lists, with sizes, ages and expiry — and drop any of it to force a fresh load.",
    icon: MemoryIcon,
    color: "warning",
    onClick: () => handleOpenMaster("cache"),
    buttonText: "Open Cache Manager",
    tags: ["Cache", "Session", "Performance", "Filters", "Refresh"],
    keywords:
      "cache manager session storage memory bust clear refresh stale filters options performance namespace expiry diagnostics support",
    category: GENERIC_MASTER_CATEGORIES.SYSTEM_LOGS,
    // The page reads the browser's own cache and never calls the server, so
    // there is no permission to check — anyone who can be shown a stale value
    // must be able to drop it.
    skipPermissionCheck: true,
  },
  {
    id: "nbnext-drive",
    title: "NBnext Drive",
    description:
      "Upload, view, download, and manage files. Store files with optional object references for future API integration.",
    icon: CloudUploadIcon,
    color: "secondary",
    onClick: () => handleOpenMaster("nbnext-drive"),
    buttonText: "Open Drive",
    tags: ["Files", "Storage", "Upload", "Download", "Drive", "Documents"],
    keywords: "file storage upload download drive documents files management",
    category: GENERIC_MASTER_CATEGORIES.FILE_MANAGEMENT,
    permissionName: "read_personal_nbnext_drive",
  },
];

export {
  GENERIC_MASTER_CATEGORIES,
  genericMasterCategoryOrder,
  defaultMasterCategoryIcon,
  getGenericMasterModules,
};
