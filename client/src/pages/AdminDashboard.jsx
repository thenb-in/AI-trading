import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../components/Admin/AdminLayout";
import UserManagement from "../components/Admin/UserManagement/UserManagement";
import CompanySettings from "../components/Admin/CompanySettings";
import { 
  RolePermissionsManagement, 
  CreateRoleForm, 
  CreatePermissionForm 
} from "../components/Admin/RoleAndPermissions";

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
      </Route>
    </Routes>
  );
};

export default AdminDashboard;
