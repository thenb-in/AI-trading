// Roles carry no display name, so title-case the machine one. A rule's
// audience wants the name alone — the description and company/global scope
// RoleSelector shows by default are noise when picking several at once.
const roleDisplayName = ({ name }) =>
  String(name).split(/[_\s-]+/).filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export { roleDisplayName };
