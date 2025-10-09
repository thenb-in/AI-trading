import AdminSidebar from "./startup/Admin/AdminSidebar";
import { useAppMenuItems } from "./useAppMenuItems"; //app-specific menu items
import PropTypes from "prop-types";

function AppSideBar({ collapsed, setCollapsed, isMobileView }) {
  const appMenuItems = useAppMenuItems();
  
  return (
    <AdminSidebar
      collapsed={collapsed}
      setCollapsed={setCollapsed} 
      isMobileView={isMobileView}
      additionalMenuItems={appMenuItems} // Inject app-specific items
    />
  );
}

AppSideBar.propTypes = {
  collapsed: PropTypes.bool.isRequired,
  setCollapsed: PropTypes.func.isRequired,
  isMobileView: PropTypes.bool.isRequired,
};

export default AppSideBar;