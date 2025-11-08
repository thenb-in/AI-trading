import {
  User,
  Building,
  ChevronLeft,
  ChevronRight,
  Shield,
  CopySlash,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDataContext } from "../../../context/startup/useDataContext";
import LogoutButton from "../LogoutButton";
import PropTypes from "prop-types";
import { STORAGE_KEYS } from "../../../constants/startup/index";


export default function AdminSidebar({
  collapsed,
  setCollapsed,
  isMobileView,
  additionalMenuItems = [], // Accept additional menu items from app
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, setHamburgerMenu, hamburgerMenu } = useDataContext();

  const hasPermission = (requiredPermission) => {
    return userData?.role?.permissions?.some(
      (permission) => permission.name === requiredPermission
    );
  };

  // Base menu items
  const baseMenuItems = [
    hasPermission("view_user_module") && {
      id: "users",
      label: "User Management",
      icon: User,
      path: "/admin/users",
    },
    hasPermission("view_company_module") && {
      id: "company",
      label: "Company Settings",
      icon: Building,
      path: "/admin/company",
    },
    hasPermission("view_role_permission_module") && {
      id: "rolesAndPermissions",
      label: "Roles & Permissions",
      icon: Shield,
      path: "/admin/role-permissions",
    },
    userData?.isSadmin && {
      id: "multiCompanySetup",
      label: "Multi-Company Setup",
      icon: CopySlash,
      path: "/admin/multi-company-setup",
    },
  ].filter(Boolean);

  // Combine: additional items first, then base items
  const menuItems = [...additionalMenuItems, ...baseMenuItems];

  const handleNavigation = (item) => {
    if (isMobileView) {
      setHamburgerMenu(false);
    }
    if (item.onClick) {
      item.onClick(item);
    } else {
      navigate(item.path);
    }
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div
      className={`bg-gray-800 text-white h-screen fixed top-0 left-0 flex flex-col transition-all duration-300 z-[99999] ${
        collapsed ? "w-14" : "w-64"
      }`}
    >
      {/* Top Header */}
      <div className={`${collapsed ? "p-2" : "p-4"} border-b border-gray-700 flex justify-between items-center`}>
     {!collapsed && (
      <h1 className="text-xl font-bold flex items-center gap-2 text-white">
        <Shield className="w-6 h-6 text-blue-500" />
        <span className="hover:text-blue-600 transition-colors">
          {import.meta.env.VITE_APP_NAME_CLIENT}
        </span>
      </h1>
    )}

        <button
          onClick={() =>
            isMobileView
              ? setHamburgerMenu(!hamburgerMenu)
              : setCollapsed(!collapsed)
          }
          className="p-2 text-gray-400 hover:text-white rounded-md hover:bg-gray-700"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${collapsed ? "p-2" : "p-3"}`}>
         <ul className="space-y-2">
          {menuItems.map((item) => (
            <li
              key={item.id}
              className={item.hasSubmenu ? "relative" : undefined}
              onMouseEnter={item.onMouseEnter}
              onMouseLeave={item.onMouseLeave}
            >
              <button
                onClick={() => handleNavigation(item)}
                title={item.label}
                aria-label={collapsed ? item.label : undefined}
                className={`w-full h-10 inline-flex items-center rounded-md px-2.5 text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-700"
                } ${collapsed ? "justify-center" : "justify-start"}`}
              >
                {item.icon && (
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                )}
                {!collapsed && <span className="ml-3 truncate">{item.label}</span>}
              </button>

              {/* Render submenu if provided */}
              {item.submenu && !collapsed && (
                < >{item.submenu}</>
              )}

              {/* Render flyout if provided */}
              {item.flyout && collapsed && (
                <>
                  {item.flyout}
                </>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className={`${collapsed ? "p-2" : "p-4"} border-t border-gray-700`}>
        {!collapsed && (
          <div className="mb-4 text-sm text-gray-300">
            <div>
              <strong>Name:</strong> {userData?.name}
            </div>
            <div>
              <strong>Company:</strong>{" "}
                {typeof window !== "undefined"
                  ? localStorage.getItem(STORAGE_KEYS.ACTIVE_COMPANY_NAME) ||
                    userData?.company?.name ||
                    "-"
                  : userData?.company?.name || "-"}

            </div>
            <div>
              <strong>Role:</strong> {userData?.role?.name}
            </div>
          </div>
        )}
        <LogoutButton collapsed={collapsed} />
      </div>
    </div>
  );
}

AdminSidebar.propTypes = {
  collapsed: PropTypes.bool.isRequired,
  setCollapsed: PropTypes.func.isRequired,
  isMobileView: PropTypes.bool.isRequired,
  additionalMenuItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType.isRequired,
      path: PropTypes.string.isRequired,
      hasSubmenu: PropTypes.bool,
      submenu: PropTypes.node,
      flyout: PropTypes.node,
      onClick: PropTypes.func,
      onMouseEnter: PropTypes.func,
      onMouseLeave: PropTypes.func,
    })
  ),
};