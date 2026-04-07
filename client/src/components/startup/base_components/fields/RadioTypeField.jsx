import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

import { FieldFrame } from './shared/FieldFrame';
import { commonFieldPropTypes } from './shared/fieldPropTypes';
import { emitChange } from './shared/emitChange';

function RadioTypeField(props) {
  const {
    mode = 'default', // 'default' | 'bare'
    checked = false,
    value = '',
    inputRef,
    onChange,
    label = '',
    error = '',
    disabled = false,
    required = false,
    className = '',
    containerClassName = '',
    wrapperClassName = '',
    labelTextClassName = '',
    name = '',
    id = '',
    autoFocus = false,
    ...restProps
  } = props;

  const inputId = id || (name ? `${name}-${String(value)}` : '');
  const errorId = error ? `${inputId || name || 'field'}-error` : undefined;

  const inputClasses = useMemo(() => {
    const base = 'h-4 w-4 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500';
    const shape = 'rounded-full';
    const state = disabled ? 'opacity-60 cursor-not-allowed' : '';
    return `${base} ${shape} ${state} ${className || ''}`.trim();
  }, [disabled, className]);

  const handleRadioChange = useCallback(
    (e) => {
      // When this radio is selected, value should become this option's value.
      // Keep event-shape consistent with other TextField types.
      emitChange(onChange, e, { name, id: inputId, value, checked: true });
    },
    [onChange, name, inputId, value]
  );

  if (mode === 'bare') {
    return (
      <input
        id={inputId}
        name={name}
        type="radio"
        value={value}
        checked={Boolean(checked)}
        onChange={handleRadioChange}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={errorId}
        className={inputClasses}
        ref={inputRef}
        {...restProps}
      />
    );
  }

  return (
    <FieldFrame inputId={inputId} label="" required={false} error={error} errorId={errorId} className={containerClassName}>
      <label
        htmlFor={inputId}
        className={`flex items-start gap-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${wrapperClassName}`.trim()}
      >
        <input
          id={inputId}
          name={name}
          type="radio"
          value={value}
          checked={Boolean(checked)}
          onChange={handleRadioChange}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={errorId}
          className={inputClasses}
          ref={inputRef}
          {...restProps}
        />
        {label ? (
          <span className={`text-sm text-gray-700 leading-5 ${disabled ? 'opacity-60' : ''} ${labelTextClassName}`.trim()}>
            {label}
            {required ? <span className="text-red-500 ml-1">*</span> : null}
          </span>
        ) : null}
      </label>
    </FieldFrame>
  );
}


RadioTypeField.propTypes = {
  ...commonFieldPropTypes,
  checked: PropTypes.bool,
  inputRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  mode: PropTypes.oneOf(['default', 'bare']),
  wrapperClassName: PropTypes.string,
  labelTextClassName: PropTypes.string,
};

export { RadioTypeField };


