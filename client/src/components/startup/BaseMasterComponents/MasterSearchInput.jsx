import PropTypes from 'prop-types';
import { TextField } from '@startup/safe_choice';

const MasterSearchInput = ({ value, onChange, placeholder = 'Search...', className = '', autoFocus = false }) => {
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div className={`w-full md:max-w-sm ${className}`}>
      <TextField
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="text-sm"
      />
    </div>
  );
};

MasterSearchInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  autoFocus: PropTypes.bool,
};

export { MasterSearchInput };

