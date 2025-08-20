import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../components/Admin/AdminLayout";
import UserManagement from "../components/Admin/UserManagement/UserManagement";


const AdminDashboard = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="chat" replace />} />
        <Route path="users" element={<UserManagement />} />
      </Route>
    </Routes>
  );
};

export default AdminDashboard;
