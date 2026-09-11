import PropTypes from 'prop-types';
import { Users, UserCheck } from 'lucide-react';


const MODES = [
  {
    value: false,
    icon: Users,
    title: 'Everything',
    hint: 'Everyone picked below gets every message.'
  },
  {
    value: true,
    icon: UserCheck,
    title: 'Only their own',
    hint: 'Each person gets only what is about them.'
  }
];

const DeliveryModeChoice = ({ onlyTheSubject, onChange }) => (
  <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
    {MODES.map(({ value, icon: Icon, title, hint }) => {
      const selected = onlyTheSubject === value;
      return (
        <button
          key={title}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(value)}
          className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
            selected
              ? 'border-blue-500 bg-blue-50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${selected ? 'text-blue-600' : 'text-gray-400'}`} />
          <span className="min-w-0">
            <span className={`block text-sm font-semibold ${selected ? 'text-blue-900' : 'text-gray-700'}`}>
              {title}
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">{hint}</span>
          </span>
        </button>
      );
    })}
  </div>
);

DeliveryModeChoice.propTypes = {
  onlyTheSubject: PropTypes.bool,
  onChange: PropTypes.func.isRequired
};

export { DeliveryModeChoice };
