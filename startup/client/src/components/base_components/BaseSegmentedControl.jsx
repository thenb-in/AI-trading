import PropTypes from 'prop-types';


const TONES = {
  indigo: 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500',
  blue: 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500',
  violet: 'border-violet-500 bg-violet-50 text-violet-700 ring-1 ring-violet-500',
  emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500',
  amber: 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500',
};

/**
 * A one-of-few choice shown as side-by-side buttons
 */
const BaseSegmentedControl = ({ label, options, value, onChange }) => (
  <div>
    {label && <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>}
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon, tone = 'indigo' }) => {
        const isActive = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(optionValue)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
              isActive ? TONES[tone] : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {optionLabel}
          </button>
        );
      })}
    </div>
  </div>
);

BaseSegmentedControl.propTypes = {
  label: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.elementType,
    tone: PropTypes.oneOf(Object.keys(TONES)),
  })).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export { BaseSegmentedControl };
