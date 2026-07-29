/**
 * Shared formatter: maps model instances to plain row objects using a field mapper,
 * and returns them alongside column metadata.
 */

/** A model instance or an already-plain object, as a plain object either way. */
function plain(record) {
  return record && record.toJSON ? record.toJSON() : record;
}

/** An association that may be missing, as a list either way. */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatResponse(records, columns, mapRow) {
  return { columns, data: records.map((record) => mapRow(plain(record))) };
}

module.exports = { formatResponse, plain, asArray };
