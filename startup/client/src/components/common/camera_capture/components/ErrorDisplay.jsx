import PropTypes from 'prop-types';
import { AlertCircle } from 'lucide-react';

/**
 * Error display component
 */
const ErrorDisplay = ({ error, permissionDenied, onRequestPermission }) => {
  if (!error) return null;

  return (
    <div className="bg-red-600 text-white px-3 py-2 rounded-md shadow-lg text-xs sm:text-sm">
      <div className="flex items-start">
        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium leading-snug">{error}</p>
          {permissionDenied && onRequestPermission && (
            <button
              onClick={onRequestPermission}
              className="mt-1.5 underline hover:no-underline"
            >
              Request Permission Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

ErrorDisplay.propTypes = {
  error: PropTypes.string,
  permissionDenied: PropTypes.bool,
  onRequestPermission: PropTypes.func
};

export { ErrorDisplay };

