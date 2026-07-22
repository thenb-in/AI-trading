import {
  registerAppMasterModules,
  registerAppMasterCategories,
} from "@startup/data/masterModuleRegistry";
import { registerAppModules } from "@startup/data/appModuleRegistry";
import { registerAppReports } from "@startup/data/reportModuleRegistry";
import { registerAppRouteTitles } from "@startup/seo/routeTitleRegistry";
import {
  registerAppLoginHandlers,
  registerAppLogoutHandlers,
} from "@startup/data/authHandlerRegistry";

import {
  getAppSpecificMasterModules,
  appSpecificMasterCategoryOrder,
} from "./getMasterModules";
import { getAppSpecificModuleDefinitions } from "./getAppModules";
import { reports, categories } from "./getReportModules";
import { registerFilterOptionResolvers } from "../filter/registerFilterOptionResolvers";
import {
  appRouteTitles,
  appTitlePatterns,
  appPrivatePathPrefixes,
} from "../seo/appRouteTitles";
import { onLogout } from "../hooks/onLogout";
import { onLogin } from "../hooks/onLogin";


function registerAppData() {
  registerAppMasterModules(getAppSpecificMasterModules);
  registerAppMasterCategories(appSpecificMasterCategoryOrder);
  registerAppModules(getAppSpecificModuleDefinitions);
  registerAppReports(reports, categories);
  registerFilterOptionResolvers();
  registerAppRouteTitles({
    titles: appRouteTitles,
    patterns: appTitlePatterns,
    privatePrefixes: appPrivatePathPrefixes,
  });
  registerAppLogoutHandlers([onLogout]);
  registerAppLoginHandlers([onLogin]);
}

export { registerAppData };
