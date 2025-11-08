import {
  BarChart3,
  Layers,
  LayoutDashboard,
} from "lucide-react";
import {
  People as PeopleIcon,
  Calculate as CalculateIcon,
  AccessTime as TimeIcon,
  Business as BusinessIcon,
  BeachAccess as LeaveIcon,
  Category as CategoryIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  SupervisorAccount as ManagementIcon,
  Build as CommonMastersIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useDataContext } from "../context/startup/useDataContext";
import { useMemo, useState, useRef } from "react";
import getMasterModules from "../data/getMasterModules";

// Hook to get App-specific menu items
export function useAppMenuItems() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useDataContext();

  const hasPermission = (requiredPermission) => {
    return userData?.role?.permissions?.some(
      (permission) => permission.name === requiredPermission
    );
  };

  const masterModules = useMemo(() => getMasterModules(() => {}), []);

  const categories = useMemo(() => {
    const categoryCounts = {};
    masterModules.forEach((module) => {
      const category = module.category || "Uncategorized";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const categoryOrder = ["Common Masters", "Management", "Raw Data", "Setup"];

    const orderedCategories = categoryOrder
      .filter((category) => categoryCounts[category])
      .map((name) => ({ name, count: categoryCounts[name] }));

    const remainingCategories = Object.entries(categoryCounts)
      .filter(([name]) => !categoryOrder.includes(name))
      .map(([name, count]) => ({ name, count }));

    return [...orderedCategories, ...remainingCategories];
  }, [masterModules]);

  const [showMasterFlyout, setShowMasterFlyout] = useState(false);
  const flyoutHideTimeoutRef = useRef(null);

  const openFlyout = () => {
    if (flyoutHideTimeoutRef.current) {
      clearTimeout(flyoutHideTimeoutRef.current);
      flyoutHideTimeoutRef.current = null;
    }
    setShowMasterFlyout(true);
  };

  const scheduleCloseFlyout = () => {
    if (flyoutHideTimeoutRef.current) {
      clearTimeout(flyoutHideTimeoutRef.current);
    }
    flyoutHideTimeoutRef.current = setTimeout(() => {
      setShowMasterFlyout(false);
      flyoutHideTimeoutRef.current = null;
    }, 150);
  };

  const closeFlyoutImmediate = () => {
    if (flyoutHideTimeoutRef.current) {
      clearTimeout(flyoutHideTimeoutRef.current);
      flyoutHideTimeoutRef.current = null;
    }
    setShowMasterFlyout(false);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Employee Management":
        return <PeopleIcon className="h-4 w-4" />;
      case "Payroll & Calculations":
        return <CalculateIcon className="h-4 w-4" />;
      case "Attendance & Time":
        return <TimeIcon className="h-4 w-4" />;
      case "Organization Structure":
        return <BusinessIcon className="h-4 w-4" />;
      case "Leave Management":
        return <LeaveIcon className="h-4 w-4" />;
      case "Setup":
        return <SettingsIcon className="h-4 w-4" />;
      case "Raw Data":
        return <StorageIcon className="h-4 w-4" />;
      case "Management":
        return <ManagementIcon className="h-4 w-4" />;
      case "Common Masters":
        return <CommonMastersIcon className="h-4 w-4" />;
      default:
        return <CategoryIcon className="h-4 w-4" />;
    }
  };

  const searchParams = new URLSearchParams(location.search);
  const isMasterPage = location.pathname.startsWith("/admin/master");
  const activeCategory = searchParams.get("category") || (isMasterPage ? "Common Masters" : null);

  // Master Categories Submenu Component
  const MasterSubmenu = () => (
    <ul className="mt-1 ml-8 space-y-1">
      {categories.map((category) => {
        const path = `/admin/master?category=${encodeURIComponent(category.name)}`;
        const isCatActive = activeCategory === category.name;
        return (
          <li key={category.name}>
            <button
              onClick={() => navigate(path)}
              className={`w-full flex items-center p-2 rounded-md text-sm transition-colors ${
                isCatActive ? "bg-blue-500/70 text-white" : "hover:bg-gray-700 text-gray-200"
              }`}
              title={`${category.name} (${category.count})`}
            >
              <span className="mr-2">{getCategoryIcon(category.name)}</span>
              <span className="flex-1 truncate">{category.name}</span>
              <span className={`ml-2 text-xs rounded-full px-2 py-0.5 ${isCatActive ? "bg-blue-600" : "bg-gray-700"}`}>
                {category.count}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  // Master Categories Flyout Component
  const MasterFlyout = () => (
    showMasterFlyout && (
      <div
        className="absolute left-full top-0 ml-2 w-64 bg-gray-800 text-white rounded-lg shadow-lg border border-gray-700 z-[2147483647] p-2 pointer-events-auto"
        onMouseEnter={openFlyout}
        onMouseLeave={scheduleCloseFlyout}
      >
        <ul className="space-y-1 max-h-[70vh] overflow-auto pr-1">
          {categories.map((category) => {
            const path = `/admin/master?category=${encodeURIComponent(category.name)}`;
            const isCatActive = activeCategory === category.name;
            return (
              <li key={category.name}>
                <button
                  onClick={() => {
                    navigate(path);
                    closeFlyoutImmediate();
                  }}
                  className={`w-full flex items-center p-2 rounded-md text-sm transition-colors ${
                    isCatActive ? "bg-blue-500/70 text-white" : "hover:bg-gray-700 text-gray-200"
                  }`}
                  title={`${category.name} (${category.count})`}
                >
                  <span className="mr-2">{getCategoryIcon(category.name)}</span>
                  <span className="flex-1 truncate">{category.name}</span>
                  <span className={`ml-2 text-xs rounded-full px-2 py-0.5 ${isCatActive ? "bg-blue-600" : "bg-gray-700"}`}>
                    {category.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    )
  );

  return [
    hasPermission("view_dashboard_module") && {
      id: "dashboard",
      label: "Dashboards",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
    },
    hasPermission("view_report_module") && {
      id: "report",
      label: "Reports",
      icon: BarChart3,
      path: "/admin/report",
    },
    hasPermission("view_master_module") && {
      id: "master",
      label: "Masters",
      icon: Layers,
      path: "/admin/master",
      hasSubmenu: true,
      submenu: <MasterSubmenu />,
      flyout: <MasterFlyout />,
      onMouseEnter: openFlyout,
      onMouseLeave: scheduleCloseFlyout,
    },
  ].filter(Boolean);
}