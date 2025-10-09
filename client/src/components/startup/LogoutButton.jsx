import { useState } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import PropTypes from 'prop-types';
import ApiService from "../../services/startup/ApiService";

function LogoutButton({ collapsed }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const confirmLogout = async () => {
    try {
      await ApiService.logout();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full flex items-center p-4 rounded-lg hover:bg-red-100 text-red-500 transition-colors font-bold"
      >
        <LogOut className="w-5 h-5 mr-3 flex-shrink-0" size={20} />
        {!collapsed && <span>Logout</span>}
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
