import { useCallback } from "react";
import PropTypes from "prop-types";
import { Minus, Plus } from "lucide-react";
import { numberInRange } from "@startup/utils/valueUtils";

const BUTTON_CLASS = "px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40";

// A − [n] + control that steps a number within min..max and reports each change through onChange.
const NumberStepper = ({ value, onChange, min = 0, max = Number.MAX_SAFE_INTEGER, step = 1, disabled = false, label = "value" }) => {
  const current = numberInRange(value, min, max);

  const stepBy = useCallback((e, delta) => {
    e.stopPropagation();
    const next = numberInRange(current + delta, min, max);
    if (next !== current) onChange(next);
  }, [current, min, max, onChange]);

  const decrease = useCallback((e) => stepBy(e, -step), [stepBy, step]);
  const increase = useCallback((e) => stepBy(e, step), [stepBy, step]);
  const stopClick = useCallback((e) => e.stopPropagation(), []);

  return (
    <div className="inline-flex items-center rounded-md border border-gray-300 bg-white" onClick={stopClick} role="group" aria-label={label}>
      <button
        type="button"
        onClick={decrease}
        disabled={disabled || current <= min}
        className={BUTTON_CLASS}
        title={`Decrease ${label}`}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[2rem] px-2 text-center text-sm font-medium tabular-nums" aria-live="polite">{current}</span>
      <button
        type="button"
        onClick={increase}
        disabled={disabled || current >= max}
        className={BUTTON_CLASS}
        title={`Increase ${label}`}
        aria-label={`Increase ${label}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

NumberStepper.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onChange: PropTypes.func.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  step: PropTypes.number,
  disabled: PropTypes.bool,
  label: PropTypes.string,
};

export { NumberStepper };
