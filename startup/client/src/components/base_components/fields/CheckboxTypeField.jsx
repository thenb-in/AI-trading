import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

import { FieldFrame } from './shared/FieldFrame';
import { commonFieldPropTypes } from './shared/fieldPropTypes';
import { emitChange } from './shared/emitChange';

function CheckboxTypeField(props) {
  const {
    type = 'multi', // 'multi' (checkbox) | 'default' (radio)
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

  const isMulti = type === 'multi';
  const inputType = isMulti ? 'checkbox' : 'radio';

  const inputId = isMulti
    ? id || name
    : id || (name ? `${name}-${String(value)}` : '');
  const errorId = error ? `${inputId || name || 'field'}-error` : undefined;

  const inputClasses = useMemo(() => {
    const base = 'h-4 w-4 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500';
    const shape = isMulti ? 'rounded' : 'rounded-full';
    const state = disabled ? 'opacity-60 cursor-not-allowed' : '';
    return `${base} ${shape} ${state} ${className || ''}`.trim();
  }, [isMulti, disabled, className]);

  const handleChange = useCallback(
    (e) => {
      if (isMulti) {
        const next = Boolean(e?.target?.checked);
        emitChange(onChange, e, { name, id: inputId, value: next, checked: next });
      } else {
        emitChange(onChange, e, { name, id: inputId, value, checked: true });
      }
    },
    [isMulti, onChange, name, inputId, value]
  );

  const inputProps = {
    id: inputId,
    name,
    type: inputType,
    checked: Boolean(checked),
    onChange: handleChange,
    disabled,
    required,
    autoFocus,
    'aria-invalid': Boolean(error) || undefined,
    'aria-describedby': errorId,
    className: inputClasses,
    ref: inputRef,
    ...restProps,
  };

  // Radio inputs need value attribute
  if (!isMulti) {
    inputProps.value = value;
  }

  if (mode === 'bare') {
    return <input {...inputProps} />;
  }

  return (
    <FieldFrame inputId={inputId} label="" required={false} error={error} errorId={errorId} className={containerClassName}>
      <label
        htmlFor={inputId}
        className={`flex items-start gap-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${wrapperClassName}`.trim()}
      >
        <input {...inputProps} />
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


CheckboxTypeField.propTypes = {
  ...commonFieldPropTypes,
  type: PropTypes.oneOf(['default', 'multi']),
  checked: PropTypes.bool,
  value: PropTypes.any,
  inputRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  mode: PropTypes.oneOf(['default', 'bare']),
  wrapperClassName: PropTypes.string,
  labelTextClassName: PropTypes.string,
};

export { CheckboxTypeField };
