/**
 * Error Display component for showing error messages
 */

import PropTypes from "prop-types";

function ErrorDisplay({ error }) {
  if (!error) return null;

  return (
    <div className="px-3 py-2 mb-3 bg-red-100 border border-red-300 rounded-md text-red-800 text-xs">
      {error}
    </div>
  );
}

ErrorDisplay.propTypes = {
  error: PropTypes.string,
};

export { ErrorDisplay };

