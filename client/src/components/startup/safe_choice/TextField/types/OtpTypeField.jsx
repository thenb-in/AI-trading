import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FieldFrame } from '../shared/FieldFrame';
import { emitChange } from '../shared/emitChange';
import { commonFieldPropTypes } from '../shared/fieldPropTypes';

function OtpTypeField(props) {
  const {
    value = '',
    onChange,
    label = '',
    error = '',
    disabled = false,
    required = false,
    className = '',
    name = '',
    id = '',
    autoFocus = false,
    otpLength = 6,
    ...restProps
  } = props;

  const inputId = id || name;
  const [digits, setDigits] = useState(() => Array(otpLength).fill(''));
  const refs = useRef([]);

  // Keep refs bounded to otpLength
  useEffect(() => {
    refs.current = refs.current.slice(0, otpLength);
  }, [otpLength]);

  // Sync from external value
  useEffect(() => {
    const v = String(value ?? '');
    if (!v) {
      setDigits(Array(otpLength).fill(''));
      return;
    }
    const arr = v.split('').slice(0, otpLength);
    setDigits([...arr, ...Array(otpLength - arr.length).fill('')]);
  }, [value, otpLength]);

  const emitCombined = useCallback((originalEvent, combinedValue) => {
    emitChange(onChange, originalEvent, { name, id: inputId, value: combinedValue });
  }, [onChange, name, inputId]);

  const focusAt = useCallback((index) => {
    const el = refs.current[index];
    if (el && typeof el.focus === 'function') el.focus();
  }, []);

  const setRefAt = useCallback((index, el) => {
    refs.current[index] = el;
  }, []);

  const handleDigitChange = useCallback((index, rawValue, originalEvent) => {
    const raw = String(rawValue ?? '');
    if (raw.length > 1) return;

    const numeric = raw.replace(/[^0-9]/g, '');
    if (numeric && !/^\d$/.test(numeric)) return;

    const next = [...digits];
    next[index] = numeric;
    setDigits(next);

    const combined = next.join('');
    emitCombined(originalEvent, combined);

    if (numeric && index < otpLength - 1) {
      focusAt(index + 1);
    }
  }, [digits, otpLength, emitCombined, focusAt]);

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      focusAt(index - 1);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusAt(index - 1);
    } else if (e.key === 'ArrowRight' && index < otpLength - 1) {
      focusAt(index + 1);
    }
  }, [digits, otpLength, focusAt]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, otpLength);
    const next = [...Array(otpLength).fill('')];
    pasted.split('').forEach((ch, idx) => {
      if (idx < otpLength) next[idx] = ch;
    });
    setDigits(next);

    const combined = next.join('');
    emitCombined(e, combined);

    const lastFilled = Math.min(pasted.length - 1, otpLength - 1);
    focusAt(lastFilled >= 0 ? lastFilled : 0);
  }, [otpLength, emitCombined, focusAt]);

  // Precompute handlers to avoid inline JSX arrow functions
  const refSetters = useMemo(() => {
    return Array.from({ length: otpLength }, (_, index) => (el) => setRefAt(index, el));
  }, [otpLength, setRefAt]);

  const changeHandlers = useMemo(() => {
    return Array.from({ length: otpLength }, (_, index) => (e) => handleDigitChange(index, e.target.value, e));
  }, [otpLength, handleDigitChange]);

  const keyDownHandlers = useMemo(() => {
    return Array.from({ length: otpLength }, (_, index) => (e) => handleKeyDown(index, e));
  }, [otpLength, handleKeyDown]);

  return (
    <FieldFrame inputId={inputId} label={label} required={required} error={error} className={className}>
      <div className="flex justify-center gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={refSetters[index]}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength="1"
            value={digit}
            onChange={changeHandlers[index]}
            onKeyDown={keyDownHandlers[index]}
            onPaste={handlePaste}
            disabled={disabled}
            required={required && index === 0}
            className={`w-12 h-12 text-center text-xl font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 hover:border-gray-400 ${
              error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'}`}
            placeholder="0"
            autoFocus={autoFocus && index === 0}
            {...restProps}
          />
        ))}
      </div>
    </FieldFrame>
  );
}

OtpTypeField.propTypes = {
  ...commonFieldPropTypes,
};

export { OtpTypeField };


