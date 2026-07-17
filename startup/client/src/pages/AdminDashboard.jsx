import { Routes, Route } from "react-router-dom";
import { AdminLayout } from "../components/admin/AdminLayout";
import { UserManagement } from "../components/admin/user_management/UserManagement";
import { CompanySettings } from "../components/admin/company_setting/CompanySettings";
import { RolePermissionsManagement } from "../components/admin/role_permissions";
import { MultiCompanyModule } from "../components/admin/multi_company_module/MultiCompanyModule";
// Import extra App routes
import { appRoutes } from "./AppDashboard";
import { ReportContent } from "./Reports";
import { MasterContent } from "./Masters";
import { Navigator } from "./navigator/Navigator";
import {SubscriptionPage} from '../components/admin/subscription_module/SubscriptionPage';
import { ActivityMaster } from "../components/masters/activity_master/ActivityMaster";
import { NBnextDriveMaster } from "../components/masters/nbnext_drive_master/NBnextDriveMaster";
import { AppGuide } from "./AppGuide";
import { appRoutesWithoutSidebar } from "./AppDashboardWithoutSidebar";
import { HelpSupportPage } from "../components/admin/help_support/HelpSupportPage";
import { NotificationsPage } from "../notifications/NotificationsPage";

const AdminDashboard = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {/* Base startup routes */}
        {/* TODO: Show first route based on user permission */}
        <Route index element={<Navigator />} />
        <Route path="navigator" element={<Navigator />} />
        {/* A dashboard is always app-specific — there is no generic dashboard
            structure in the framework. Apps register their own landing page
            (and its `dashboards` / `dashboard/*` routes) via `appRoutes` in
            AppDashboard.jsx, which are rendered inside this same AdminLayout
            below. */}
        <Route path="reports" element={<ReportContent />} />
        <Route path="report/*" element={<ReportContent />} />

        <Route path="masters" element={<MasterContent />} />
        <Route path="master/users" element={<UserManagement />} />
        <Route path="master/*" element={<MasterContent />} />
        <Route path="master/activity" element={<ActivityMaster />} />
        <Route path="master/nbnext-drive" element={<NBnextDriveMaster />} />
        
        <Route path="users" element={<UserManagement />} />
        <Route path="company" element={<CompanySettings />} />
        <Route path="role-permissions" element={<RolePermissionsManagement />} />
        <Route path="multi-company-setup" element={<MultiCompanyModule />} />
        <Route path="subscription" element={<SubscriptionPage/>}/>
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
