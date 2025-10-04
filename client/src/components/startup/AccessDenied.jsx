import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

const AccessDenied = ({ requiredPermission }) => {
  console.log(requiredPermission,'3223232323')
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-700">
          You don&apos;t have permission to access this page.
        </p>
        {requiredPermission && (
          <p className="text-gray-500 mt-2 text-sm">
            Required permission: <b>{requiredPermission}</b>
          </p>
        )}
        <button
          onClick={() => navigate("/")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
};

AccessDenied.propTypes = {
  requiredPermission: PropTypes.string,
};

export default AccessDenied;
