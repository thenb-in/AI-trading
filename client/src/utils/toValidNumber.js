/**
 * Convert a value to a number if it looks like a valid integer or decimal.
 * Returns the original value unchanged if it cannot be converted.
 *
 * @param {*} value
 * @returns {number|*}
 */
const toValidNumber = (value) => {
  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    return value;
  }

  return value;
};

export { toValidNumber };
