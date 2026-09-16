import { useNavigate, useLocation } from "react-router-dom";
import { useDataContext } from "@context/useDataContext";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { getMasterCategoriesForUser } from "../data/getMasterModules";
import { getAppModuleDefinitions } from "../data/getAppModules";
import { canSeeModule } from "../data/canSeeModule";
import { MasterCategoryIcon } from "./base_components/master/MasterCategoryIcon";

// Hook to get App-specific menu items (single source: getAppModuleDefinitions)
function useAppMenuItems() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useDataContext();

  const categories = useMemo(() => getMasterCategoriesForUser(userData), [userData]);

  const [showMasterFlyout, setShowMasterFlyout] = useState(false);
  const [showMasterSubmenu, setShowMasterSubmenu] = useState(false);
  const [flyoutPosition, setFlyoutPosition] = useState({ top: 0, left: 0 });
  const flyoutHideTimeoutRef = useRef(null);
  const masterButtonRef = useRef(null);

  const toggleMasterSubmenu = () => setShowMasterSubmenu((prev) => !prev);

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

  const searchParams = new URLSearchParams(location.search);
  const activeCategory = searchParams.get("category") || null;

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
                title={category.count != null ? `${category.name} (${category.count})` : category.name}
              >
                <span className="mr-2"><MasterCategoryIcon name={category.name} /></span>
                <span className="flex-1 truncate">{category.name}</span>
                {category.count != null && category.count > 0 && (
                  <span className={`ml-2 text-xs rounded-full px-2 py-0.5 ${isCatActive ? "bg-blue-600" : "bg-gray-700"}`}>
                    {category.count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const MasterFlyout = () => {
    const flyoutRef = useRef(null);

    useEffect(() => {
      if (flyoutRef.current && showMasterFlyout) {
        flyoutRef.current.style.top = `${flyoutPosition.top}px`;
        flyoutRef.current.style.left = `${flyoutPosition.left}px`;
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reposition when flyout opens or position updates
    }, [showMasterFlyout, flyoutPosition]);

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
                  title={category.count != null ? `${category.name} (${category.count})` : category.name}
                >
                  <span className="mr-2"><MasterCategoryIcon name={category.name} /></span>
                  <span className="flex-1 truncate">{category.name}</span>
                  {category.count != null && category.count > 0 && (
                    <span className={`ml-2 text-xs rounded-full px-2 py-0.5 ${isCatActive ? "bg-blue-600" : "bg-gray-700"}`}>
                      {category.count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return getAppModuleDefinitions()
    .filter((def) => canSeeModule(def, userData))
    .map((def) => {
      const base = {
        id: def.id,
        label: def.title,
        icon: def.icon,
        order: def.order,
      };

      if (def.id === "mastersListing") {
        // todo: make flyout generic so other flyouts can be made with same boilerplate
        return {
          ...base,
          path: def.navigatePath,
          hasSubmenu: true,
          submenuOpen: showMasterSubmenu,
          onSubmenuToggle: toggleMasterSubmenu,
          submenu: <MasterSubmenu />,
          flyout: <MasterFlyout />,
          onMouseEnter: openFlyout,
          onMouseLeave: scheduleCloseFlyout,
          buttonRef: masterButtonRef,
        };
      }

      return {
        ...base,
        path: def.navigatePath,
      };
    });
}

export { useAppMenuItems };
