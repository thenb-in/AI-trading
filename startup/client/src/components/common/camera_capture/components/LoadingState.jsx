import PropTypes from 'prop-types';

/**
 * Loading state component
 */
const LoadingState = ({ message = 'Starting camera...' }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-white mx-auto mb-3 sm:mb-4" />
        <p className="text-xs sm:text-sm px-4">{message}</p>
      </div>
    </div>
  );
};

LoadingState.propTypes = {
  message: PropTypes.string
};

export { LoadingState };

