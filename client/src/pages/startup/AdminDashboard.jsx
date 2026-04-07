import { Routes, Route } from "react-router-dom";
import { AdminLayout } from "../../components/startup/admin/AdminLayout";
import { UserManagement } from "../../components/startup/admin/user_management/UserManagement";
import { CompanySettings } from "../../components/startup/admin/CompanySettings";
import { RolePermissionsManagement } from "../../components/startup/admin/role_permissions";
import { MultiCompanyModule } from "../../components/startup/admin/multi_company_module/MultiCompanyModule";
// Import extra App routes
import { appRoutes } from "../AppDashboard";
import { ReportContent } from "./Reports";
import { MasterContent } from "./Masters";
import { DashboardContent } from "./Dashboards";
import { ActivityMaster } from "../../components/masters/startup/activity_master/ActivityMaster";
import { NBnextDriveMaster } from "../../components/masters/startup/nbnext_drive_master/NBnextDriveMaster";
import { Navigator } from "../navigator/Navigator";

const AdminDashboard = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {/* Base startup routes */}
         <Route index element={<Navigator />} />
        <Route path="navigator" element={<Navigator />} />
        <Route path="dashboards" element={<DashboardContent />} />
        <Route path="dashboard/*" element={<DashboardContent />} />
        <Route path="reports" element={<ReportContent />} />
        <Route path="report/*" element={<ReportContent />} />

        <Route path="masters" element={<MasterContent />} />
        <Route path="master/*" element={<MasterContent />} />
        <Route path="master/activity" element={<ActivityMaster />} />
        <Route path="master/nbnext-drive" element={<NBnextDriveMaster />} />
        
        <Route path="users" element={<UserManagement />} />
        <Route path="company" element={<CompanySettings />} />
        <Route path="role-permissions" element={<RolePermissionsManagement />} />
        <Route path="multi-company-setup" element={<MultiCompanyModule />} />


        {/* Add APP extra routes */}
        {appRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Route>
    </Routes>
  );
};

export { AdminDashboard };
