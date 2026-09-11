import { useCallback } from 'react';
import PropTypes from 'prop-types';

import { FieldFrame } from './shared/FieldFrame';
import { commonFieldPropTypes } from './shared/fieldPropTypes';

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * A colour, picked from the swatch or typed as a hex code
 */
function ColorTypeField({
  value = '',
  onChange,
  label = '',
  hint = '',
  error = '',
  disabled = false,
  required = false,
  name = '',
  id = '',
  placeholder = '#00bcd4',
  fallbackColor = '#94a3b8',
  className = '',
  containerClassName = ''
}) {
  const inputId = id || name;
  const errorId = error ? `${inputId || 'color'}-error` : undefined;
  const swatchValue = HEX_PATTERN.test(value) ? value : fallbackColor;

  const emit = useCallback(
    (next) => {
      if (!onChange) {
        return;
      }
      onChange({ target: { name, value: next } });
    },
    [onChange, name]
  );

  return (
    <FieldFrame
      inputId={inputId}
      label={label}
      required={required}
      disabled={disabled}
      hint={hint}
      error={error}
      errorId={errorId}
      className={containerClassName}
    >
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label ? `${label} colour swatch` : 'Colour swatch'}
          value={swatchValue}
          onChange={(e) => emit(e.target.value)}
          disabled={disabled}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-gray-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <input
          type="text"
          id={inputId}
          name={name}
          value={value}
          onChange={(e) => emit(e.target.value.trim())}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={7}
          aria-describedby={errorId}
          className={`w-full rounded-md border border-gray-300 px-3 py-2 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 ${className}`.trim()}
        />
      </div>
    </FieldFrame>
  );
}

ColorTypeField.propTypes = {
  ...commonFieldPropTypes,
  onChange: PropTypes.func.isRequired,
  fallbackColor: PropTypes.string
};

export { ColorTypeField, HEX_PATTERN };
