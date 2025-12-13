/**
 * Error Display component for showing error messages
 */

import PropTypes from "prop-types";

function ErrorDisplay({ error }) {
  if (!error) return null;

  return (
    <div className="bg-red-100 border border-red-300 rounded text-red-800 text-xs py-2 px-4 mb-4">
      {error}
    </div>
  );
}

ErrorDisplay.propTypes = {
  error: PropTypes.string,
};

export { ErrorDisplay };

