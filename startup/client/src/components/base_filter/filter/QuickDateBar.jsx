import PropTypes from 'prop-types';
import {
  QUICK_DATE_BTN_BASE,
  QUICK_DATE_BTN_ENABLED,
  QUICK_DATE_BTN_MUTED,
  QUICK_DATE_BTN_DISABLED,
} from './constants';


const buttonVariant = (disabled, muted) => {
  if (disabled) return QUICK_DATE_BTN_DISABLED;
  return muted ? QUICK_DATE_BTN_MUTED : QUICK_DATE_BTN_ENABLED;
};

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
    <div className="flex flex-wrap items-center gap-2">
      {actions.map(({ label, onClick, muted, animateIn }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`${QUICK_DATE_BTN_BASE} ${buttonVariant(disabled, muted)} ${
            animateIn ? 'quick-date-enter' : ''
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
      muted: PropTypes.bool,
      animateIn: PropTypes.bool,
    })
  ).isRequired,
  disabled: PropTypes.bool,
};

export { QuickDateBar };
