import {
  Settings as SettingsIcon,
  CloudUpload as CloudUploadIcon,
  Category as CategoryIcon,
} from "@mui/icons-material";


const GENERIC_MASTER_CATEGORIES = {
  FILE_MANAGEMENT: "File Management",
  SYSTEM_LOGS: "System Logs",
};


const genericMasterCategoryOrder = [
  { name: GENERIC_MASTER_CATEGORIES.FILE_MANAGEMENT, order: 7, icon: CloudUploadIcon },
  { name: GENERIC_MASTER_CATEGORIES.SYSTEM_LOGS, order: 8 },
];

const defaultMasterCategoryIcon = CategoryIcon;


const getGenericMasterModules = (handleOpenMaster) => [
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
