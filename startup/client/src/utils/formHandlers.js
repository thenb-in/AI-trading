/**
 * Returns a controlled-input onChange handler that writes the field's value
 * (or its `checked` boolean for checkboxes) into the given setState updater
 * keyed by the input's `name` attribute. Use with a flat object form state.
 */
const buildFieldChangeHandler = (setState) => (e) => {
  const { name, value, type, checked } = e.target;
  setState((prev) => ({
    ...prev,
    [name]: type === 'checkbox' ? checked : value,
  }));
};

/**
 * Same idea for SearchableDropdown, which hands back the selected value rather
 * than an event — so the field name comes from the caller instead of `name`.
 * `transform` converts the dropdown's string value into whatever the form state
 * holds (e.g. `Number` for numeric ids).
 */
const buildDropdownChangeHandler = (setState, field, transform) => (value) => {
  setState((prev) => ({
    ...prev,
    [field]: transform ? transform(value) : value,
  }));
};

export { buildFieldChangeHandler, buildDropdownChangeHandler };
