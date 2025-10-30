import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../../components/startup/Admin/AdminLayout";
import UserManagement from "../../components/startup/Admin/UserManagement/UserManagement";
import CompanySettings from "../../components/startup/Admin/CompanySettings";
import { 
  RolePermissionsManagement, 
  CreateRoleForm, 
  CreatePermissionForm 
} from "../../components/startup/Admin/RoleAndPermissions";
import MultiCompanyModule from "../../components/startup/Admin/MultiCompanyModule/MultiCompanyModule";
// Import extra App routes
import appRoutes from "../AppDashboard";
import ReportContent from "./Reports";
import MasterContent from "./Masters";


const AdminDashboard = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {/* Base startup routes */}
        <Route index element={<Navigate to="users" replace />} />
        <Route path="reports" element={<ReportContent />} />
        {/* <Route path="report/*" element={<ReportContent />} /> */}

        <Route path="masters" element={<MasterContent />} />
        <Route path="master/*" element={<MasterContent />} />
        
        <Route path="users" element={<UserManagement />} />
        <Route path="company" element={<CompanySettings />} />
        <Route path="role-permissions" element={<RolePermissionsManagement />} />
        <Route path="create-role" element={<CreateRoleForm />} />
        <Route path="create-permission" element={<CreatePermissionForm />} />
        <Route path="multi-company-setup" element={<MultiCompanyModule />} />


        {/* Add APP extra routes */}
        {appRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Route>
    </Routes>
  );
};

export default AdminDashboard;
