import {
  registerAppMasterModules,
  registerAppMasterCategories,
} from "@startup/data/masterModuleRegistry";


const MASTER_CATEGORIES = {};

const appSpecificMasterCategoryOrder = [];

const getAppSpecificMasterModules = () => [];

registerAppMasterModules(getAppSpecificMasterModules);
registerAppMasterCategories(appSpecificMasterCategoryOrder);

export {
  getAppSpecificMasterModules,
  appSpecificMasterCategoryOrder,
  MASTER_CATEGORIES,
};
