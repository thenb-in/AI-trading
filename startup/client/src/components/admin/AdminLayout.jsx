import { useState, useEffect } from "react";
import { AppSideBar } from "../AppSideBar";
import { Outlet } from "react-router-dom";
import { useDebugMode } from "@/hooks/useDebugMode";
import { useHelpSupportShortcut } from "@/hooks/useHelpSupportShortcut";
import { AppLayout } from "@app/components/app_layout/AppLayout";


function AdminLayout() {
  const [collapsed, setCollapsed] = useState(true);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  // Responsive handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Expose sidebar width for modals (MasterModal) so they size/position to the right of sidebar
  useEffect(() => {
    const width = collapsed ? '3.5rem' : isMobileView ? '12rem' : '16rem';
    document.documentElement.style.setProperty('--app-sidebar-width', width);
    return () => document.documentElement.style.removeProperty('--app-sidebar-width');
  }, [collapsed, isMobileView]);
  
  // Initialize global debug mode to ensure Alt+D keyboard handler is always active
  useDebugMode();
  useHelpSupportShortcut();

  const renderSidebar = () => (
    <AppSideBar
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      isMobileView={isMobileView}
    />
  );

  return (
    <div className="flex overflow-x-hidden">
      {renderSidebar()}
      <div
        className={`flex-1 transition-all duration-300 overflow-x-auto ${
          collapsed ? "ml-14" : isMobileView ? "ml-48" : "ml-64"
        } min-h-screen bg-gray-50`}
      >
        <div className="max-w-full">
          <Outlet />
        </div>
      </div>
      <AppLayout />
    </div>
  );
}

export { AdminLayout };