import { useState } from "react";
import ReactDOM from "react-dom";
import { LogOut } from "lucide-react";
import PropTypes from 'prop-types';
import { useDataContext } from "@context/useDataContext";
import { useOnLogout } from "@app/hooks/useOnLogout";

function LogoutButton({ collapsed }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { logout } = useDataContext();
  const onLogout = useOnLogout();

  const confirmLogout = async () => {
    setShowConfirm(false);
    try {
      onLogout();
      await logout();
    } catch {
      // AuthContext.logout handles navigation and SSO end_session redirect
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={`w-full flex items-center justify-center rounded-lg hover:bg-red-100 text-red-500 transition-colors font-bold ${collapsed ? 'p-2' : 'p-3'}`}
      >
        <LogOut className="w-5 h-5 flex-shrink-0" size={20} />
        {!collapsed && <span className="ml-2">Logout</span>}
      </button>

      {showConfirm &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 shadow-xl text-gray-800 w-80 relative z-[10000]">
              <h2 className="text-lg font-semibold mb-4">Confirm Logout</h2>
              <p className="mb-6">Are you sure you want to log out?</p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

LogoutButton.propTypes = {
  collapsed: PropTypes.bool.isRequired
};

export { LogoutButton };
