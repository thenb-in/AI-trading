const { masterKeyOf } = require('../utils/masterKey');
const { MASTERS } = require('./masters');
// Generic, framework-level permissions shared by every product built on
// startup (user, company, role, permission, role_permission, reports, masters,
// notifications), plus the factories used to declare permissions.
//
// Product-specific permissions live in the app layer, which composes
// them with these via `buildPermissionSets` in `./permissions`. startup never
// imports the app layer, so nothing here knows those permissions exist.
//
// Prefer `./permissions` over this file unless you specifically need only the
// framework set or a factory.

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
  VIEW_REPORT_MODULE: create_module_permission('report', 'Reports'),
  VIEW_USER_MODULE: create_module_permission('user', 'User'),
  VIEW_COMPANY_SETTINGS: {
    name: 'view_company_settings',
    display_name: 'View Company Settings',
    description: 'Permission to view company settings'
  },
  VIEW_MASTER_MODULE: create_module_permission('master', 'Masters'),
  VIEW_ROLE_PERMISSION_MODULE: create_module_permission('role_permission', 'Role Permission'),
  VIEW_HELP_AND_SUPPORT: {
    name: 'view_help_and_support',
    display_name: 'View Help & Support',
    description: 'Permission to view help and support'
  },
  VIEW_NOTIFICATION: {
    name: 'view_notification',
    display_name: 'View Notifications',
    description: 'Permission to view in-app notifications'
  },
  // A comment is someone's own words, and its author always takes it back. This
  // overrides that on any record of any master — moderating a discussion is one
  // job across the product, not one per master, so it is not a master's right.
  DELETE_COMMENT: {
    name: 'delete_comment',
    display_name: 'Delete Comment',
    description: 'Permission to delete a comment written by someone else, on any record'
  }
  // IS_ADMIN: {
  //   name: 'is_admin',
  //   display_name: 'isAdmin',
  //   description: 'Flag for admin-level access'
  // },
};



// Helper function to format display names: converts "gate_pass" to "Gate Pass"
const formatDisplayName = (text) => {
  return text
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const create_report_permission = (report) => {
  report = report.toLowerCase();
  const formattedReport = formatDisplayName(report);
  return {
    name: `read_${report}`,
    display_name: `Read ${formattedReport}`,
    description: `Permission to read ${formattedReport}`
  };
};


const REPORT_PERMISSION_CONSTANTS = {
  USER_REPORT: create_report_permission('user_report'),
  // The notification log carries the message bodies rules sent, so reading it is
  // granted separately from the ability to edit the rules themselves.
  NOTIFICATION_LOG_REPORT: create_report_permission('notification-log-report')
};



// `master` in words ("Sales Order"), from a masters constant; permissions spell it sales_order.
const create_master_permission = (master, approval_required = false) => {
  master = masterKeyOf(master);
  const formattedMaster = formatDisplayName(master);
  const permissions = {
    create: {
      name: `create_${master}`,
      display_name: `Create ${formattedMaster}`,
      description: `Permission to create ${formattedMaster}`
    },
    read: {
      name: `read_${master}`,
      display_name: `Read ${formattedMaster}`,
      description: `Permission to read ${formattedMaster}`
    },
    update: {
      name: `update_${master}`,
      display_name: `Update ${formattedMaster}`,
      description: `Permission to update ${formattedMaster}`
    },
    delete: {
      name: `delete_${master}`,
      display_name: `Delete ${formattedMaster}`,
      description: `Permission to delete ${formattedMaster}`
    },
    comment: {
      name: `comment_${master}`,
      display_name: `Comment ${formattedMaster}`,
      description: `Permission to comment on ${formattedMaster}`
    },
    attachment: {
      name: `attachment_${master}`,
      display_name: `Attachment ${formattedMaster}`,
      description: `Permission to manage attachments on ${formattedMaster}`
    }
  };
  if (approval_required) {
    permissions.approve = {
      name: `approve_${master}`,
      display_name: `Approve ${formattedMaster}`,
      description: `Permission to approve ${formattedMaster}`
    };
    permissions.reject = {
      name: `reject_${master}`,
      display_name: `Reject ${formattedMaster}`,
      description: `Permission to reject ${formattedMaster}`
    };
  }
  return permissions;
};



const MASTER_PERMISSION_CONSTANTS = {
  USER: {
    create: {
      name: 'create_user',
      display_name: 'Create User',
      description: 'Permission to create users'
    },
    read: MODULE_PERMISSION_CONSTANTS.VIEW_USER_MODULE,
    update: {
      name: 'update_user',
      display_name: 'Update User',
      description: 'Permission to update users'
    },
    delete: {
      name: 'delete_user',
      display_name: 'Delete User',
      description: 'Permission to delete user'
    },
    approve: {
      name: 'approve_user',
      display_name: 'Approve User',
      description: 'Permission to approve users'
    },
    deactivate: {
      name: 'deactivate_user',
      display_name: 'Deactivate User',
      description: 'Permission to deactivate user'
    }
  },

  COMPANY: {
    create: {
      name: 'create_company',
      display_name: 'Create Company',
      description: 'Permission to create companies'
    },
    read: MODULE_PERMISSION_CONSTANTS.VIEW_COMPANY_SETTINGS,
    update: {
      name: 'update_company',
      display_name: 'Update Company',
      description: 'Permission to update companies'
    },
    delete: {
      name: 'delete_company',
      display_name: 'Delete Company',
      description: 'Permission to delete company'
    }
  },

  // Logs are written and read, never edited or removed, so the master declares
  // only the two operations that exist. The client's Activity master has always
  // asked for these names; now the framework declares and enforces them.
  ACTIVITY: {
    create: {
      name: 'create_activity',
      display_name: 'Create Activity',
      description: 'Permission to write an activity log entry'
    },
    read: {
      name: 'read_activity',
      display_name: 'Read Activity',
      description: 'Permission to read activity logs'
    }
  },

  ROLE: create_master_permission(MASTERS.ROLE),

  PERMISSION: create_master_permission(MASTERS.PERMISSION),

  NOTIFICATION_RULE: create_master_permission(MASTERS.NOTIFICATION_RULE),

  NAMING_SERIES: create_master_permission(MASTERS.NAMING_SERIES),

  // The banner everyone reads is the master's; being SHOWN one is not, so
  // /announcements/active asks for none of these.
  ANNOUNCEMENT: create_master_permission(MASTERS.ANNOUNCEMENT),

  GEOGRAPHY: create_master_permission(MASTERS.GEOGRAPHY),

  // The drive ships with the framework, so its permissions live here rather
  // than in an app's set. read_personal_nbnext_drive scopes a user to the files
  // they uploaded; read_nbnext_drive widens that to the whole company and is the
  // `showAll` flag in nbnextDriveView.
  NBNEXT_DRIVE: {
    ...create_master_permission(MASTERS.NBNEXT_DRIVE),
    read_personal: {
      name: 'read_personal_nbnext_drive',
      display_name: 'Read Personal Nbnext Drive',
      description: 'Permission to read Nbnext Drive files uploaded by the user'
    },
    download: {
      name: 'download_nbnext_drive',
      display_name: 'Download Nbnext Drive',
      description: 'Permission to download Nbnext Drive files'
    }
  },

  ROLE_PERMISSION: {
    create: {
      name: 'create_role_permission',
      display_name: 'Create Role Permission',
      description: 'Permission to create role permission'
    },
    read: MODULE_PERMISSION_CONSTANTS.VIEW_ROLE_PERMISSION_MODULE,
    update: {
      name: 'update_role_permission',
      display_name: 'Update Role Permission',
      description: 'Permission to update role permission'
    },
    delete: {
      name: 'delete_role_permission',
      display_name: 'Delete Role Permission',
      description: 'Permission to delete role permission'
    }
  }
};

module.exports = {
  MODULE_PERMISSION_CONSTANTS,
  REPORT_PERMISSION_CONSTANTS,
  MASTER_PERMISSION_CONSTANTS,
  create_master_permission,
  create_module_permission,
  create_report_permission
};
