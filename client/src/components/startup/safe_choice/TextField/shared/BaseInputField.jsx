import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

import { FieldFrame } from './FieldFrame';
import { ClearButton } from './ClearButton';
import { getBaseInputClasses } from './getBaseInputClasses';
import { emitChange } from './emitChange';
import { basicSanitize } from '../utils/sanitize';

/**
 * Shared input/textarea renderer with optional left icon + optional clear button.
 */
function BaseInputField({
  as = 'input',
  inputType = 'text',
  inputMode,
  pattern,
  normalize,
  clearAriaLabel = 'Clear input',

  // Common field props
  value = '',
  onChange,
  placeholder = '',
  label = '',
  error = '',
  disabled = false,
  required = false,
  className = '',
  name = '',
  id = '',
  autoFocus = false,
  maxLength = null,
  minLength = null,
  rows = 4,
  showClearButton = false,
  icon = null,
  defaultIcon = null,
  sanitize = false,

  // Extra props forwarded to the underlying control
  ...restProps
}) {
  const inputId = id || name;
  const leftIcon = icon || defaultIcon;
  const errorId = error ? `${inputId || name || 'field'}-error` : undefined;

  const hasValue = value !== '' && value !== null && value !== undefined;
  const shouldShowClear = Boolean(showClearButton && hasValue && !disabled);

  const baseInputClasses = useMemo(
    () => getBaseInputClasses({ error, disabled, className }),
    [error, disabled, className]
  );

  const leftPad = leftIcon ? 'pl-10' : 'pl-3';
  const rightPad = shouldShowClear ? 'pr-10' : 'pr-3';

  const handleNormalizedChange = useCallback(
    (e) => {
      const raw = e?.target?.value ?? '';
      let next = String(raw ?? '');

      if (typeof normalize === 'function') {
        next = normalize(next);
      }

      if (sanitize) {
        next = basicSanitize(next);
      }

      emitChange(onChange, e, { name, id: inputId, value: next });
    },
    [normalize, sanitize, onChange, name, inputId]
  );

  const handleClear = useCallback(() => {
    emitChange(onChange, null, { name, id: inputId, value: '' });
  }, [onChange, name, inputId]);

  const sharedProps = {
    id: inputId,
    name,
    value,
    onChange: handleNormalizedChange,
    placeholder,
    disabled,
    required,
    maxLength,
    minLength,
    autoFocus,
    inputMode,
    pattern,
    'aria-invalid': Boolean(error) || undefined,
    'aria-describedby': errorId,
    className: `${baseInputClasses} ${leftPad} ${rightPad}`.trim(),
    ...restProps,
  };

  return (
    <FieldFrame inputId={inputId} label={label} required={required} error={error} errorId={errorId}>
      <div className="relative">
        {leftIcon ? (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {leftIcon}
          </div>
        ) : null}

        {as === 'textarea' ? (
          <textarea
            {...sharedProps}
            rows={rows}
            // Textareas should be resizable by default for UX
            className={`${sharedProps.className} resize-y`.trim()}
          />
        ) : (
          <input
            {...sharedProps}
            type={inputType}
          />
        )}

        {shouldShowClear ? (
          <ClearButton onClick={handleClear} ariaLabel={clearAriaLabel} />
        ) : null}
      </div>
    </FieldFrame>
  );
}

BaseInputField.propTypes = {
  as: PropTypes.oneOf(['input', 'textarea']),
  inputType: PropTypes.string,
  inputMode: PropTypes.string,
  pattern: PropTypes.string,
  normalize: PropTypes.func,
  clearAriaLabel: PropTypes.string,

  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  label: PropTypes.string,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string,
  autoFocus: PropTypes.bool,
  maxLength: PropTypes.number,
  minLength: PropTypes.number,
  rows: PropTypes.number,
  showClearButton: PropTypes.bool,
  icon: PropTypes.node,
  defaultIcon: PropTypes.node,
  sanitize: PropTypes.bool,
};

export { BaseInputField };


