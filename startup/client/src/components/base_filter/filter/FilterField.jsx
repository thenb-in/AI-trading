import { useEffect, useMemo } from 'react';
import { parse } from 'date-fns';
import PropTypes from 'prop-types';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { colors, fontSize } from '@startup/constants/theme';
import { SearchableDropdown } from '../../base_components/fields/SearchableDropdown';
import { NumberTypeField } from '../../base_components/fields/NumberTypeField';
import { TextTypeField } from '../../base_components/fields/TextTypeField';

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
  onSearchableChange,
  onDateChange,
  onCheckboxChange,
  onNumberChange,
  onTextChange,
}) => {
  const datePickerSlotProps = useMemo(
    () => buildDatePickerSlotProps(isDisabled),
    [isDisabled]
  );

  // Dynamic option lists load when their dropdown is opened. A filter that
  // already holds something other than the default came from the URL, a saved
  // run or a deep link, and its label only exists inside that list — so it has
  // to load without waiting to be opened. `onOpenOptions` is idempotent.
  const fetchData = config.onOpenOptions;
  const valueKey = Array.isArray(value) ? value.join(',') : String(value ?? '');
  useEffect(() => {
    if (!fetchData) return;
    const hasNonDefaultValue = valueKey
      .split(',')
      .some((v) => v && v !== 'all');
    if (hasNonDefaultValue) fetchData();
  }, [fetchData, valueKey]);

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
      const isMulti = !!config.multiselect;
      const showSearch = config.searchable === true || config.multiselect === true;
      // Surface 'all' rather than the placeholder so the user sees the active
      // default ("All Employees"). Multi wants an array, single a plain string.
      const selected = isMulti
        ? (Array.isArray(value) ? value : [String(value || 'all')])
        : String(value || 'all');
      return (
        <SearchableDropdown
          options={options}
          selectedValues={selected}
          onChange={(next) => onSearchableChange(config, next)}
          placeholder={config.placeholder || `Select ${config.label || ''}`.trim()}
          disabled={isDisabled}
          multiple={isMulti}
          searchable={showSearch}
          loading={!!config.optionsLoading}
          onOpen={fetchData}
          renderOption={config.renderOption}
        />
      );
    }

    case 'text':
      return (
        <TextTypeField
          name={config.name}
          value={value ?? ''}
          onChange={onTextChange}
          disabled={isDisabled}
          placeholder={config.placeholder || config.label}
          className="h-9 text-sm"
        />
      );

    case 'number':
      return (
        <NumberTypeField
          name={config.name}
          value={value ?? ''}
          onChange={onNumberChange}
          disabled={isDisabled}
          numberMode={config.numberMode || 'int'}
          min={config.min}
          max={config.max}
          clamp={config.min !== undefined || config.max !== undefined}
          placeholder={config.placeholder || config.label}
          className="h-9 text-sm"
        />
      );

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
    type: PropTypes.oneOf(['date', 'select', 'checkbox', 'number']).isRequired,
    options: PropTypes.array,
    multiselect: PropTypes.bool,
    /** (option) => node for its menu row. */
    renderOption: PropTypes.func,
    searchable: PropTypes.bool,
    optionsLoading: PropTypes.bool,
    onOpenOptions: PropTypes.func,
    placeholder: PropTypes.string,
    numberMode: PropTypes.oneOf(['int', 'float']),
    min: PropTypes.number,
    max: PropTypes.number,
  }).isRequired,
  value: PropTypes.any,
  isDisabled: PropTypes.bool,
  onSearchableChange: PropTypes.func,
  onDateChange: PropTypes.func,
  onCheckboxChange: PropTypes.func,
  onNumberChange: PropTypes.func,
  onTextChange: PropTypes.func,
};

export { FilterField };
