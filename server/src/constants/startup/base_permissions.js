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




const REPORT_PERMISSION_CONSTANTS = {
  USER_REPORT: {
    name: 'read_report_1',
    display_name: 'Read Report 1',
    description: 'Permission to read report 1'
  }
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

  ROLE: {
    create: {
      name: 'create_role',
      display_name: 'Create Role',
      description: 'Permission to create roles'
    },
    read: {
      name: 'read_role',
      display_name: 'Read Role',
      description: 'Permission to read roles'
    },
    update: {
      name: 'update_role',
      display_name: 'Update Role',
      description: 'Permission to update roles'
    },
    delete: {
      name: 'delete_role',
      display_name: 'Delete Role',
      description: 'Permission to delete role'
    }
  },

  PERMISSION: {
    create: {
      name: 'create_permission',
      display_name: 'Create Permission',
      description: 'Permission to create permissions'
    },
    read: {
      name: 'read_permission',
      display_name: 'Read Permission',
      description: 'Permission to read permissions'
    },
    update: {
      name: 'update_permission',
      display_name: 'Update Permission',
      description: 'Permission to update permissions'
    },
    delete: {
      name: 'delete_permission',
      display_name: 'Delete Permission',
      description: 'Permission to delete permission'
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
  MASTER_PERMISSION_CONSTANTS
};
