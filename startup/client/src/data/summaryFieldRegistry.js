let headerFields = [];

const registerSummaryHeaderFields = (fields) => {
  headerFields = Array.isArray(fields) ? fields : [];
};

/** The registered header-field definitions (ordered). */
const getSummaryHeaderFields = () => headerFields;

/** Flat set of every raw key that belongs to a header field. */
const getSummaryHeaderFieldKeys = () =>
  new Set(headerFields.flatMap((f) => f.keys || []));

/** Display label for a raw key if it belongs to a header field, else undefined. */
const getSummaryHeaderLabel = (key) => {
  const match = headerFields.find((f) => (f.keys || []).includes(key));
  return match ? match.label : undefined;
};

export {
  registerSummaryHeaderFields,
  getSummaryHeaderFields,
  getSummaryHeaderFieldKeys,
  getSummaryHeaderLabel,
};
