const MODULE_PERMISSION_CONSTANTS = {
  VIEW_REPORT_MODULE: {
    name: 'view_report_module',
    display_name: 'View Reports Module',
    description: 'Permission to view reports module'
  },
  VIEW_USER_MODULE: {
    name: 'view_user_module',
    display_name: 'View User Module',
    description: 'Permission to view user module'
  },
  VIEW_COMPANY_SETTINGS: {
    name: 'view_company_settings',
    display_name: 'View Company Settings',
    description: 'Permission to view company settings'
  },
  VIEW_MASTER_MODULE: {
    name: 'view_master_module',
    display_name: 'View Masters Module',
    description: 'Permission to view masters module'
  },
  VIEW_DASHBOARD_MODULE: {
    name: 'view_dashboard_module',
    display_name: 'View Dashboards Module',
    description: 'Permission to view dashboards module'
  },
  VIEW_ROLE_PERMISSION_MODULE: {
    name: 'view_role_permission_module',
    display_name: 'View Role Permission Module',
    description: 'Permission to view role permission module'
  }
  // IS_ADMIN: {
  //   name: 'is_admin',
  //   display_name: 'isAdmin',
  //   description: 'Flag for admin-level access'
  // },
};


const create_report_permission = (report) => {
  report = report.toLowerCase();
  return {
    name: `read_${report}`,
    display_name: `Read ${report}`,
    description: `Permission to read ${report}`
  };
};


const REPORT_PERMISSION_CONSTANTS = {
  USER_REPORT: create_report_permission('user_report')
};



const create_master_permission = (master, approval_required = false) => {
  master = master.toLowerCase();
  const permissions = {
    create: {
      name: `create_${master}`,
      display_name: `Create ${master}`,
      description: `Permission to create ${master}`
    },
    read: {
      name: `read_${master}`,
      display_name: `Read ${master}`,
      description: `Permission to read ${master}`
    },
    update: {
      name: `update_${master}`,
      display_name: `Update ${master}`,
      description: `Permission to update ${master}`
    },
    delete: {
      name: `delete_${master}`,
      display_name: `Delete ${master}`,
      description: `Permission to delete ${master}`
    }
  };
  if (approval_required) {
    permissions.approve = {
      name: `approve_${master}`,
      display_name: `Approve ${master}`,
      description: `Permission to approve ${master}`
    };
    permissions.reject = {
      name: `reject_${master}`,
      display_name: `Reject ${master}`,
      description: `Permission to reject ${master}`
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
