// Shared filter helpers used across server-side code.

/**
 * Whether debug mode is enabled for the given filters.
 */
function isDebugMode(filters = {}) {
  return filters?.is_debug_mode === true || filters?.is_debug_mode === 'true';
}

module.exports = {
  isDebugMode
};
