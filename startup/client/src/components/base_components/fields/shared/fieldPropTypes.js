import PropTypes from 'prop-types';

/**
 * Common propTypes used by most TextField type components.
 * Keeping this centralized reduces redundancy and keeps types consistent.
 */
const commonFieldPropTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  checked: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  label: PropTypes.string,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  inputRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  mode: PropTypes.oneOf(['default', 'bare']),
  wrapperClassName: PropTypes.string,
  labelTextClassName: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string,
  autoFocus: PropTypes.bool,
  maxLength: PropTypes.number,
  minLength: PropTypes.number,
  rows: PropTypes.number,
  otpLength: PropTypes.number,
  showClearButton: PropTypes.bool,
  icon: PropTypes.node,
  sanitize: PropTypes.bool,

  // Number-specific (used by NumberTypeField)
  // min/max also used by date/datetime-local inputs (as strings), so allow both.
  min: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  max: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  step: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  numberMode: PropTypes.oneOf(['int', 'float']),
  allowNegative: PropTypes.bool,
  precision: PropTypes.number,
  clamp: PropTypes.bool,

  // File-specific (used by FileTypeField)
  accept: PropTypes.string,
  multiple: PropTypes.bool,
  capture: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
};

export { commonFieldPropTypes };


