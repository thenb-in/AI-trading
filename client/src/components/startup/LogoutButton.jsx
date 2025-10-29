import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import PropTypes from 'prop-types';
import ApiService from "../../services/startup/ApiService";
import { isDebugMode, subscribeToDebugMode } from "../../services/debugModeService";

function LogoutButton({ collapsed }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  
  // Use debug mode service instead of local session storage management
  const [isDebugModeState, setIsDebugModeState] = useState(() => isDebugMode());

  // Subscribe to debug mode changes
  useEffect(() => {
    const unsubscribe = subscribeToDebugMode((newValue) => {
      setIsDebugModeState(newValue);
    });

    return unsubscribe;
  }, []);

  const confirmLogout = async () => {
    try {
      await ApiService.logout();
      navigate("/");
    } catch {
      // Handle logout error silently
    } finally {
      setShowConfirm(false);
    }
  };

  return (
    <>
      {/* Debug Mode Indicator */}
      {isDebugModeState && (
        <div className={`${collapsed ? "p-2" : "p-3"} border-b border-gray-600`}>
          <div className={`flex items-center justify-center ${collapsed ? "text-xs" : "text-sm"} text-yellow-400 font-bold`}>
            {!collapsed && <span className="mr-1">DEBUG</span>}
            <span className="bg-yellow-400 text-gray-800 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
              D
            </span>
          </div>
        </div>
      )}
      
      <button
        onClick={() => setShowConfirm(true)}
        className={`w-full flex items-center justify-center rounded-lg hover:bg-red-100 text-red-500 transition-colors font-bold ${collapsed ? 'p-2' : 'p-3'}`}
      >
        <LogOut className="w-5 h-5 flex-shrink-0" size={20} />
        {!collapsed && <span className="ml-2">Logout</span>}
      </button>

      {showConfirm &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
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

export default LogoutButton;
