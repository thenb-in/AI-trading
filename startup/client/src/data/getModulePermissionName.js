/**
 * The canonical permission name that gates a navigator definition — an app
 * module, report or master from the @data definitions.
 *
 * This is the SINGLE SOURCE OF TRUTH for that rule. The navigator
 * (useNavigatorData), the Masters page, the report list, the global search
 * palette, the master-category helper and the onboarding plan-feature preview
 * all derive the gating permission by calling this — so the rule lives in
 * exactly one place instead of being copy-pasted across the app.
 *
 * Rule: an explicit `permissionName` wins; otherwise `read_<id>`; and when a
 * definition carries no id, `read_<title>` with the title lower-cased and
 * spaces turned into underscores.
 */
const getModulePermissionName = (definition) => {
  if (!definition) return '';
  if (definition.permissionName) return definition.permissionName;
  if (definition.id) return `read_${definition.id}`;
  return `read_${String(definition.title || '')
    .toLowerCase()
    .trim()
    .replace(/ /g, '_')}`;
};

export { getModulePermissionName };
