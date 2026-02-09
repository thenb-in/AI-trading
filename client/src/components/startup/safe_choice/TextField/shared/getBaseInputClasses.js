/**
 * Shared Tailwind class builder for inputs/textarea.
 * Keeps styling consistent across all TextField types.
 */

function getBaseInputClasses({ error, disabled, className }) {
  const border = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300';
  const bg = disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white text-gray-800';
  return `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${border} ${bg} ${className || ''}`.trim();
}

export { getBaseInputClasses };


