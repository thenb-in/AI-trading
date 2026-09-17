import { useState } from "react";
import { LogOut } from "lucide-react";
import PropTypes from 'prop-types';
import { ConfirmModal } from "@startup/components/base_components/master";
import { useDataContext } from "@context/useDataContext";
import { runAppLogoutHandlers } from "@startup/data/authHandlerRegistry";

function LogoutButton({ collapsed }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { logout } = useDataContext();

  const closeConfirm = () => setShowConfirm(false);

  const confirmLogout = async () => {
    setShowConfirm(false);
    try {
      runAppLogoutHandlers();
      await logout();
    } catch {
      // AuthContext.logout handles navigation and SSO end_session redirect
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={`w-full flex items-center rounded-lg hover:bg-red-100 text-red-500 transition-colors font-bold ${collapsed ? 'p-2 justify-center' : 'py-3 justify-start'}`}
      >
        <LogOut className="w-5 h-5 flex-shrink-0" size={20} />
        {!collapsed && <span className="ml-2">Logout</span>}
      </button>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={closeConfirm}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        tone="danger"
      />
    </>
  );
}

LogoutButton.propTypes = {
  collapsed: PropTypes.bool.isRequired
};

export { LogoutButton };
