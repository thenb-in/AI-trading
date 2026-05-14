const toValidNumber = (value) => {
  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Check if it's a valid number (integer or decimal)
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }

    return value; // return original string if invalid
  }

  return value;
};

export { toValidNumber };