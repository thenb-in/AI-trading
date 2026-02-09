import PropTypes from 'prop-types';
import { X } from 'lucide-react';

function ClearButton({ onClick, ariaLabel = 'Clear input' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
      aria-label={ariaLabel}
    >
      <X className="h-4 w-4" />
    </button>
  );
}

ClearButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string,
};

export { ClearButton };


