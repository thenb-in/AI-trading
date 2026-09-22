import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { MasterSearch } from '../master/MasterSearch';


const DEFAULT_DELAY_MS = 400;


const DebouncedSearchField = ({
  value = '',
  onChange,
  delayMs = DEFAULT_DELAY_MS,
  placeholder = 'Search...',
  className = '',
  autoFocus = false
}) => {
  const [text, setText] = useState(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const reportedRef = useRef(value);

  useEffect(() => {
    if (value !== reportedRef.current) {
      reportedRef.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === reportedRef.current) {
      return;
    }
    const handle = setTimeout(() => {
      reportedRef.current = trimmed;
      onChangeRef.current(trimmed);
    }, delayMs);
    return () => clearTimeout(handle);
  }, [text, delayMs]);

  return (
    <MasterSearch
      value={text}
      onChange={setText}
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
    />
  );
};

DebouncedSearchField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  delayMs: PropTypes.number,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  autoFocus: PropTypes.bool
};

export { DebouncedSearchField };
