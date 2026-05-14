import { useMemo } from 'react';
import { parse } from 'date-fns';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { colors, fontSize } from '@startup/constants/theme';
import { SearchableDropdown } from '../../base_components/fields/SearchableDropdown';

const buildDatePickerSlotProps = (isDisabled) => ({
  textField: {
    size: 'small',
    placeholder: 'DD/MM/YYYY',
    fullWidth: true,
    sx: {
      '& .MuiInputBase-root': {
        height: '36px',
        fontSize: fontSize.sm,
        backgroundColor: isDisabled ? colors.background.paper : colors.background.default,
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: isDisabled ? colors.gray[200] : colors.gray[400],
        },
      },
      '& .MuiInputBase-input': { padding: '8px 12px' },
      '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.gray[300] },
      '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: colors.primary.light,
        borderWidth: '1px',
      },
    },
  },
});

/**
 * Renders one filter input based on `config.type`. State and change handlers
 * are owned by useFilterState — this component is purely presentational.
 */
const FilterField = ({
  config,
  value,
  isDisabled,
  onSelectChange,
  onSearchableChange,
  onDateChange,
  onCheckboxChange,
}) => {
  const datePickerSlotProps = useMemo(
    () => buildDatePickerSlotProps(isDisabled),
    [isDisabled]
  );

  switch (config.type) {
    case 'date': {
      const dateValue = value ? parse(value, 'yyyy-MM-dd', new Date()) : null;
      const maxDate = new Date();
      maxDate.setHours(23, 59, 59, 999);
      return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            value={dateValue}
            onChange={(newValue) => onDateChange(config.name, newValue)}
            disabled={isDisabled}
            format="dd/MM/yyyy"
            maxDate={maxDate}
            slotProps={datePickerSlotProps}
          />
        </LocalizationProvider>
      );
    }

    case 'select': {
      const options = Array.isArray(config.options) ? config.options : [];
      const useSearchable = config.searchable === true || config.multiselect === true;

      if (useSearchable) {
        const isMulti = !!config.multiselect;
        // For both single and multi: surface 'all' as a chip so the user
        // sees the active default ("All Employees") instead of placeholder.
        const selected = isMulti
          ? (Array.isArray(value) ? value : [String(value || 'all')])
          : [String(value || 'all')];
        return (
          <SearchableDropdown
            options={options}
            selectedValues={selected}
            onChange={(newValues) => onSearchableChange(config, newValues)}
            placeholder={config.placeholder || `Select ${config.label || ''}`.trim()}
            disabled={isDisabled}
            multiple={isMulti}
          />
        );
      }

      return (
        <div className={`relative ${isDisabled ? 'pointer-events-none opacity-60' : ''}`}>
          <select
            name={config.name}
            value={value || 'all'}
            onChange={(e) => onSelectChange(config.name, e.target.value)}
            disabled={isDisabled}
            className={`
              w-full min-w-[150px] h-9 px-3 pr-8 text-sm border rounded-md appearance-none transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
              ${isDisabled
                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 cursor-pointer'
              }
            `}
          >
            {options.length > 0 ? (
              options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            ) : (
              <option value="all">{config.placeholder || 'Select'}</option>
            )}
          </select>
          <ChevronDown
            size={16}
            className={`absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none ${
              isDisabled ? 'text-gray-300' : 'text-gray-500'
            }`}
          />
        </div>
      );
    }

    case 'checkbox':
      return (
        <label
          className={`inline-flex items-center text-sm cursor-pointer ${
            isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:text-gray-900'
          }`}
        >
          <input
            type="checkbox"
            name={config.name}
            checked={value || false}
            onChange={onCheckboxChange}
            disabled={isDisabled}
            className={`w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500/20 ${
              isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          />
          <span className="ml-2 text-gray-700">{config.label}</span>
        </label>
      );

    default:
      return null;
  }
};

FilterField.propTypes = {
  config: PropTypes.shape({
    name: PropTypes.string.isRequired,
    label: PropTypes.string,
    type: PropTypes.oneOf(['date', 'select', 'checkbox']).isRequired,
    options: PropTypes.array,
    multiselect: PropTypes.bool,
    searchable: PropTypes.bool,
    placeholder: PropTypes.string,
  }).isRequired,
  value: PropTypes.any,
  isDisabled: PropTypes.bool,
  onSelectChange: PropTypes.func,
  onSearchableChange: PropTypes.func,
  onDateChange: PropTypes.func,
  onCheckboxChange: PropTypes.func,
};

export { FilterField };
