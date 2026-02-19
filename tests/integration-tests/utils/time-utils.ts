/**
 * Convert time string (HH:MM) to total seconds
 * @param timeStr Time string in format HH:MM or HH:MM:SS
 * @returns Total seconds
 */
export function convertTimeToSeconds(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') {
    return 0;
  }

  const parts = timeStr.trim().split(':');
  if (parts.length < 2) {
    return 0;
  }

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parts.length > 2 ? parseInt(parts[2], 10) || 0 : 0;

  return (hours * 3600) + (minutes * 60) + seconds;
}
