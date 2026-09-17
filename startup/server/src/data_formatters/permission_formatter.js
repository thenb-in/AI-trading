const { describePermission } = require('../constants/permissionCatalog');

/**
 * A permission row as the client reads it. The catalog says what the permission
 * is — its kind, what it belongs to and what it does there — so nothing
 * downstream has to read that back out of the name. The row supplies its id,
 * and its label for a permission the constants do not declare.
 */
const formatPermission = (permission) => {
  const row = permission.toJSON ? permission.toJSON() : permission;
  const described = describePermission(row.name);
  return {
    id: row.id,
    name: row.name,
    display_name: described.display_name || row.display_name || row.name,
    description: described.description || row.description || null,
    type: described.type,
    declared: described.declared,
    // What it belongs to (the master or report), and what it does there. Null
    // on a module permission that opens no master.
    group: described.group,
    operation: described.operation
  };
};

const formatPermissions = (permissions) => (permissions || []).map(formatPermission);

module.exports = { formatPermission, formatPermissions };
