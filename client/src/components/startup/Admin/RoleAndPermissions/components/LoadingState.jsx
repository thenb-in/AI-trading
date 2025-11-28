import { Loader2, RefreshCw } from 'lucide-react';
import PropTypes from 'prop-types';

const LoadingState = ({ retryCount, onRetry }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900">Loading Role & Permission Data</h2>
          <p className="text-gray-600 text-center">
            {retryCount > 0 ? `Retrying... (${retryCount}/3)` : 'Please wait while we fetch the latest data'}
          </p>
          {retryCount > 0 && onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

LoadingState.propTypes = {
  retryCount: PropTypes.number.isRequired,
  onRetry: PropTypes.func
};

export { LoadingState };
