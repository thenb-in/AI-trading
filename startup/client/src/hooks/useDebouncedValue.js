import { useEffect, useState } from 'react';

/**
 * The value as it settles: updates only once `value` has stopped changing for
 * `delay` ms. Use it to keep a fast-typing input responsive while the work it
 * triggers — a search request, a filter pass — runs once the user pauses.
 */
const useDebouncedValue = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

export { useDebouncedValue };
