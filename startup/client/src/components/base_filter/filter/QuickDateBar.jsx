import PropTypes from 'prop-types';
import {
  QUICK_DATE_BTN_BASE,
  QUICK_DATE_BTN_ENABLED,
  QUICK_DATE_BTN_DISABLED,
} from './constants';


const QuickDateBar = ({ actions, disabled }) => (
  <div className="mt-2 p-2.5 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-md border-2 border-blue-400 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
        <label className="text-xs font-bold uppercase tracking-wide text-gray-900">
          Quick Dates
        </label>
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      {actions.map(({ label, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`${QUICK_DATE_BTN_BASE} ${
            disabled ? QUICK_DATE_BTN_DISABLED : QUICK_DATE_BTN_ENABLED
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);

QuickDateBar.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
    })
  ).isRequired,
  disabled: PropTypes.bool,
};

export { QuickDateBar };
