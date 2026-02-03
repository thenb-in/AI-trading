import PropTypes from 'prop-types';

/**
 * Status message component
 */
const StatusMessage = ({ message }) => {
  if (!message) return null;

  return (
    <div className="bg-blue-600 text-white text-xs px-3 py-2 rounded-md shadow-lg">
      {message}
    </div>
  );
};

StatusMessage.propTypes = {
  message: PropTypes.string
};

export { StatusMessage };

