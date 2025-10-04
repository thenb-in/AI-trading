import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { Outlet } from "react-router-dom";
import { useDataContext } from "../../../context/startup/useDataContext";
import AccessDenied from "../AccessDenied";

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(true);
  const { userData, hamburgerMenu } = useDataContext();
  const [isMobileView] = useState(window.innerWidth < 768);

  const requiredPermission = "View AdminLayout";
  const hasPermission = userData?.role?.permissions?.some(
    (permission) => permission.name === requiredPermission
  );

  if (!userData || !hasPermission) {
    return <AccessDenied requiredPermission={requiredPermission} />;
  }


  const renderOutlet = () => (
    <div className="min-h-screen bg-gray-50" style={{ overflowX: "auto" }}>
      <div className="max-w-full">
        <Outlet />
      </div>
    </div>
  );

  const renderSidebar = () => (
    <AdminSidebar
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      isMobileView={isMobileView}
    />
  );

  if (isMobileView) {
    return hamburgerMenu ? renderSidebar() : renderOutlet();
  }

  // Desktop View
  return (
    <div className="flex overflow-x-hidden">
      {renderSidebar()}
      <div
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "ml-20" : "ml-64"
        } min-h-screen bg-gray-50`}
        style={{ overflowX: "auto" }}
      >
        <div className="max-w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
