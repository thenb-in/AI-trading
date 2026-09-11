// API shapes to dropdown shapes: show the label, send the value.

const toPermissionOptions = (permissions = []) =>
  permissions.map(({ name, display_name: displayName }) => ({
    value: name,
    label: displayName || name
  }));

// Roles carry no display name, so title-case the machine one.
const toRoleOptions = (roles = []) =>
  roles.map(({ id, name }) => ({
    value: String(id),
    label: String(name).split(/[_\s-]+/).filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }));

const toUserOptions = (users = []) =>
  users.map(({ id, name, username }) => ({ value: String(id), label: name || username }));

export { toPermissionOptions, toRoleOptions, toUserOptions };
