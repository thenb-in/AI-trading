import {
  User,
  Building,
  ChevronLeft,
  ChevronRight,
  Shield,
  CopySlash,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDataContext, hasPermission } from "@context/startup/useDataContext";
import { LogoutButton } from "../LogoutButton";
import PropTypes from "prop-types";
import { STORAGE_KEYS } from "@/constants/startup/index";


function AdminSidebar({
  collapsed,
  setCollapsed,
  isMobileView,
  additionalMenuItems = [], // Accept additional menu items from app
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useDataContext();

  const dataContext = useDataContext();
  // Base menu items
  const baseMenuItems = [
    hasPermission("view_user_module", dataContext) && {
      id: "users",
      label: "User Management",
      icon: User,
      path: "/admin/users",
    },
    hasPermission("view_company_settings", dataContext) && {
      id: "company",
      label: "Company Settings",
      icon: Building,
      path: "/admin/company",
    },
    hasPermission("view_role_permission_module", dataContext) && {
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
    if (item.onClick) {
      item.onClick(item);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const isActive = (path) => {
    if (!path) return false;
    return location.pathname.startsWith(path);
  };


  const handleToggleClick = () => {
    setCollapsed(!collapsed);
  };

  const handleItemClick = (item) => () => {
    handleNavigation(item);
  };

  return (
    <div
        className={`
          bg-gray-800 text-white fixed top-0 left-0 flex flex-col z-[99999] sidebar-container
          ${isMobileView
            ? (collapsed ? "w-14" : "w-48") + " h-screen shadow-lg"
            : (collapsed ? "w-14" : "w-64") + " h-screen"}
          ${isMobileView ? "translate-x-0" : "translate-x-0"}
        `}
        role="navigation"
      >
        {/* Top Header */}
        <div
          className={`${
            collapsed ? "p-2" : "p-4"
          } border-b border-gray-700 flex justify-between items-center flex-shrink-0`}
        >
          {!collapsed && (
            <h1 className="text-xl font-bold flex items-center gap-2 text-white">
              <Shield className="w-6 h-6 text-blue-500" />
              <span className="hover:text-blue-600 transition-colors">
                {import.meta.env.VITE_APP_NAME_CLIENT}
              </span>
            </h1>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleClick}
              className="p-2 text-gray-400 hover:text-white rounded-md hover:bg-gray-700"
              title={collapsed ? "Expand" : "Collapse"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation - Scrollable Section */}
        <div className={`flex-1 min-h-0 ${collapsed ? "px-2 py-2" : "px-3 py-3"}`}>
          <div className="h-full overflow-y-auto custom-scrollbar pr-1">
            <nav>
              <ul className="space-y-2">
                {menuItems.length === 0 && (
                  <li className="text-sm text-gray-400 p-2">No menu items available</li>
                )}
                {menuItems.map((item) => (
                  <li
                    key={item.id}
                    className="relative"
                    onMouseEnter={item.onMouseEnter}
                    onMouseLeave={item.onMouseLeave}
                  >
                    <button
                      ref={item.buttonRef || null}
                      onClick={handleItemClick(item)}
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
                      <span
                        className={`ml-3 truncate transition-all duration-300 sidebar-label-transition
                          ${collapsed ? 'opacity-0 -translate-x-3 pointer-events-none hidden' : 'opacity-100 translate-x-0 pointer-events-auto inline'}`}
                      >
                        {item.label}
                      </span>
                    </button>

                    {/* Render submenu if provided */}
                    {item.submenu && !collapsed && <>{item.submenu}</>}

                    {/* Render flyout if provided */}
                    {item.flyout && collapsed && <>{item.flyout}</>}
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Footer - Fixed at Bottom */}
        <div className={`${collapsed ? "p-2" : "p-4"} border-t border-gray-700 flex-shrink-0`}>
          {!collapsed && (
            <div className="mb-4 text-sm text-gray-300">
              <div className="truncate">
                <strong>Name:</strong> {userData?.name}
              </div>
              <div className="truncate">
                <strong>Company:</strong>{" "}
                {typeof window !== "undefined"
                  ? localStorage.getItem(STORAGE_KEYS.ACTIVE_COMPANY_NAME) ||
                    userData?.company?.name ||
                    "-"
                  : userData?.company?.name || "-"}
              </div>
              <div className="truncate">
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
      buttonRef: PropTypes.object,
    })
  ),
};

export { AdminSidebar };
