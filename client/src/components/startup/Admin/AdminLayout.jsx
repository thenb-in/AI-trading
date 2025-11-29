import { useState } from "react";
import { AppSideBar } from "../../AppSideBar";
import { Outlet } from "react-router-dom";
import { useDataContext } from "../../../context/startup/useDataContext";
import { useDebugMode } from "../../../hooks/useDebugMode";
import { ToastContainer } from "react-toastify";


export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(true);
  const { hamburgerMenu } = useDataContext();
  const [isMobileView] = useState(window.innerWidth < 768);
  
  // Initialize global debug mode to ensure Alt+D keyboard handler is always active
  const debugMode = useDebugMode();
  console.log('[ADMIN LAYOUT] Debug mode initialized:', debugMode);

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
        <ToastContainer 
          position="top-right" 
          autoClose={3000} 
          hideProgressBar={false} 
          newestOnTop={false} 
          closeOnClick 
          pauseOnFocusLoss 
          draggable 
          pauseOnHover
        />
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
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false} 
        newestOnTop={false} 
        closeOnClick 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover
      />
    </>
  );
}
