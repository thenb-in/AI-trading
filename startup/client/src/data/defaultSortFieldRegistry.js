let defaultSortFields = [];

const registerDefaultSortFields = (fields) => {
  defaultSortFields = Array.isArray(fields) ? fields : [];
};

/** The app-registered fallback sort fields (ordered). */
const getDefaultSortFields = () => defaultSortFields;

export { registerDefaultSortFields, getDefaultSortFields };
