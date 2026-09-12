import {
  Settings as SettingsIcon,
  Memory as MemoryIcon,
  Category as CategoryIcon,
  Storage as StorageIcon,
  SupervisorAccount as ManagementIcon,
  Build as CommonMastersIcon,
} from "@mui/icons-material";
import { GENERIC_MASTER_CATEGORIES } from "@startup/data/genericMasterModules";

/**
 * Single source of truth for this app's master category names.
 */
const MASTER_CATEGORIES = {
  COMMON_MASTERS: "Common Masters",
  MANAGEMENT: "Management",
  RAW_DATA: "Raw Data",
  SETUP: "Setup",
};

/**
 * The app's category buckets — display order AND icon
 */
const appSpecificMasterCategoryOrder = [
  { name: MASTER_CATEGORIES.COMMON_MASTERS, order: 1, icon: CommonMastersIcon },
  { name: MASTER_CATEGORIES.MANAGEMENT, order: 2, icon: ManagementIcon },
  { name: MASTER_CATEGORIES.RAW_DATA, order: 3, icon: StorageIcon },
  { name: MASTER_CATEGORIES.SETUP, order: 4, icon: SettingsIcon },
];

/**
 * Masters this app owns
 */
const getAppSpecificMasterModules = (handleOpenMaster) => [
  {
    id: "cache",
    title: "Cache Manager",
    description: "Inspect what this browser tab is caching — filter option lists, employee rosters, sizes and expiry — and drop any of it to force a fresh load.",
    icon: MemoryIcon,
    color: "warning",
    onClick: () => handleOpenMaster("cache"),
    buttonText: "Open Cache Manager",
    tags: ["Cache", "Session", "Performance", "Filters", "Refresh"],
    keywords: "cache session storage memory bust clear refresh stale filters options performance",
    category: GENERIC_MASTER_CATEGORIES.SYSTEM_LOGS,
    skipPermissionCheck: true,
  }
];

const defaultMasterCategoryIcon = CategoryIcon;

export {
  getAppSpecificMasterModules,
  appSpecificMasterCategoryOrder,
  defaultMasterCategoryIcon,
};
