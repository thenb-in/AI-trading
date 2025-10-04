import {
  User,
  Building,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDataContext } from "../../../context/startup/useDataContext";
import LogoutButton from "../LogoutButton";
import PropTypes from "prop-types";

export default function AdminSidebar({
  collapsed,
  setCollapsed,
  isMobileView,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, setHamburgerMenu, hamburgerMenu } = useDataContext();

   const requiredPermission = "has_role_permission";
  const hasPermission = userData?.role?.permissions?.some(
    (permission) => permission.name === requiredPermission
  );

  const menuItems = [
    { id: "users", label: "User Management", icon: User, path: "/admin/users" },
    {
      id: "company",
      label: "Company Settings",
      icon: Building,
      path: "/admin/company",
    },
   hasPermission && {
      id: "rolesAndPermissions",
      label: "Roles & Permissions",
      icon: Shield,
      path: "/admin/role-permissions",
    },
  ].filter(Boolean);

  const handleNavigation = (item) => {
    if (isMobileView) {
      setHamburgerMenu(false);
    }
    navigate(item.path);
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <>
      <div
        className={`bg-gray-800 text-white h-screen fixed top-0 left-0 flex flex-col transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          {!collapsed && <h1 className="text-xl font-bold">Admin</h1>}
          <button
            onClick={() =>
              isMobileView
                ? setHamburgerMenu(!hamburgerMenu)
                : setCollapsed(!collapsed)
            }
            className="p-1 text-gray-400 hover:text-white"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigation(item)}
                  className={`w-full flex items-center p-2 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-700"
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          {!collapsed && (
            <div className="mb-4 text-sm text-gray-300">
              <div>
                <strong>Name:</strong> {userData?.name}
              </div>
              <div>
                <strong>Company:</strong> {userData?.company?.name}
              </div>
              <div>
                <strong>Role:</strong> {userData?.role?.name}
              </div>
            </div>
          )}
          <LogoutButton collapsed={collapsed} />
        </div>
      </div>
    </>
  );
}

AdminSidebar.propTypes = {
  collapsed: PropTypes.bool.isRequired,
  setCollapsed: PropTypes.func.isRequired,
  isMobileView: PropTypes.bool.isRequired,
};