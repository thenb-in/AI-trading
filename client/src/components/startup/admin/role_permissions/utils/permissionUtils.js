import { getReportDisplayName } from '@data/getReportModules';

/**
 * Convert a snake_case or kebab-case string to Title Case
 * e.g. "role_permission" -> "Role Permission", "detailed-attendance" -> "Detailed Attendance"
 */
function toTitleCase(str) {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Organizes permissions by type (module, report, master)
 * and groups master permissions by entity
 * Also includes linked permissions (duplicates) in master section
 * @param {Array} permissions - Array of permissions to organize
 * @param {Array} companySubscriptions - Optional array of company subscriptions to filter hidden permissions
 * @param {Object} userData - Optional user data object with isSadmin flag
 */
function organizePermissions(permissions, companySubscriptions = null, userData = null) {
  if (!Array.isArray(permissions)) {
    return {
      module: [],
      report: {},
      master: {},
      other: [],
    };
  }

  // Filter out hidden permissions if subscriptions are provided
  // Exception: Show hidden permissions if user is superadmin and permission is global
  const filteredPermissions = companySubscriptions 
    ? filterPermissionsBySubscription(permissions, companySubscriptions, userData)
    : permissions;

  const organized = {
    module: [],
    report: {},
    master: {},
    other: [],
  };

  filteredPermissions.forEach((permission) => {
    const type = permission.type?.toLowerCase();
    const name = permission.name.toLowerCase();

    // Infer type from name - prioritize name pattern over type field
    // This ensures permissions like "create_company" are always categorized as master
    let inferredType = type;
    
    // Always check name patterns first, regardless of type field
    if (name.includes('_module') || (name.startsWith('view_') && !name.includes('report'))) {
      inferredType = 'module';
    } else if (name.includes('report') || name.startsWith('read_report') || name.startsWith('download_report') || name.startsWith('view_report') || name.startsWith('export_report')) {
      inferredType = 'report';
    } else if (name.match(/^(create|read|update|delete|approve|deactivate|reject|import)_/)) {
      inferredType = 'master';
    } else {
      // If no pattern matches, categorize as "other"
      inferredType = 'other';
    }

    if (inferredType === 'module') {
      organized.module.push(permission);
      
      // If this module permission is also used in master permissions, add it to master section
      if (isLinkedPermission(permission)) {
        const linkedContexts = getLinkedContexts(name);
        linkedContexts.forEach((context) => {
          const entityDisplay = convertContextToEntityDisplay(context);
          
          if (!organized.master[entityDisplay]) {
            organized.master[entityDisplay] = [];
          }
          
          // Check if this permission is already in the master section for this entity
          // We want to add it as a separate entry for the "read" operation
          const existingIndex = organized.master[entityDisplay].findIndex(
            (p) => p.id === permission.id && p._linkedContext === context
          );
          
          if (existingIndex === -1) {
            const linkedPermission = createLinkedPermissionObject(permission, context);
            organized.master[entityDisplay].push(linkedPermission);
          }
        });
      }
    } else if (inferredType === 'report') {
      // Group report permissions by report identifier
      // Try permission name first (for mapping), then display_name, then fall back to parsing
      const reportId = extractReportId(permission.name) || extractReportId(permission.display_name) || 'Other Reports';
      if (!organized.report[reportId]) {
        organized.report[reportId] = [];
      }
      organized.report[reportId].push(permission);
    } else if (inferredType === 'master') {
      // Extract entity name from permission name
      // e.g., "create_user" -> "user", "update_company" -> "company"
      const entity = extractEntityFromPermission(permission.name);
      if (!organized.master[entity]) {
        organized.master[entity] = [];
      }
      organized.master[entity].push(permission);
    } else if (inferredType === 'other') {
      // Handle "other" type permissions - store with full details for investigation
      // Store complete permission object with all available fields
      organized.other.push({
        id: permission.id,
        name: permission.name,
        display_name: permission.display_name || permission.name,
        description: permission.description || null,
        type: permission.type || 'other',
        originalType: type, // Store the original type field if it was set
        // Include any other fields that might be useful for investigation
        ...permission,
      });
    } else {
      // Fallback: if type is set but doesn't match any pattern, categorize as master with extracted entity
      const entity = extractEntityFromPermission(permission.name);
      if (!organized.master[entity]) {
        organized.master[entity] = [];
      }
      organized.master[entity].push(permission);
    }
  });

  // Sort module permissions
  organized.module.sort((a, b) => a.name.localeCompare(b.name));

  // Sort report groups and their permissions
  Object.keys(organized.report).forEach((reportId) => {
    organized.report[reportId].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Sort master entities and their permissions
  Object.keys(organized.master).forEach((entity) => {
    organized.master[entity].sort((a, b) => {
      // Sort linked permissions to appear after regular permissions
      if (a._isLinked && !b._isLinked) return 1;
      if (!a._isLinked && b._isLinked) return -1;
      return a.name.localeCompare(b.name);
    });
  });

  // Sort other permissions by name
  organized.other.sort((a, b) => a.name.localeCompare(b.name));

  return organized;
}

/**
 * Extracts report identifier from permission name
 * Uses the report permission name map from getReportModules.js for accurate mapping
 * Examples:
 * - "read_detailed-attendance-report" -> "Detailed Attendance Report"
 * - "read_checkin-checkout-report" -> "Check-in/Check-out Report"
 * - "read_report_1" -> "Report 1"
 * - "read_report-2" -> "Report 2"
 * - "view_report_user" -> "User Report"
 * - "read_user_report" -> "User Report"
 */
function extractReportId(permissionName) {
  if (!permissionName) return 'Other Reports';
  
  // Try to use the report permission name map first (most accurate)
  // This uses the permissionName mapping from getReportModules.js
  const mappedName = getReportDisplayName(permissionName);
  if (mappedName) {
    return mappedName;
  }
  
  // If display_name is provided and it's in format "Read <Report Name>", extract the report name
  // Example: "Read detailed-attendance-report" -> "Detailed Attendance Report"
  if (permissionName.toLowerCase().startsWith('read ')) {
    return toTitleCase(permissionName.substring(5));
  }
  
  // Pattern: read_<report-name-with-hyphens> (e.g., read_detailed-attendance-report)
  // This handles the server pattern: read_<report-name>
  const hyphenReportPattern = /^(?:read|download|view|export)_([a-z0-9-]+)$/i;
  const hyphenMatch = permissionName.match(hyphenReportPattern);
  
  if (hyphenMatch && hyphenMatch[1]) {
    return toTitleCase(hyphenMatch[1]);
  }
  
  // Pattern: read_user_report, read_company_report (entity between operation and _report)
  const entityBeforeReportPattern = /(?:read|download|view|export)_([a-z_]+)_report/i;
  const entityBeforeMatch = permissionName.match(entityBeforeReportPattern);
  
  if (entityBeforeMatch && entityBeforeMatch[1]) {
    return toTitleCase(entityBeforeMatch[1]) + ' Report';
  }
  
  // Pattern: read_report_1, download_report_1, view_report_1, export_report_1
  const reportPattern = /(?:read|download|view|export)_report[_\s]?(\d+|[a-z_]+)/i;
  const match = permissionName.match(reportPattern);
  
  if (match && match[1]) {
    if (/^\d+$/.test(match[1])) {
      return `Report ${match[1]}`;
    }
    return toTitleCase(match[1]) + ' Report';
  }

  // Pattern: report_1, report_2
  const simplePattern = /report[_\s]?(\d+|[a-z_]+)/i;
  const simpleMatch = permissionName.match(simplePattern);
  
  if (simpleMatch && simpleMatch[1]) {
    if (/^\d+$/.test(simpleMatch[1])) {
      return `Report ${simpleMatch[1]}`;
    }
    return toTitleCase(simpleMatch[1]) + ' Report';
  }

  // Default: use the permission name or a generic identifier
  return 'Other Reports';
}

/**
 * Extracts entity name from permission name
 * Examples:
 * - "create_user" -> "User"
 * - "update_company" -> "Company"
 * - "approve_user" -> "User"
 * - "read_role" -> "Role"
 */
function extractEntityFromPermission(permissionName) {
  if (!permissionName) return 'Other';

  // Common prefixes to remove (in order of specificity - longer first)
  const prefixes = [
    'deactivate_',
    'approve_',
    'reject_',
    'import_',
    'create_',
    'read_',
    'update_',
    'delete_',
    'view_',
  ];
  
  let entity = permissionName.toLowerCase();
  
  // Remove prefix
  for (const prefix of prefixes) {
    if (entity.startsWith(prefix)) {
      entity = entity.substring(prefix.length);
      break;
    }
  }

  // If no prefix matched, use the whole name
  if (entity === permissionName.toLowerCase()) {
    // Try to extract entity from common patterns
    const parts = entity.split('_');
    if (parts.length > 1) {
      // Take the last meaningful part as entity
      entity = parts[parts.length - 1];
    }
  }

  return toTitleCase(entity);
}

/**
 * Generic helper: groups permissions by a classifier function.
 * classifyFn(name) should return the category string for a given lowercase permission name.
 * Only returns groups that have at least one permission.
 */
function groupPermissionsByClassifier(permissions, classifyFn) {
  const grouped = {};
  permissions.forEach((permission) => {
    const category = classifyFn(permission.name.toLowerCase());
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(permission);
  });
  return grouped;
}

function groupMasterPermissionsByOperation(permissions) {
  return groupPermissionsByClassifier(permissions, (name) => {
    if (name.startsWith('create_')) return 'create';
    if (name.startsWith('read_') || name.startsWith('view_')) return 'read';
    if (name.startsWith('update_')) return 'update';
    if (name.startsWith('delete_')) return 'delete';
    if (name.startsWith('approve_')) return 'approve';
    if (name.startsWith('deactivate_')) return 'deactivate';
    return 'other';
  });
}

/**
 * Groups report permissions by operation type (view, download, export, etc.)
 */
function groupReportPermissionsByOperation(permissions) {
  return groupPermissionsByClassifier(permissions, (name) => {
    if (name.startsWith('view_report') || name.includes('view_report')) return 'view';
    if (name.startsWith('read_report') || name.includes('read_report') || (name.startsWith('read_') && name.endsWith('_report'))) return 'read';
    if (name.startsWith('download_report') || name.includes('download_report')) return 'download';
    if (name.startsWith('export_report') || name.includes('export_report')) return 'export';
    return 'other';
  });
}

/**
 * Gets display name for permission operation
 */
function getOperationDisplayName(operation) {
  const names = {
    create: 'Create',
    read: 'Read/View',
    update: 'Update',
    delete: 'Delete',
    approve: 'Approve',
    deactivate: 'Deactivate',
    view: 'View',
    download: 'Download',
    export: 'Export',
    other: 'Other',
  };
  return names[operation] || operation;
}

/**
 * Checks if a permission is assigned to a role
 */
function isPermissionAssigned(role, permission_id) {
  if (!role || !role.permissions) return false;
  return role.permissions.some((p) => p.id === permission_id);
}

/**
 * Maps permission names that are used in both module and master permissions
 * Key: module permission name, Value: array of master permission contexts where it appears
 */
const LINKED_PERMISSIONS_MAP = {
  'view_user_module': ['USER.read'],
  'view_company_settings': ['COMPANY.read'],
  'view_role_permission_module': ['ROLE_PERMISSION.read'],
};

/**
 * Gets linked contexts for a permission name
 * @param {string} permissionName - The permission name (case-insensitive)
 * @returns {string[]} Array of linked contexts, or empty array if not linked
 */
function getLinkedContexts(permissionName) {
  if (!permissionName) return [];
  const name = permissionName.toLowerCase();
  return LINKED_PERMISSIONS_MAP[name] || [];
}

/**
 * Converts a linked context to entity display name
 * @param {string} context - Context like "USER.read" or "ROLE_PERMISSION.read"
 * @returns {string} Entity display name like "User" or "Role Permission"
 */
function convertContextToEntityDisplay(context) {
  if (!context) return null;
  const entity = context.split('.')[0];
  return toTitleCase(entity);
}

/**
 * Creates a linked permission object with metadata
 * @param {Object} permission - The original permission object
 * @param {string} context - The linked context (e.g., "USER.read")
 * @returns {Object} Linked permission object with metadata
 */
function createLinkedPermissionObject(permission, context) {
  return {
    ...permission,
    _linkedContext: context,
    _isLinked: true,
    _originalDisplayName: permission.display_name || permission.name,
  };
}

/**
 * Checks if a permission is linked to other permissions
 * @param {Object} permission - The permission object to check
 * @returns {boolean} True if the permission is linked
 */
function isLinkedPermission(permission) {
  if (!permission) return false;
  const permissionName = permission.name?.toLowerCase();
  return permissionName ? getLinkedContexts(permissionName).length > 0 : false;
}

/**
 * Gets the display context for a linked permission in master section
 * e.g., "view_user_module" in USER.read context should show as "User - Read"
 * @param {string} permissionName - The permission name
 * @returns {string|null} The display context or null if not linked
 */
function getLinkedPermissionDisplayContext(permissionName) {
  const linkedContexts = getLinkedContexts(permissionName);
  if (linkedContexts.length === 0) return null;
  
  // Return the first context (there should typically be only one)
  const context = linkedContexts[0];
  return convertContextToEntityDisplay(context);
}

/**
 * Gets the subscription status for a permission from company subscriptions
 * Priority: subscribed > not_subscribed > hidden
 * @param {Array} companySubscriptions - Array of subscriptions with permissions
 * @param {number} permissionId - The permission ID
 * @returns {string} The status: 'subscribed', 'not_subscribed', or 'hidden'
 */
function getPermissionSubscriptionStatus(companySubscriptions, permissionId) {
  if (!companySubscriptions || !Array.isArray(companySubscriptions) || companySubscriptions.length === 0) {
    return 'not_subscribed';
  }

  const statuses = [];
  
  // Collect all statuses for this permission across all subscriptions
  companySubscriptions.forEach(subscription => {
    if (subscription.permissions && Array.isArray(subscription.permissions)) {
      const permission = subscription.permissions.find(p => p.id === permissionId);
      if (permission && permission.subscriptionStatus) {
        statuses.push(permission.subscriptionStatus);
      }
    }
  });

  if (statuses.length === 0) {
    return 'not_subscribed';
  }

  // Priority: subscribed > not_subscribed > hidden
  if (statuses.includes('subscribed')) {
    return 'subscribed';
  }
  if (statuses.includes('not_subscribed')) {
    return 'not_subscribed';
  }
  if (statuses.includes('hidden')) {
    return 'hidden';
  }

  return 'not_subscribed';
}

/**
 * Checks if a permission is from a global subscription
 * @param {Array} companySubscriptions - Array of subscriptions with permissions
 * @param {number} permissionId - The permission ID
 * @returns {boolean} True if the permission is from a global subscription
 */
function isPermissionFromGlobalSubscription(companySubscriptions, permissionId) {
  if (!companySubscriptions || !Array.isArray(companySubscriptions) || companySubscriptions.length === 0) {
    return false;
  }

  // Check if permission exists in any global subscription
  return companySubscriptions.some(subscription => {
    if (subscription.isGlobal && subscription.permissions && Array.isArray(subscription.permissions)) {
      return subscription.permissions.some(p => p.id === permissionId);
    }
    return false;
  });
}

/**
 * Filters permissions based on subscription status
 * Removes permissions with 'hidden' status
 * Exception: If user is superadmin, show hidden permissions (hidden means subscribed but hidden)
 * @param {Array} permissions - Array of permissions
 * @param {Array} companySubscriptions - Array of subscriptions with permissions
 * @param {Object} userData - User data object with isSadmin flag
 * @returns {Array} Filtered permissions array
 */
function filterPermissionsBySubscription(permissions, companySubscriptions, userData = null) {
  if (!permissions || !Array.isArray(permissions)) {
    return [];
  }

  if (!companySubscriptions || !Array.isArray(companySubscriptions) || companySubscriptions.length === 0) {
    // If no subscriptions, show all permissions (they'll be disabled)
    return permissions;
  }

  const isSuperAdmin = userData?.isSadmin === true;

  return permissions.filter(permission => {
    const status = getPermissionSubscriptionStatus(companySubscriptions, permission.id);
    
    // If permission is hidden
    if (status === 'hidden') {
      // Show hidden permission if user is superadmin (hidden means subscribed but hidden)
      if (isSuperAdmin) {
        return true;
      }
      // Otherwise, filter it out
      return false;
    }
    
    // Show all non-hidden permissions
    return true;
  });
}

/**
 * Checks if organized permissions has no entries in any category.
 */
function hasNoOrganizedPermissions(organized) {
  return organized.module.length === 0 &&
    Object.keys(organized.report).length === 0 &&
    Object.keys(organized.master).length === 0 &&
    (!organized.other || organized.other.length === 0);
}

export {
  organizePermissions,
  groupMasterPermissionsByOperation,
  groupReportPermissionsByOperation,
  getOperationDisplayName,
  isPermissionAssigned,
  isLinkedPermission,
  getLinkedPermissionDisplayContext,
  getPermissionSubscriptionStatus,
  filterPermissionsBySubscription,
  isPermissionFromGlobalSubscription,
  hasNoOrganizedPermissions,
};

