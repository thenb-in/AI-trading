import PropTypes from 'prop-types';

/**
 * Status message component
 */
const StatusMessage = ({ message }) => {
  if (!message) return null;

  return (
    <div className="inline-flex max-w-full bg-blue-600/95 text-white text-[10px] sm:text-xs md:text-sm px-3 py-1.5 rounded-full shadow-md">
      {message}
    </div>
  );
};

StatusMessage.propTypes = {
  message: PropTypes.string
};

export { StatusMessage };

