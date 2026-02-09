import { useCallback, useMemo, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { FieldFrame } from '../shared/FieldFrame';
import { getBaseInputClasses } from '../shared/getBaseInputClasses';
import { commonFieldPropTypes } from '../shared/fieldPropTypes';

function PasswordTypeField(props) {
  const {
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
    icon = null,
    ...restProps
  } = props;

  const inputId = id || name;
  const [showPassword, setShowPassword] = useState(false);
  const resolvedIcon = icon || <Lock className="h-4 w-4 text-gray-400" />;

  const baseInputClasses = useMemo(() => getBaseInputClasses({ error, disabled, className }), [error, disabled, className]);

  const leftPad = resolvedIcon ? 'pl-10' : 'pl-3';
  const rightPad = 'pr-10';

  const handleChange = useCallback((e) => {
    if (!onChange) return;
    onChange(e);
  }, [onChange]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((s) => !s);
  }, []);

  return (
    <FieldFrame inputId={inputId} label={label} required={required} error={error}>
      <div className="relative">
        {resolvedIcon ? (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {resolvedIcon}
          </div>
        ) : null}

        <input
          type={showPassword ? 'text' : 'password'}
          id={inputId}
          name={name}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          autoFocus={autoFocus}
          className={`${baseInputClasses} ${leftPad} ${rightPad}`}
          {...restProps}
        />

        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FieldFrame>
  );
}

PasswordTypeField.propTypes = {
  ...commonFieldPropTypes,
};

export { PasswordTypeField };


