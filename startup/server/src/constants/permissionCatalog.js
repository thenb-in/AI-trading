// What each permission IS, by name: its kind, what it belongs to, and the
// operation it grants. The permission constants already say all of this — a
// master's CRUD entries sit under its key, a report's under the report's — so
// nothing has to read it back out of the name later. The client used to
// re-derive all of it with regexes over `read_nbnext_drive`; now it is told.
//
// startup never imports the app layer, so the app registers its composed sets
// at boot (see app/server/src/data/registerAppData.js), the same way it
// registers activity types and report routers. The framework's own set
// registers itself here, so startup standalone still has a full catalog.

const basePermissions = require('./base_permissions');

const PERMISSION_TYPE = {
  MODULE: 'module',
  MASTER: 'master',
  REPORT: 'report',
  // A permission in the database that no constant declares — nothing can say
  // what it is, so it is shown on its own for someone to clean up.
  OTHER: 'other'
};

/** "role_permission" / "daily-sales-report" -> "Role Permission" / "Daily Sales Report". */
const inWords = (key) => key
  .split(/[-_]/)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  .join(' ');

const catalog = new Map();

/**
 * One permission's entry. A name declared twice — `view_user_module` is both a
 * module permission and USER.read — takes the module kind and keeps the
 * master's group and operation. Carrying an operation is what marks it as a
 * master's too, and what puts it on both screens.
 */
const describe = (permission, { type, group = null, operation = null }) => {
  const existing = catalog.get(permission.name);
  catalog.set(permission.name, {
    name: permission.name,
    display_name: permission.display_name || inWords(permission.name),
    description: permission.description || null,
    type,
    group: existing?.group || group,
    operation: existing?.operation || operation
  });
};

const registerPermissionSets = ({
  MODULE_PERMISSION_CONSTANTS = {},
  MASTER_PERMISSION_CONSTANTS = {},
  REPORT_PERMISSION_CONSTANTS = {}
} = {}) => {
  // Masters first: a name that is also a module permission then keeps its
  // entity and operation when the module pass overwrites its kind.
  Object.entries(MASTER_PERMISSION_CONSTANTS).forEach(([masterKey, master]) => {
    Object.entries(master).forEach(([operation, permission]) => {
      if (permission?.name) {
        describe(permission, { type: PERMISSION_TYPE.MASTER, group: inWords(masterKey), operation });
      }
    });
  });

  Object.entries(REPORT_PERMISSION_CONSTANTS).forEach(([reportKey, permission]) => {
    if (permission?.name) {
      describe(permission, {
        type: PERMISSION_TYPE.REPORT,
        group: inWords(reportKey),
        operation: permission.name.split('_')[0]
      });
    }
  });

  // A module's group is what it opens — "View Master Module" belongs to Master.
  Object.entries(MODULE_PERMISSION_CONSTANTS).forEach(([moduleKey, permission]) => {
    if (permission?.name) {
      describe(permission, {
        type: PERMISSION_TYPE.MODULE,
        group: inWords(moduleKey.replace(/^VIEW_/, '').replace(/_MODULE$/, ''))
      });
    }
  });
};

// Every permission name the constants build reads as <operation>_<what>, with
// a module's ending in _module or opening with view_. A name the constants do
// not declare — one made on the permission screen, or left in the database by
// a build that has since dropped it — still follows that shape, so the name
// itself is enough to file it under the right master or report instead of
// dumping it in a heap called "other".
const NAMED_OPERATION = /^(create|read|update|delete|approve|reject|import|deactivate|download|export|view|comment|attachment)_(.+)$/;

const derive = (name) => {
  const match = name.match(NAMED_OPERATION);
  if (!match) {
    return { type: PERMISSION_TYPE.OTHER, group: null, operation: null };
  }

  const [, operation, subject] = match;
  if (operation === 'view' || subject.endsWith('_module')) {
    return { type: PERMISSION_TYPE.MODULE, group: inWords(subject.replace(/_module$/, '')), operation: null };
  }
  return {
    type: subject.includes('report') ? PERMISSION_TYPE.REPORT : PERMISSION_TYPE.MASTER,
    group: inWords(subject),
    operation
  };
};

/**
 * What this permission is: what the constants declare, or what its name says
 * for one they do not. An undeclared permission brings no words of its own —
 * the database row keeps whatever label it was created with — and is marked as
 * such, so the role screen can offer to delete the row nothing asks for.
 */
const describePermission = (name) => {
  const declared = catalog.get(name);
  return declared
    ? { ...declared, declared: true }
    : { name, declared: false, ...derive(name) };
};

/** Whether the constants still ask for this permission. */
const isDeclaredPermission = (name) => catalog.has(name);

/** Every declared permission, for the seeder to create. */
const declaredPermissions = () => [...catalog.values()];

registerPermissionSets(basePermissions);

module.exports = {
  PERMISSION_TYPE,
  registerPermissionSets,
  describePermission,
  isDeclaredPermission,
  declaredPermissions
};
