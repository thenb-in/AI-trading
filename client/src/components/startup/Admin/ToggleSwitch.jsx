import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { CheckboxTypeField } from '@/components/startup/base_components/fieldss/CheckboxTypeField';

function ToggleSwitch({ label, checked, onChange, description }) {
  return (
    <div className="mb-4">
      <label className="flex items-center text-gray-700 font-medium cursor-pointer">
        <div className="relative inline-block w-10 mr-2 align-middle select-none">
          <CheckboxTypeField
            mode="bare"
            checked={checked}
            onChange={onChange}
            className="opacity-0 absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
          />
          <span
            className={`toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer ${
              checked ? 'bg-indigo-500' : ''
            }`}
          >
            <span
              className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-300 ease-in-out ${
                checked ? 'translate-x-4' : 'translate-x-0'
              }`}
            ></span>
          </span>
        </div>
        {label}
      </label>
      {description && checked && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="text-sm text-gray-500 mt-2 ml-12 italic"
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}
ToggleSwitch.propTypes = {
  label: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  description: PropTypes.string,
};

export { ToggleSwitch };