import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

/**
 * The permission a screen wanted, spelled the way hasPermission reads it: one
 * name, any of several, or — given { all: [...] } — every one of them. Naming
 * it turns "why can't I see this?" into something a support engineer can act on.
 */
const requiredPermissionText = (requiredPermission) => {
  if (!requiredPermission) return "";
  if (requiredPermission.all) return requiredPermission.all.join(" and ");
  return [].concat(requiredPermission).join(" or ");
};

/**
 * The one refusal screen in the app. Every gated page — a route, a master, a
 * report — lands here rather than rendering itself empty, so a missing
 * permission always reads as a refusal instead of a broken page.
 */
const AccessDenied = ({ requiredPermission }) => {
  const navigate = useNavigate();
  const permissionText = requiredPermissionText(requiredPermission);

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-700">
          You don&apos;t have permission to access this page.
        </p>
        {permissionText && (
          <p className="text-gray-500 mt-2 text-sm">
            Required permission: <b>{permissionText}</b>
          </p>
        )}
        <button
          onClick={handleGoHome}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
};

AccessDenied.propTypes = {
  // A permission name, any of several, or { all: [...] } — what hasPermission takes.
  requiredPermission: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.shape({ all: PropTypes.arrayOf(PropTypes.string) }),
  ]),
};

export { AccessDenied };
