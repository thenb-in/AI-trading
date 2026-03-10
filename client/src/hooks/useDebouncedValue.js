import { useState, useEffect } from 'react';

/**
 * Returns a debounced value that updates after `delay` ms of no changes to `value`.
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {*} - The debounced value
 */
function useDebouncedValue(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Returns a setter that updates state immediately and a debounced value for use in effects/API calls.
 * @param {*} initialValue - Initial value
 * @param {number} delay - Delay in milliseconds
 * @returns {[*, *, Function]} - [value, debouncedValue, setValue]
 */
function useDebouncedState(initialValue, delay) {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebouncedValue(value, delay);
  return [value, debouncedValue, setValue];
}

export { useDebouncedValue, useDebouncedState };
