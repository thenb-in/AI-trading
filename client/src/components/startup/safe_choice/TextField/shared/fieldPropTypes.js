import PropTypes from 'prop-types';

/**
 * Common propTypes used by most TextField type components.
 * Keeping this centralized reduces redundancy and keeps types consistent.
 */
const commonFieldPropTypes = {
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
  otpLength: PropTypes.number,
  showClearButton: PropTypes.bool,
  icon: PropTypes.node,
  sanitize: PropTypes.bool,
};

export { commonFieldPropTypes };


