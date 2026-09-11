// Helpers for location coordinates (decimal degrees) and geofence radius.

const normalizeCoordinate = (value, min, max, label) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  const n = Number(value);
  if (Number.isNaN(n) || n < min || n > max) {
    throw new Error(`Invalid ${label}: ${value}. Must be between ${min} and ${max}.`);
  }
  return n;
};

// Geofence radius in meters. undefined/null/'' => undefined (leave unchanged; the
// column is NOT NULL with a default), else a positive whole number or throws.
const normalizeRadiusMeters = (value, label = 'geofence radius') => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Invalid ${label}: ${value}. Must be a positive whole number of meters.`);
  }
  return n;
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * Great-circle distance between two decimal-degree coordinates, in kilometres.
 */
const distanceKm = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Same distance in metres. Both units are exported so no caller has to remember
 *  which one it got and multiply at the call site — the unit is in the name. */
const distanceMeters = (lat1, lon1, lat2, lon2) => distanceKm(lat1, lon1, lat2, lon2) * 1000;

module.exports = {
  normalizeCoordinate,
  normalizeRadiusMeters,
  distanceKm,
  distanceMeters
};
