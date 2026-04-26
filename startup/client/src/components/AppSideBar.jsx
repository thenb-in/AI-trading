import { AdminSidebar } from "./admin/AdminSidebar";
import { useAppMenuItems } from "./useAppMenuItems"; //app-specific menu items
import PropTypes from "prop-types";

function AppSideBar({ collapsed, setCollapsed, isMobileView }) {
  const appMenuItems = useAppMenuItems();
  
  return (
    <AdminSidebar
      collapsed={collapsed}
      setCollapsed={setCollapsed} 
      isMobileView={isMobileView}
      menuItems={appMenuItems}
    />
  );
}

AppSideBar.propTypes = {
  collapsed: PropTypes.bool.isRequired,
  setCollapsed: PropTypes.func.isRequired,
  isMobileView: PropTypes.bool.isRequired,
};

export { AppSideBar };
