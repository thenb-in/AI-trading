import PropTypes from 'prop-types';
import { ArrowUpRight } from 'lucide-react';

/** Jumps to the record the dropdown is holding. */
function NavigateButton({ value, onNavigate }) {
  const handleClick = (e) => {
    e.stopPropagation();
    onNavigate(value);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Open selected record"
      className="shrink-0 rounded border border-gray-300 bg-white p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
    >
      <ArrowUpRight className="w-4 h-4" />
    </button>
  );
}

NavigateButton.propTypes = {
  value: PropTypes.string.isRequired,
  /** (value) */
  onNavigate: PropTypes.func.isRequired,
};

export { NavigateButton };
