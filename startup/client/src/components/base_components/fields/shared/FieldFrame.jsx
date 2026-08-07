import PropTypes from 'prop-types';

/**
 * Shared wrapper for label + required marker + hint/error text.
 * Types can render their own input/textarea inside.
 *
 * `hint` is guidance under the field — a unit spelled out, a format example, a
 * live interpretation of what was typed. An error replaces it while present, so
 * the two never stack.
 */
function FieldFrame({ inputId, label, required, disabled = false, hint, error, errorId, children, className = '' }) {
  return (
    <div className={`w-full ${className}`.trim()}>
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required ? <span className="text-red-500 ml-1">*</span> : null}
          {disabled ? <span className="text-gray-500 ml-1 font-normal">(Read Only)</span> : null}
        </label>
      ) : null}

      {children}

      {error ? <p id={errorId} className="mt-1 text-sm text-red-500">{error}</p> : null}
      {!error && hint ? <p className="mt-1 pl-1 text-xs text-blue-600">{hint}</p> : null}
    </div>
  );
}

FieldFrame.propTypes = {
  inputId: PropTypes.string,
  label: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  hint: PropTypes.node,
  error: PropTypes.string,
  errorId: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export { FieldFrame };


