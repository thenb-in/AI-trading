/**
 * Arranging permissions for the role and subscription screens.
 *
 * The server describes every permission it hands over: what kind it is
 * (`type`), what it belongs to (`group` — a master or a report) and what it
 * grants there (`operation`). Nothing here reads a permission's name to work
 * that out. It also says whether the constants still declare it (`declared`) —
 * a permission left behind by a build that dropped it is shown where its name
 * puts it, with a delete button; one whose name says nothing arrives as type
 * "other" and is listed on its own.
 */

// Which column of the master table an operation belongs under. Reading only
// your own Drive files is still reading, so it shares the Read column.
const MASTER_COLUMNS = {
  create: 'create',
  read: 'read',
  read_personal: 'read',
  update: 'update',
  delete: 'delete',
  approve: 'approve',
  deactivate: 'deactivate'
};

// Reports are read, viewed, downloaded or exported.
const REPORT_COLUMNS = {
  read: 'read',
  view: 'view',
  download: 'download',
  export: 'export'
};

const OPERATION_LABELS = {
  create: 'Create',
  read: 'Read/View',
  update: 'Update',
  delete: 'Delete',
  approve: 'Approve',
  deactivate: 'Deactivate',
  view: 'View',
  download: 'Download',
  export: 'Export',
  other: 'Other'
};

const UNGROUPED_REPORT = 'Other Reports';
const UNGROUPED_MASTER = 'Other';

/**
 * A permission that is both a module in its own right and a master's operation
 * — "View User Module" is how you read Users. The server marks it by giving a
 * module permission an operation. It is shown in both places, and ticking
 * either ticks the other, because it is one permission.
 */
const isLinkedPermission = (permission) => permission?.type === 'module' && Boolean(permission.operation);

/**
 * A permission no constant declares — a row a build left behind after dropping
 * the master, module or report that asked for it. The server marks it; nothing
 * here guesses from the name. It still grants what it always did, so it is
 * shown as usual, with a delete button beside it.
 */
const isUndeclaredPermission = (permission) => permission?.declared === false;

/** The undeclared ones out of a list, for the delete button to act on. */
const undeclaredPermissions = (permissions) => (permissions || []).filter(isUndeclaredPermission);

const addToGroup = (groups, groupName, permission) => {
  if (!groups[groupName]) {
    groups[groupName] = [];
  }
  groups[groupName].push(permission);
};

/** Sorted so a linked permission sits after the master's own ones. */
const byLinkedThenName = (a, b) => {
  if (isLinkedPermission(a) !== isLinkedPermission(b)) {
    return isLinkedPermission(a) ? 1 : -1;
  }
  return a.name.localeCompare(b.name);
};

/**
 * The four sections the screens draw: standalone modules, reports by report,
 * masters by master, and whatever nothing declares.
 */
function organizePermissions(permissions, companySubscriptions = null, userData = null) {
  const organized = { module: [], report: {}, master: {}, other: [] };
  const visible = companySubscriptions
    ? filterPermissionsBySubscription(permissions, companySubscriptions, userData)
    : (permissions || []);

  visible.forEach((permission) => {
    if (permission.type === 'module') {
      organized.module.push(permission);
    }
    if (permission.type === 'report') {
      addToGroup(organized.report, permission.group || UNGROUPED_REPORT, permission);
    }
    if (permission.type === 'master' || isLinkedPermission(permission)) {
      addToGroup(organized.master, permission.group || UNGROUPED_MASTER, permission);
    }
    if (permission.type === 'other') {
      organized.other.push(permission);
    }
  });

  organized.module.sort((a, b) => a.name.localeCompare(b.name));
  organized.other.sort((a, b) => a.name.localeCompare(b.name));
  Object.values(organized.report).forEach((group) => group.sort((a, b) => a.name.localeCompare(b.name)));
  Object.values(organized.master).forEach((group) => group.sort(byLinkedThenName));

  return organized;
}

/** Permissions of one master or report, under the column each belongs in. */
const groupPermissionsByOperation = (permissions, columns) => {
  const grouped = {};
  permissions.forEach((permission) => {
    const column = columns[permission.operation] || 'other';
    if (!grouped[column]) {
      grouped[column] = [];
    }
    grouped[column].push(permission);
  });
  return grouped;
};

const groupMasterPermissionsByOperation = (permissions) => groupPermissionsByOperation(permissions, MASTER_COLUMNS);
const groupReportPermissionsByOperation = (permissions) => groupPermissionsByOperation(permissions, REPORT_COLUMNS);

const getOperationDisplayName = (operation) => OPERATION_LABELS[operation] || operation;

/** What to call a permission on screen — the server sends the words. */
const getPermissionLabel = (permission) => permission?.display_name || permission?.name || '';

const isPermissionAssigned = (role, permission_id) =>
  Boolean(role?.permissions?.some((p) => p.id === permission_id));

/**
 * What this company's plans say about a permission. A company on several plans
 * takes the most generous answer: subscribed beats not subscribed, which beats
 * hidden.
 */
function statusAcrossSubscriptions(companySubscriptions, matches) {
  const statuses = (companySubscriptions || []).flatMap((subscription) =>
    (subscription.permissions || [])
      .filter((permission) => matches(permission) && permission.subscriptionStatus)
      .map((permission) => permission.subscriptionStatus));

  if (statuses.includes('subscribed')) return 'subscribed';
  if (statuses.includes('not_subscribed')) return 'not_subscribed';
  if (statuses.includes('hidden')) return 'hidden';
  return 'not_subscribed';
}

const getPermissionSubscriptionStatus = (companySubscriptions, permissionId) =>
  statusAcrossSubscriptions(companySubscriptions, (permission) => permission.id === permissionId);

/** The same answer for callers that hold the permission's name rather than its id. */
const getPermissionSubscriptionStatusByName = (companySubscriptions, permissionName) =>
  statusAcrossSubscriptions(companySubscriptions, (permission) => permission.name === permissionName);

/**
 * Drop the permissions a company's plans carry but do not show. Support staff
 * keep seeing them — hidden means bought-but-not-advertised, and they are the
 * ones who turn it on. With no subscriptions loaded nothing is dropped; the
 * screen shows everything disabled instead.
 */
function filterPermissionsBySubscription(permissions, companySubscriptions, userData = null) {
  if (!permissions || !companySubscriptions?.length) {
    return permissions || [];
  }
  return permissions.filter((permission) =>
    getPermissionSubscriptionStatus(companySubscriptions, permission.id) !== 'hidden'
    || userData?.isSupportUser === true);
}

/**
 * What a whole category adds up to for the role in hand: which of its
 * permissions this company's plan allows, how many are granted, and whether
 * every allowed one is granted. The count beside a category title and its
 * "Select All" control are both built from these, and so is the toggle itself,
 * so they cannot drift apart.
 */
const categoryTotals = (permissions, selectedRole, companySubscriptions) => {
  const subscribed = (permissions || []).filter((permission) =>
    getPermissionSubscriptionStatus(companySubscriptions, permission.id) === 'subscribed');

  return {
    subscribed,
    hasSubscribed: subscribed.length > 0,
    assignedCount: (permissions || []).filter((permission) =>
      isPermissionAssigned(selectedRole, permission.id)).length,
    allAssigned: subscribed.length > 0
      && subscribed.every((permission) => isPermissionAssigned(selectedRole, permission.id))
  };
};

const hasNoOrganizedPermissions = (organized) =>
  organized.module.length === 0 &&
  Object.keys(organized.report).length === 0 &&
  Object.keys(organized.master).length === 0 &&
  organized.other.length === 0;

export {
  organizePermissions,
  getPermissionLabel,
  groupMasterPermissionsByOperation,
  groupReportPermissionsByOperation,
  getOperationDisplayName,
  isPermissionAssigned,
  categoryTotals,
  isLinkedPermission,
  isUndeclaredPermission,
  undeclaredPermissions,
  getPermissionSubscriptionStatus,
  getPermissionSubscriptionStatusByName,
  hasNoOrganizedPermissions,
};
