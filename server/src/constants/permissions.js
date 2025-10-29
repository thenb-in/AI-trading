const MODULE_PERMISSION_CONSTANTS = {
  APPROVE_USER: {
    name: 'Approve User',
    description: 'Permission to approve new users'
  },
  DEACTIVATE_USER: {
    name: 'Deactivate User',
    description: 'Permission to deactivate users'
  },
  GET_COMPANY_SETTINGS: {
    name: 'Get Company Settings',
    description: 'Permission to view company settings'
  },
  ADD_ROLE: {
    name: 'Add Role',
    description: 'Permission to add a new role'
  },
  LINK_ROLE_PERMISSION: {
    name: 'Link Role Permission',
    description: 'Permission to map permissions to roles'
  },
  IS_ADMIN: {
    name: 'isAdmin',
    description: 'Flag for admin-level access'
  },
  VIEW_COMPANY_SETTINGS: {
    name: 'View Company Settings',
    description: 'Permission to view company settings'
  },
  VIEW_ADMIN_LAYOUT: {
    name: 'View AdminLayout',
    description: 'Permission to access admin layout view'
  },
  HAS_ROLE_PERMISSION: {
    name: 'Has Role Permission',
    description: 'Permission for role and permission modules'
  },
  VIEW_USER_MODULE: {
    name: 'View User Module',
    description: 'Permission to view user module'
  },
  VIEW_COMPANY_MODULE: {
    name: 'View Company Module',
    description: 'Permission to view company module'
  },
  VIEW_ROLE_PERMISSION_MODULE: {
    name: 'View Role Permission Module',
    description: 'Permission to view role permission module'
  },
  CREATE_COMPANY: {
    name: 'Create Company',
    description: 'Permission to create a new company'
  }
};


const SYSTEM_ROLE_CONSTANTS = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    description: 'Super Admin role'
  },
  ADMIN: {
    name: 'Admin',
    description: 'Admin role'
  },
  USER: {
    name: 'User',
    description: 'User role'
  },
  COMPANY_ADMIN: {
    name: 'Company Admin',
    description: 'Company Admin role'
  },
  COMPANY_USER: {
    name: 'Company User',
    description: 'Company User role'
  }
};

module.exports = {
  MODULE_PERMISSION_CONSTANTS,
  SYSTEM_ROLE_CONSTANTS
};
