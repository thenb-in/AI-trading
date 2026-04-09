/**
 * Shared formatter: maps model instances to plain row objects using a field mapper,
 * and returns them alongside column metadata.
 */
function formatResponse(records, columns, mapRow) {
  const rows = records.map(record => {
    const data = record.toJSON ? record.toJSON() : record;
    return mapRow(data);
  });

  return { columns, data: rows };
}

module.exports = { formatResponse };
