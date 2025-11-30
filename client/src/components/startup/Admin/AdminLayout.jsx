import { useState, useEffect } from "react";
import { AppSideBar } from "../../AppSideBar";
import { Outlet } from "react-router-dom";
import { useDataContext } from "../../../context/startup/useDataContext";
import { useDebugMode } from "../../../hooks/useDebugMode";


export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(true);
  const { hamburgerMenu } = useDataContext();
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  // Responsive handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Initialize global debug mode to ensure Alt+D keyboard handler is always active
  useDebugMode();

  const renderOutlet = () => (
    <div className="min-h-screen bg-gray-50 overflow-x-auto">
      <div className="max-w-full">
        <Outlet />
      </div>
    </div>
  );

  const renderSidebar = () => (
    <AppSideBar
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      isMobileView={isMobileView}
    />
  );

  if (isMobileView) {
    return (
      <>
        {hamburgerMenu ? renderSidebar() : renderOutlet()}
      </>
    );
  }

  // Desktop View
  return (
    <>
      <div className="flex overflow-x-hidden">
        {renderSidebar()}
        <div
          className={`flex-1 transition-all duration-300 overflow-x-auto ${
            collapsed ? "ml-14" : "ml-64"
          } min-h-screen bg-gray-50`}
        >
          <div className="max-w-full">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}
