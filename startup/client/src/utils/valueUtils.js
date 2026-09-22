/** True when nothing was entered: an empty string, null or undefined. 0 and false are values. */
const isEmptyValue = (value) => value === '' || value === null || value === undefined;

/** The entered value as a number, or `defaultValue` when nothing was entered. */
const toNumberOrDefault = (value, defaultValue) => (isEmptyValue(value) ? defaultValue : Number(value));

/** `value` held inside `min`..`max`. */
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export { clamp, isEmptyValue, toNumberOrDefault };
