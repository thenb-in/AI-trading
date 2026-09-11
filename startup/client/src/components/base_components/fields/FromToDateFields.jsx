import PropTypes from 'prop-types';
import { DateTypeField } from './DateTypeField';

/**
 * Two stacked "From Date" + "To Date" inputs sharing the same change wrapper. Used by the
 * employee history items (ExperienceTab, insurance_item) where the two dates are the standard
 * pair on the form.
 */
const FromToDateFields = ({ fromValue, toValue, onFromChange, onToChange, disabled = false, maxToday = false }) => (
  <>
    <div className="w-full [&_.MuiFormControl-root]:w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
      <DateTypeField
        name="from_date"
        value={fromValue ?? ''}
        onChange={(_, value) => onFromChange(value)}
        disabled={disabled}
        maxToday={maxToday}
      />
    </div>
    <div className="w-full [&_.MuiFormControl-root]:w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
      <DateTypeField
        name="to_date"
        value={toValue ?? ''}
        onChange={(_, value) => onToChange(value)}
        disabled={disabled}
        maxToday={maxToday}
      />
    </div>
  </>
);

FromToDateFields.propTypes = {
  fromValue: PropTypes.string,
  toValue: PropTypes.string,
  onFromChange: PropTypes.func.isRequired,
  onToChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  maxToday: PropTypes.bool,
};

export { FromToDateFields };
