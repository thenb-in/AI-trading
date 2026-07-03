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

module.exports = {
  normalizeCoordinate,
  normalizeRadiusMeters
};
