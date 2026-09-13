/**
 * Base input classes shared by BaseInputField-derived components.
 * Keeps styling consistent across all TextField types.
 */

function getBaseInputClasses({ error, disabled, readOnly, className }) {
  const border = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300';
  // Read-only fields are filled in for the user (backend-generated codes, computed
  // totals), so they read greyed-out like disabled ones — but the value stays
  // selectable and copyable, it just cannot be typed into.
  const bg = (disabled && 'bg-gray-100 cursor-not-allowed opacity-60')
    || (readOnly && 'bg-gray-100 text-gray-500 cursor-default')
    || 'bg-white text-gray-800';
  return `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-150 ${border} ${bg} ${className || ''}`.trim();
}

export { getBaseInputClasses };
