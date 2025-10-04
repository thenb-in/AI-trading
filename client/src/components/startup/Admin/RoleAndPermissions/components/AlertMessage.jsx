import { AlertCircle, CheckCircle } from 'lucide-react';
import PropTypes from 'prop-types';

const AlertMessage = ({ type, message, onDismiss }) => {
  const isError = type === 'error';

  if (!message) return null;

  return (
    <div className={`border rounded-xl p-4 ${
      isError 
        ? 'bg-red-50 border-red-200' 
        : 'bg-green-50 border-green-200'
    }`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {isError ? (
            <AlertCircle className="h-5 w-5 text-red-400" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-400" />
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${
            isError ? 'text-red-800' : 'text-green-800'
          }`}>
            {isError ? 'Error' : 'Success'}
          </h3>
          <div className={`mt-1 text-sm ${
            isError ? 'text-red-700' : 'text-green-700'
          }`}>
            <p>{message}</p>
          </div>
          {onDismiss && (
            <div className="mt-3">
              <button
                onClick={onDismiss}
                className={`text-sm px-3 py-1 rounded-md transition-colors ${
                  isError 
                    ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

AlertMessage.propTypes = {
  type: PropTypes.oneOf(['error', 'success']).isRequired,
  message: PropTypes.string.isRequired,
  onDismiss: PropTypes.func
};

export default AlertMessage;
