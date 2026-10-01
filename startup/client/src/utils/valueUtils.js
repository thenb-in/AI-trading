/** True when nothing was entered: an empty string, null or undefined. 0 and false are values. */
const isEmptyValue = (value) => value === '' || value === null || value === undefined;

/** The entered value as a number, or `defaultValue` when nothing was entered. */
const toNumberOrDefault = (value, defaultValue) => (isEmptyValue(value) ? defaultValue : Number(value));

/** `value` held inside `min`..`max`. */
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/** `value` as a number held inside `min`..`max`; anything that is not a finite number reads as `min`. */
const numberInRange = (value, min, max) => {
  const number = Number(value);
  return clamp(Number.isFinite(number) ? number : min, min, max);
};

export { clamp, isEmptyValue, toNumberOrDefault, numberInRange };
