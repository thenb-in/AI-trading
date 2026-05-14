/** Wraps a scalar into the array shape `SearchableDropdown` expects for single-select. */
const singleSelectValues = (value) =>
  value !== undefined && value !== null && value !== '' ? [value] : [];

export { singleSelectValues };
