import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TextField } from '@mui/material';
import { format, parse, isValid } from 'date-fns';
import { colors, fontSize } from '@startup/constants/theme';

function DateTypeField({
  name,
  value,
  onChange,
  disabled = false,
  placeholder = 'DD/MM/YYYY',
  maxToday = true
}) {

  const parsedDate = useMemo(() => {
    if (!value) return null;
    const parsed = parse(value, 'yyyy-MM-dd', new Date());
    return isValid(parsed) ? parsed : null;
  }, [value]);

  const handleChange = useCallback((date) => {
    if (!date || !isValid(date)) {
      onChange?.(name, '');
      return;
    }

    let finalDate = date;

    if (maxToday) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (date > today) {
        finalDate = today;
      }
    }

    const formatted = format(finalDate, 'yyyy-MM-dd');
    onChange?.(name, formatted);
  }, [name, onChange, maxToday]);

  const renderInput = useCallback((params) => {
    return (
      <TextField
        {...params}
        size="small"
        placeholder={placeholder}
        fullWidth
        sx={{
          '& .MuiInputBase-root': {
            height: '36px',
            fontSize: fontSize.sm,
            backgroundColor: disabled
              ? colors.background.paper
              : colors.background.default,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: disabled
                ? colors.gray[200]
                : colors.gray[400],
            },
          },
          '& .MuiInputBase-input': {
            padding: '8px 12px',
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.gray[300],
          },
          '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.primary.light,
            borderWidth: '1px',
          },
        }}
      />
    );
  }, [disabled, placeholder]);

  const maxDate = useMemo(() => {
    if (!maxToday) return undefined;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  }, [maxToday]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DatePicker
        value={parsedDate}
        onChange={handleChange}
        disabled={disabled}
        format="dd/MM/yyyy"
        maxDate={maxDate}
        renderInput={renderInput}
      />
    </LocalizationProvider>
  );
}

DateTypeField.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  maxToday: PropTypes.bool
};

export { DateTypeField };
