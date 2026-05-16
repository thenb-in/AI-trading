import PropTypes from 'prop-types';
import { FilterField } from './FilterField';


const FilterCell = ({ config, value, isDisabled, withLabel, handlers }) => (
  <div className="space-y-1">
    {withLabel && (
      <label
        className={`block text-xs font-bold uppercase tracking-wide truncate ${
          isDisabled ? 'text-gray-400' : 'text-gray-800'
        }`}
      >
        {config.label}
      </label>
    )}
    <FilterField
      config={config}
      value={value}
      isDisabled={isDisabled}
      {...handlers}
    />
  </div>
);

FilterCell.propTypes = {
  config: PropTypes.shape({
    name: PropTypes.string.isRequired,
    label: PropTypes.string,
  }).isRequired,
  value: PropTypes.any,
  isDisabled: PropTypes.bool,
  withLabel: PropTypes.bool,
  handlers: PropTypes.object.isRequired,
};

export { FilterCell };
