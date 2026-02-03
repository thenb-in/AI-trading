/**
 * Formatting utility functions
 */

/**
 * Format seconds into MM:SS format
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string
 */
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export { formatTime };

