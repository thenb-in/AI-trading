import {
  registerAppMasterModules,
  registerAppMasterCategories,
} from "@startup/data/masterModuleRegistry";
import { registerAppModules } from "@startup/data/appModuleRegistry";
import { registerAppReports } from "@startup/data/reportModuleRegistry";
import { registerAppRouteTitles } from "@startup/seo/routeTitleRegistry";

import {
  getAppSpecificMasterModules,
  appSpecificMasterCategoryOrder,
} from "./getMasterModules";
import { getEtimeAppModuleDefinitions } from "./getAppModules";
import { reports, categories } from "./getReportModules";
import { registerFilterOptionResolvers } from "../filter/registerFilterOptionResolvers";
import {
  appRouteTitles,
  appTitlePatterns,
  appPrivatePathPrefixes,
} from "../seo/appRouteTitles";


function registerAppData() {
  registerAppMasterModules(getAppSpecificMasterModules);
  registerAppMasterCategories(appSpecificMasterCategoryOrder);
  registerAppModules(getEtimeAppModuleDefinitions);
  registerAppReports(reports, categories);
  registerFilterOptionResolvers();
  registerAppRouteTitles({
    titles: appRouteTitles,
    patterns: appTitlePatterns,
    privatePrefixes: appPrivatePathPrefixes,
  });
}

export { registerAppData };
