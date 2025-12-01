/**
 * Organizes permissions by type (module, report, master)
 * and groups master permissions by entity
 */
export function organizePermissions(permissions) {
  if (!Array.isArray(permissions)) {
    return {
      module: [],
      report: {},
      master: {},
    };
  }

  const organized = {
    module: [],
    report: {},
    master: {},
  };

  permissions.forEach((permission) => {
    const type = permission.type?.toLowerCase();
    const name = permission.name.toLowerCase();

    // Infer type from name if not set
    let inferredType = type;
    if (!inferredType) {
      if (name.includes('_module') || (name.startsWith('view_') && !name.includes('report'))) {
        inferredType = 'module';
      } else if (name.includes('report') || name.startsWith('read_report') || name.startsWith('download_report') || name.startsWith('view_report') || name.startsWith('export_report')) {
        inferredType = 'report';
      } else if (name.match(/^(create|read|update|delete|approve|deactivate)_/)) {
        inferredType = 'master';
      }
    }

    if (inferredType === 'module') {
      organized.module.push(permission);
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
    } else {
      // If we can't determine type, try to infer from name patterns
      // Check if it looks like a master permission
      if (name.match(/^(create|read|update|delete|approve|deactivate)_/)) {
        const entity = extractEntityFromPermission(permission.name);
        if (!organized.master[entity]) {
          organized.master[entity] = [];
        }
        organized.master[entity].push(permission);
      } else {
        // Default to module for unknown types
        organized.module.push(permission);
      }
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
    organized.master[entity].sort((a, b) => a.name.localeCompare(b.name));
  });

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

