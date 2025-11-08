const MODULE_PERMISSION_CONSTANTS = {
  APPROVE_USER: {
    name: 'approve_user',
    display_name: 'Approve User',
    description: 'Permission to approve new users'
  },
  DEACTIVATE_USER: {
    name: 'deactivate_user',
    display_name: 'Deactivate User',
    description: 'Permission to deactivate users'
  },
  DELETE_USER: {
    name: 'delete_user',
    display_name: 'Delete User',
    description: 'Permission to delete users'
  },
  GET_COMPANY_SETTINGS: {
    name: 'get_company_settings',
    display_name: 'Get Company Settings',
    description: 'Permission to view company settings'
  },
  ADD_ROLE: {
    name: 'add_role',
    display_name: 'Add Role',
    description: 'Permission to add a new role'
  },
  LINK_ROLE_PERMISSION: {
    name: 'link_role_permission',
    display_name: 'Link Role Permission',
    description: 'Permission to map permissions to roles'
  },
  IS_ADMIN: {
    name: 'is_admin',
    display_name: 'isAdmin',
    description: 'Flag for admin-level access'
  },
  VIEW_COMPANY_SETTINGS: {
    name: 'view_company_settings',
    display_name: 'View Company Settings',
    description: 'Permission to view company settings'
  },
  VIEW_ADMIN_LAYOUT: {
    name: 'view_admin_layout',
    display_name: 'View AdminLayout',
    description: 'Permission to access admin layout view'
  },
  HAS_ROLE_PERMISSION: {
    name: 'has_role_permission',
    display_name: 'Has Role Permission',
    description: 'Permission for role and permission modules'
  },
  VIEW_USER_MODULE: {
    name: 'view_user_module',
    display_name: 'View User Module',
    description: 'Permission to view user module'
  },
  VIEW_COMPANY_MODULE: {
    name: 'view_company_module',
    display_name: 'View Company Module',
    description: 'Permission to view company module'
  },
  VIEW_ROLE_PERMISSION_MODULE: {
    name: 'view_role_permission_module',
    display_name: 'View Role Permission Module',
    description: 'Permission to view role permission module'
  },
  VIEW_REPORT_MODULE: {
    name: 'view_report_module',
    display_name: 'View Reports Module',
    description: 'Permission to view reports module'
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
  CREATE_COMPANY: {
    name: 'create_company',
    display_name: 'Create Company',
    description: 'Permission to create a new company'
  }
};


const SYSTEM_ROLE_CONSTANTS = {
  SUPER_ADMIN: {
    name: 'sadmin',
    display_name: 'Super Admin',
    description: 'Super Admin role'
  },
  ADMIN: {
    name: 'admin',
    display_name: 'Admin',
    description: 'Admin role'
  },
  USER: {
    name: 'user',
    display_name: 'User',
    description: 'User role'
  },
  COMPANY_ADMIN: {
    name: 'company_admin',
    display_name: 'Company Admin',
    description: 'Company Admin role'
  },
  COMPANY_USER: {
    name: 'company_user',
    display_name: 'Company User',
    description: 'Company User role'
  }
};

module.exports = {
  MODULE_PERMISSION_CONSTANTS,
  SYSTEM_ROLE_CONSTANTS
};
