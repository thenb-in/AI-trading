/**
 * Organizes permissions by type (module, report, master)
 * and groups master permissions by entity
 * Also includes linked permissions (duplicates) in master section
 */
export function organizePermissions(permissions) {
  if (!Array.isArray(permissions)) {
    return {
      module: [],
      report: {},
      master: {},
      other: [],
    };
  }

  const organized = {
    module: [],
    report: {},
    master: {},
    other: [],
  };

  permissions.forEach((permission) => {
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
    } else if (name.match(/^(create|read|update|delete|approve|deactivate)_/)) {
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
      const reportId = extractReportId(permission.name);
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
 * Examples:
 * - "read_report_1" -> "Report 1"
 * - "download_report_2" -> "Report 2"
 * - "view_report_user" -> "User Report"
 * - "read_report_1" -> "Report 1"
 */
function extractReportId(permissionName) {
  if (!permissionName) return 'Other Reports';
  
  // Pattern: read_report_1, download_report_1, view_report_1, export_report_1
  const reportPattern = /(?:read|download|view|export)_report[_\s]?(\d+|[a-z_]+)/i;
  const match = permissionName.match(reportPattern);
  
  if (match && match[1]) {
    const reportNum = match[1];
    // If it's a number, format as "Report 1", "Report 2", etc.
    if (/^\d+$/.test(reportNum)) {
      return `Report ${reportNum}`;
    }
    // If it's a name, format it nicely
    return reportNum
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') + ' Report';
  }

  // Pattern: report_1, report_2
  const simplePattern = /report[_\s]?(\d+|[a-z_]+)/i;
  const simpleMatch = permissionName.match(simplePattern);
  
  if (simpleMatch && simpleMatch[1]) {
    const reportNum = simpleMatch[1];
    if (/^\d+$/.test(reportNum)) {
      return `Report ${reportNum}`;
    }
    return reportNum
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') + ' Report';
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

  // Convert to title case for display
  return entity
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Groups master permissions by operation type (CRUD, approve, etc.)
 */
export function groupMasterPermissionsByOperation(permissions) {
  const grouped = {
    create: [],
    read: [],
    update: [],
    delete: [],
    approve: [],
    deactivate: [],
    other: [],
  };

  permissions.forEach((permission) => {
    const name = permission.name.toLowerCase();
    
    if (name.startsWith('create_')) {
      grouped.create.push(permission);
    } else if (name.startsWith('read_') || name.startsWith('view_')) {
      grouped.read.push(permission);
    } else if (name.startsWith('update_')) {
      grouped.update.push(permission);
    } else if (name.startsWith('delete_')) {
      grouped.delete.push(permission);
    } else if (name.startsWith('approve_')) {
      grouped.approve.push(permission);
    } else if (name.startsWith('deactivate_')) {
      grouped.deactivate.push(permission);
    } else {
      grouped.other.push(permission);
    }
  });

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(grouped).filter(([, perms]) => perms.length > 0)
  );
}

/**
 * Groups report permissions by operation type (view, download, export, etc.)
 */
export function groupReportPermissionsByOperation(permissions) {
  const grouped = {
    view: [],
    read: [],
    download: [],
    export: [],
    other: [],
  };

  permissions.forEach((permission) => {
    const name = permission.name.toLowerCase();
    
    if (name.startsWith('view_report') || name.includes('view_report')) {
      grouped.view.push(permission);
    } else if (name.startsWith('read_report') || name.includes('read_report')) {
      grouped.read.push(permission);
    } else if (name.startsWith('download_report') || name.includes('download_report')) {
      grouped.download.push(permission);
    } else if (name.startsWith('export_report') || name.includes('export_report')) {
      grouped.export.push(permission);
    } else {
      grouped.other.push(permission);
    }
  });

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(grouped).filter(([, perms]) => perms.length > 0)
  );
}

/**
 * Gets display name for permission operation
 */
export function getOperationDisplayName(operation) {
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
export function isPermissionAssigned(role, permissionId) {
  if (!role || !role.permissions) return false;
  return role.permissions.some((p) => p.id === permissionId);
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
  const entityLower = entity.toLowerCase();
  // Convert "ROLE_PERMISSION" to "Role Permission" format
  return entityLower
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
export function isLinkedPermission(permission) {
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
export function getLinkedPermissionDisplayContext(permissionName) {
  const linkedContexts = getLinkedContexts(permissionName);
  if (linkedContexts.length === 0) return null;
  
  // Return the first context (there should typically be only one)
  const context = linkedContexts[0];
  return convertContextToEntityDisplay(context);
}

