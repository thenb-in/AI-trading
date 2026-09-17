import { useState, useEffect } from "react";
import { AppSideBar } from "../AppSideBar";
import { Outlet } from "react-router-dom";
import { useDebugMode } from "@/hooks/useDebugMode";
import { useHelpSupportShortcut } from "@/hooks/useHelpSupportShortcut";
import { useClearCacheShortcut } from "@/hooks/useClearCacheShortcut";
import { getAppLayout } from "@data/appLayoutRegistry";
import { NotificationProvider } from "../../notifications/NotificationProvider";
import { AnnouncementBanner } from "../announcements/AnnouncementBanner";
import { ToastProvider } from "../toast";


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

  // Expose sidebar width for modals (BaseModal) so they size/position to the right of sidebar
  useEffect(() => {
    const width = collapsed ? '3.5rem' : isMobileView ? '12rem' : '16rem';
    document.documentElement.style.setProperty('--app-sidebar-width', width);
    return () => document.documentElement.style.removeProperty('--app-sidebar-width');
  }, [collapsed, isMobileView]);
  
  // Initialize global debug mode to ensure Alt+D keyboard handler is always active
  useDebugMode();
  useHelpSupportShortcut();
  useClearCacheShortcut();

  const AppLayout = getAppLayout();

  const renderSidebar = () => (
    <AppSideBar
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      isMobileView={isMobileView}
    />
  );

  return (
    <ToastProvider>
      <NotificationProvider>
        <div className="flex overflow-x-hidden">
          {renderSidebar()}
          <div
            className={`flex-1 transition-all duration-300 overflow-x-hidden ${
              collapsed ? "ml-14" : isMobileView ? "ml-48" : "ml-64"
            } min-h-screen bg-gray-50`}
          >
            <div className="max-w-full">
              {/* Above the page, not over it: an announcement is read once and
                  dismissed, and must never sit on top of what someone is doing. */}
              <AnnouncementBanner />
              <Outlet />
            </div>
          </div>
          {AppLayout && <AppLayout />}
        </div>
      </NotificationProvider>
    </ToastProvider>
  );
}

export { AdminLayout };