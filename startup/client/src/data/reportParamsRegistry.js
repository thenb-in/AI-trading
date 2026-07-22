let resolveParams = null;

const registerReportParamsResolver = (resolver) => {
  resolveParams = typeof resolver === "function" ? resolver : null;
};

/**
 * Resolve request params for a report. Falls back to passing the filters
 * through unchanged when the app registered no resolver.
 */
const resolveReportParams = (slug, filters = {}) =>
  resolveParams ? resolveParams(slug, filters) : filters;

export { registerReportParamsResolver, resolveReportParams };
