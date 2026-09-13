import {
  Settings as SettingsIcon,
  Category as CategoryIcon,
  Storage as StorageIcon,
  SupervisorAccount as ManagementIcon,
  Build as CommonMastersIcon,
} from "@mui/icons-material";

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
 * Masters this app owns, beside the framework's generic ones.
 */
const getAppSpecificMasterModules = () => [];

const defaultMasterCategoryIcon = CategoryIcon;

export {
  getAppSpecificMasterModules,
  appSpecificMasterCategoryOrder,
  defaultMasterCategoryIcon,
};
