/**
 * ExcelJS returns objects — not primitives — for several ordinary cell types:
 * hyperlinks ({ text, hyperlink }, which Excel creates automatically for any
 * typed email or URL), rich text ({ richText: [...] } when part of a cell is
 * styled differently), formulas ({ formula, result }) and error cells
 * ({ error: '#N/A' }). Calling toString() on those yields "[object Object]",
 * which then gets imported as the field value.
 *
 * Unwrap every cell value through this helper before using it.
 */
const getCellValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value.richText)) {
    return value.richText.map((part) => part?.text || '').join('');
  }

  // Hyperlink cell: the display text is what the user typed.
  if (value.text !== undefined) {
    return getCellValue(value.text);
  }

  // Formula / shared-formula cell: use the cached result, never the expression.
  if (value.formula !== undefined || value.sharedFormula !== undefined) {
    return getCellValue(value.result);
  }

  // Error cell (#N/A, #REF!, ...) carries no usable value.
  if (value.error !== undefined) {
    return null;
  }

  return value;
};

/** Same as getCellValue, but always returns a trimmed string ('' when empty). */
const getCellText = (value) => {
  const unwrapped = getCellValue(value);
  return unwrapped === null || unwrapped === undefined ? '' : String(unwrapped).trim();
};

module.exports = { getCellValue, getCellText };
