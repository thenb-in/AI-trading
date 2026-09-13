import { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

// `indeterminate` is a DOM property, not an attribute — it must be set imperatively.
function TreeCheckbox({ checked = false, indeterminate = false, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.indeterminate = !checked && indeterminate;
  }, [checked, indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
    />
  );
}

TreeCheckbox.propTypes = {
  checked: PropTypes.bool,
  indeterminate: PropTypes.bool,
  onChange: PropTypes.func,
};

export { TreeCheckbox };
