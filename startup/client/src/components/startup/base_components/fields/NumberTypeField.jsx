import { useMemo } from 'react';
import { Hash } from 'lucide-react';

import { BaseInputField } from './shared/BaseInputField';
import { commonFieldPropTypes } from './shared/fieldPropTypes';

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function isCompleteIntString(s) {
  return /^-?\d+$/.test(s);
}

function isCompleteFloatString(s) {
  // Examples: "1", "1.2", ".5", "-.5"
  return /^-?\d+(\.\d+)?$/.test(s) || /^-?\d*\.\d+$/.test(s);
}

/**
 * Normalize number input for better UX:
 * - Removes non-numeric chars
 * - Supports int/float modes
 * - Allows intermediate typing states like "-", "1.", ".5"
 * - Optional range clamping when value becomes a complete number
 */
function createNumberNormalizer({
  numberMode,
  allowNegative,
  precision,
  min,
  max,
  clamp,
}) {
  const mode = numberMode === 'int' ? 'int' : 'float';
  const canBeNegative = allowNegative === true || (typeof allowNegative !== 'boolean' && (typeof min !== 'number' || min < 0));

  return (rawValue) => {
    let s = String(rawValue ?? '').replace(/\s+/g, '');

    // Keep only allowed characters
    if (mode === 'int') {
      s = s.replace(/[^\d-]/g, '');
    } else {
      s = s.replace(/[^\d\-.]/g, '');
    }

    // Normalize minus sign
    const hadLeadingMinus = canBeNegative && s.startsWith('-');
    s = s.replace(/-/g, '');
    if (hadLeadingMinus) s = `-${s}`;

    // Normalize decimal dot for float
    if (mode === 'float') {
      const firstDotIndex = s.indexOf('.');
      if (firstDotIndex !== -1) {
        // Remove all dots, then insert one at the first dot position
        const withoutDots = s.replace(/\./g, '');
        s = `${withoutDots.slice(0, firstDotIndex)}.${withoutDots.slice(firstDotIndex)}`;
      }

      // Precision: truncate decimal digits only when user has typed them
      if (typeof precision === 'number' && precision >= 0) {
        const parts = s.split('.');
        if (parts.length === 2 && parts[1].length > precision) {
          s = `${parts[0]}.${parts[1].slice(0, precision)}`;
        }
      }
    }

    // Optional clamping (only for complete numeric values)
    if (clamp === true) {
      const isComplete = mode === 'int' ? isCompleteIntString(s) : isCompleteFloatString(s);
      if (isComplete) {
        const n = Number(s);
        if (isFiniteNumber(n)) {
          let next = n;
          if (typeof min === 'number' && isFiniteNumber(min)) next = Math.max(min, next);
          if (typeof max === 'number' && isFiniteNumber(max)) next = Math.min(max, next);

          if (mode === 'int') {
            // Keep integer stable (truncate towards zero)
            s = String(Math.trunc(next));
          } else {
            // Avoid forcing trailing zeros; just stringify
            s = String(next);
          }
        }
      }
    }

    return s;
  };
}

function NumberTypeField(props) {
  const {
    // Default to int because most app numeric fields are counts/ids by default.
    // Use `numberMode="float"` when decimals are required.
    numberMode = 'int', // 'int' | 'float'
    allowNegative,
    precision,
    min,
    max,
    clamp = false,
  } = props;

  const normalize = useMemo(() => {
    return createNumberNormalizer({
      numberMode,
      allowNegative,
      precision,
      min,
      max,
      clamp,
    });
  }, [numberMode, allowNegative, precision, min, max, clamp]);

  const inputMode = numberMode === 'int' ? 'numeric' : 'decimal';
  const pattern = numberMode === 'int' ? '[0-9-]*' : '[0-9\\-\\.]*';

  return (
    <BaseInputField
      {...props}
      // We intentionally use `type="text"` (not `type="number"`) for production UX:
      // - Browsers allow scientific notation (e/E) in <input type="number"> (not desired here)
      // - Better control over normalization (int/float) and range clamping
      // - Allows intermediate states like "-", "1.", ".5" without fighting the user
      inputType="text"
      inputMode={inputMode}
      pattern={pattern}
      normalize={normalize}
      defaultIcon={<Hash className="h-4 w-4 text-gray-400" />}
      clearAriaLabel="Clear number"
    />
  );
}

NumberTypeField.propTypes = {
  ...commonFieldPropTypes,
  numberMode: commonFieldPropTypes.numberMode,
  allowNegative: commonFieldPropTypes.allowNegative,
  precision: commonFieldPropTypes.precision,
  min: commonFieldPropTypes.min,
  max: commonFieldPropTypes.max,
  clamp: commonFieldPropTypes.clamp,
};

export { NumberTypeField };


