const basePermissions = require('./base_permissions');
const baseRoles = require('./base_roles');



const SYSTEM_ROLE_CONSTANTS = baseRoles.SYSTEM_ROLE_CONSTANTS;

const MASTER_PERMISSION_CONSTANTS = {
  ...basePermissions.MASTER_PERMISSION_CONSTANTS,
  ACTIVITY: basePermissions.create_master_permission('activity'),
  NBNEXT_DRIVE: {
    create: {
      name: 'create_nbnext_drive',
      display_name: 'Create NBnext Drive',
      description: 'Permission to create files in NBnext Drive'
    },
    read: {
      name: 'read_nbnext_drive',
      display_name: 'Read All NBnext Drive',
      description: 'Permission to read all files in NBnext Drive'
    },
    readPersonal: {
      name: 'read_personal_nbnext_drive',
      display_name: 'Read Personal NBnext Drive',
      description: 'Permission to read personal files in NBnext Drive'
    },
    delete: {
      name: 'delete_nbnext_drive',
      display_name: 'Delete NBnext Drive',
      description: 'Permission to delete files from NBnext Drive'
    },
    download: {
      name: 'download_nbnext_drive',
      display_name: 'Download NBnext Drive',
      description: 'Permission to download files from NBnext Drive'
    }
  }
};

const create_module_permission = (module, displayName) => {
  const moduleKey = module.toLowerCase().replace(/-/g, '_');
  const formattedDisplayName = displayName || module.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  return {
    name: `view_${moduleKey}_module`,
    display_name: `View ${formattedDisplayName} Module`,
    description: `Permission to view ${formattedDisplayName.toLowerCase()} module`
  };
};

const MODULE_PERMISSION_CONSTANTS = {
  ...basePermissions.MODULE_PERMISSION_CONSTANTS
};

const REPORT_PERMISSION_CONSTANTS = {
  ...basePermissions.REPORT_PERMISSION_CONSTANTS
};


module.exports = {
  MODULE_PERMISSION_CONSTANTS,
  SYSTEM_ROLE_CONSTANTS,
  MASTER_PERMISSION_CONSTANTS,
  REPORT_PERMISSION_CONSTANTS,
  create_module_permission
};
