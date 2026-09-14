import { forwardRef } from 'react';
import { Search } from 'lucide-react';
import PropTypes from 'prop-types';
import { TextTypeField } from '../fields/TextTypeField';

// A master list's search box: the text field with a search icon and a clear button.
const MasterSearch = forwardRef(({ value, onChange, placeholder = 'Search...', className = '', autoFocus = false }, ref) => (
  <TextTypeField
    inputRef={ref}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    autoFocus={autoFocus}
    icon={<Search className="h-4 w-4 text-gray-400" />}
    showClearButton
    className="!text-sm"
    containerClassName={`md:max-w-sm ${className}`}
  />
));

MasterSearch.displayName = 'MasterSearch';

MasterSearch.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  autoFocus: PropTypes.bool,
};

export { MasterSearch };
