import { Routes, Route } from "react-router-dom";
import { AdminLayout } from "../components/admin/AdminLayout";
import { UserManagement } from "../components/admin/user_management/UserManagement";
import { CompanySettings } from "../components/admin/company_setting/CompanySettings";
import { RolePermissionsManagement } from "../components/admin/role_permissions";
import { MultiCompanyModule } from "../components/admin/multi_company_module/MultiCompanyModule";
import { CompanySwitcher } from "../components/admin/company_switcher/CompanySwitcher";
import { ReportContent } from "./Reports";
import { MasterContent } from "./Masters";
import { Navigator } from "./navigator/Navigator";
import {SubscriptionPage} from '../components/admin/subscription_module/SubscriptionPage';
import { AppGuide } from "./AppGuide";
import { HelpSupportPage } from "../components/admin/help_support/HelpSupportPage";
import { NotificationsPage } from "../notifications/NotificationsPage";
import { RequireAccess } from "../components/RequireAccess";
import { getAppModuleDefinitions } from "../data/getAppModules";
import { getMasterRoutes } from "../data/getMasterModules";
// App-provided routes and dashboard content, plugged in via the registry.
import {
  getAppRoutes,
  getAppRoutesWithoutSidebar,
  getDashboardContent,
} from "../data/appRouteRegistry";

const AdminDashboard = () => {
  // The same definitions the navigator gates its cards on, so a URL typed by
  // hand is judged exactly as the card would be.
  const moduleById = Object.fromEntries(getAppModuleDefinitions().map((definition) => [definition.id, definition]));
  const appRoutes = getAppRoutes();
  const appRoutesWithoutSidebar = getAppRoutesWithoutSidebar();
  const DashboardContent = getDashboardContent();
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {/* Base startup routes */}
        {/* TODO: Show first route based on user permission */}
        <Route index element={<Navigator />} />
        <Route path="navigator" element={<Navigator />} />
        <Route path="dashboards" element={DashboardContent ? <DashboardContent /> : null} />
        <Route path="dashboard/*" element={DashboardContent ? <DashboardContent /> : null} />
        <Route
          path="reports"
          element={<RequireAccess definition={moduleById.reportsListing}><ReportContent /></RequireAccess>}
        />
        <Route
          path="report/*"
          element={<RequireAccess definition={moduleById.reportsListing}><ReportContent /></RequireAccess>}
        />

        <Route
          path="masters"
          element={<RequireAccess definition={moduleById.mastersListing}><MasterContent /></RequireAccess>}
        />
        <Route
          path="master/users"
          element={<RequireAccess definition={moduleById.userManagement}><UserManagement /></RequireAccess>}
        />
        <Route
          path="master/*"
          element={<RequireAccess definition={moduleById.mastersListing}><MasterContent /></RequireAccess>}
        />
        {/* Every master that brings its page, the app's included — gated on its definition. */}
        {getMasterRoutes().map(({ path, definition, component: Page }) => (
          <Route key={path} path={path} element={<RequireAccess definition={definition}><Page /></RequireAccess>} />
        ))}
        
        <Route
          path="users"
          element={<RequireAccess definition={moduleById.userManagement}><UserManagement /></RequireAccess>}
        />
        <Route
          path="company"
          element={<RequireAccess definition={moduleById.companySettings}><CompanySettings /></RequireAccess>}
        />
        <Route
          path="role-permissions"
          element={<RequireAccess definition={moduleById.rolesPermissions}><RolePermissionsManagement /></RequireAccess>}
        />
        <Route
          path="multi-company-setup"
          element={<RequireAccess definition={moduleById.multiCompanySetup}><MultiCompanyModule /></RequireAccess>}
        />
        <Route
          path="switch-company"
          element={<RequireAccess definition={moduleById.companySwitcher}><CompanySwitcher /></RequireAccess>}
        />
        <Route
          path="subscription"
          element={<RequireAccess definition={moduleById.subscription}><SubscriptionPage /></RequireAccess>}
        />
        <Route path="app-guide" element={<AppGuide />} />
        <Route path="help-support" element={<HelpSupportPage />} />
        <Route path="notifications" element={<NotificationsPage />} />

        {/* Add APP extra routes */}
        {appRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
        {/* Add APP extra routes without sidebar */}
      </Route>
      {appRoutesWithoutSidebar.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
};

export { AdminDashboard };
