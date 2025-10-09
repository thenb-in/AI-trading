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

const AdminDashboard = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="company" element={<CompanySettings />} />
        <Route path="role-permissions" element={<RolePermissionsManagement />} />
        <Route path="create-role" element={<CreateRoleForm />} />
        <Route path="create-permission" element={<CreatePermissionForm />} />
        <Route path="multi-company-setup" element={<MultiCompanyModule />} />
      </Route>
    </Routes>
  );
};

export default AdminDashboard;
