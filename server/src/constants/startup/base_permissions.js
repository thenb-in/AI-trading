
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
  VIEW_DASHBOARD_MODULE: create_module_permission('dashboard', 'Dashboards'),
  VIEW_ROLE_PERMISSION_MODULE: create_module_permission('role_permission', 'Role Permission'),
  VIEW_HELP_AND_SUPPORT: {
    name: 'view_help_and_support',
    display_name: 'View Help & Support',
    description: 'Permission to view help and support'
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
  USER_REPORT: create_report_permission('user_report')
};



const create_master_permission = (master, approval_required = false) => {
  master = master.toLowerCase();
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

  ROLE: create_master_permission('role'),

  PERMISSION: create_master_permission('permission'),

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
  create_report_permission
};
