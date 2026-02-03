import PropTypes from 'prop-types';

/**
 * Loading state component
 */
const LoadingState = ({ message = 'Starting camera...' }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-20">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
};

LoadingState.propTypes = {
  message: PropTypes.string
};

export { LoadingState };

