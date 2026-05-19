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

export { buildFieldChangeHandler };
