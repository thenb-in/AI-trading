import {
  BarChart3,
  Layers,
  LayoutDashboard,
} from "lucide-react";
import {
  Category as CategoryIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  SupervisorAccount as ManagementIcon,
  Build as CommonMastersIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useDataContext, hasPermission } from "../context/startup/useDataContext";
import { useState, useRef, useEffect, useCallback } from "react";
import { getMasterCategories } from "../data/getMasterModules";

// Hook to get App-specific menu items
function useAppMenuItems() {
  const navigate = useNavigate();
  const location = useLocation();
  const dataContext = useDataContext();

  const categories = getMasterCategories();

  const [showMasterFlyout, setShowMasterFlyout] = useState(false);
  const [flyoutPosition, setFlyoutPosition] = useState({ top: 0, left: 0 });
  const flyoutHideTimeoutRef = useRef(null);
  const masterButtonRef = useRef(null);

  const updateFlyoutPosition = useCallback(() => {
    if (masterButtonRef.current) {
      const rect = masterButtonRef.current.getBoundingClientRect();
      setFlyoutPosition({
        top: rect.top,
        left: rect.right + 8
      });
    }
  }, []);

  useEffect(() => {
    if (showMasterFlyout) {
      updateFlyoutPosition();
      window.addEventListener('scroll', updateFlyoutPosition, true);
      window.addEventListener('resize', updateFlyoutPosition);
      return () => {
        window.removeEventListener('scroll', updateFlyoutPosition, true);
        window.removeEventListener('resize', updateFlyoutPosition);
      };
    }
  }, [showMasterFlyout, updateFlyoutPosition]);

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
  const MasterSubmenu = () => {
    const handleCategoryClick = (categoryName) => {
      const path = `/admin/master?category=${encodeURIComponent(categoryName)}`;
      navigate(path);
    };

    return (
      <ul className="mt-1 ml-8 space-y-1">
        {categories.map((category) => {
          const isCatActive = activeCategory === category.name;
          return (
            <li key={category.name}>
              <button
                onClick={() => handleCategoryClick(category.name)}
                className={`w-full flex items-center p-2 rounded-md text-sm transition-colors 
                  ${isCatActive ? "bg-blue-500/70 text-white" : "hover:bg-gray-700 text-gray-200"}`}
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
  };

  // Master Categories Flyout Component
  const MasterFlyout = () => {
    const flyoutRef = useRef(null);

    useEffect(() => {
      if (flyoutRef.current && showMasterFlyout) {
        flyoutRef.current.style.top = `${flyoutPosition.top}px`;
        flyoutRef.current.style.left = `${flyoutPosition.left}px`;
      }
    }, [flyoutPosition.top, flyoutPosition.left, showMasterFlyout]);

    const handleCategoryClick = (categoryName) => {
      const path = `/admin/master?category=${encodeURIComponent(categoryName)}`;
      navigate(path);
      closeFlyoutImmediate();
    };

    if (!showMasterFlyout) return null;

    return (
      <div
        ref={flyoutRef}
        className="flyout-positioned w-64 bg-gray-800 text-white rounded-lg shadow-lg border border-gray-700 z-[2147483647] p-2 pointer-events-auto"
        onMouseEnter={openFlyout}
        onMouseLeave={scheduleCloseFlyout}
      >
        <ul className="space-y-1 max-h-[70vh] overflow-auto flyout-custom-scrollbar pr-1">
          {categories.map((category) => {
            const isCatActive = activeCategory === category.name;
            return (
              <li key={category.name}>
                <button
                  onClick={() => handleCategoryClick(category.name)}
                  className={`w-full flex items-center p-2 rounded-md text-sm transition-colors ${isCatActive ? "bg-blue-500/70 text-white" : "hover:bg-gray-700 text-gray-200"
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
    );
  };

  return [
    hasPermission("view_dashboard_module", dataContext) && {
      id: "dashboard",
      label: "Dashboards",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
    },
    hasPermission("view_report_module", dataContext) && {
      id: "report",
      label: "Reports",
      icon: BarChart3,
      path: "/admin/report",
    },
    hasPermission("view_master_module", dataContext) && {
      id: "master",
      label: "Masters",
      icon: Layers,
      path: "/admin/master",
      hasSubmenu: true,
      submenu: <MasterSubmenu />,
      flyout: <MasterFlyout />,
      onMouseEnter: openFlyout,
      onMouseLeave: scheduleCloseFlyout,
      buttonRef: masterButtonRef,
    }
  ].filter(Boolean);
}

export { useAppMenuItems };