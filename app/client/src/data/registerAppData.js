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
import { registerCompanyProfileSettings } from "@startup/data/companyProfileRegistry";
import {
  registerUserManagementExtraColumns,
  registerApproveExtension,
} from "@startup/data/userManagementRegistry";
import { registerAppLayout } from "@startup/data/appLayoutRegistry";
import { registerReportApi } from "@startup/data/reportApiRegistry";
import { registerSummaryHeaderFields } from "@startup/data/summaryFieldRegistry";
import { registerDefaultSortFields } from "@startup/data/defaultSortFieldRegistry";
import {
  registerAppRoutes,
  registerAppRoutesWithoutSidebar,
  registerDashboardContent,
} from "@startup/data/appRouteRegistry";
import { reportApi } from "../services/api";
import { SUMMARY_HEADER_FIELDS, DEFAULT_REPORT_SORT_FIELDS } from "./reportSummaryConfig";
import { CompanyProfileSettings } from "../components/companyprofile/CompanyProfileSettings";
import { getUserManagementExtraColumns } from "../components/userManagementExtraColumns";
import { useApproveExtension } from "../components/user_management_extra_columns/useApproveExtension";
import { AppLayout } from "../components/app_layout/AppLayout";
import { DashboardContent } from "../pages/Dashboards";
import { appRoutes, appRoutesWithoutSidebar } from "./getAppRoutes";

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
  registerCompanyProfileSettings(CompanyProfileSettings);
  registerUserManagementExtraColumns(getUserManagementExtraColumns);
  registerApproveExtension(useApproveExtension);
  registerAppLayout(AppLayout);
  registerReportApi(reportApi);
  registerSummaryHeaderFields(SUMMARY_HEADER_FIELDS);
  registerDefaultSortFields(DEFAULT_REPORT_SORT_FIELDS);
  registerAppRoutes(appRoutes);
  registerAppRoutesWithoutSidebar(appRoutesWithoutSidebar);
  registerDashboardContent(DashboardContent);
}

export { registerAppData };
