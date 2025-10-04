// Utility functions for role and permission management

export const formatRoleName = (name) => {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

export const formatPermissionName = (name) => {
  if (!name) return '';
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const getRolePermissionCount = (role) => {
  return role?.permissions?.length || 0;
};

export const getTotalPermissionCount = (roles) => {
  return roles.reduce((total, role) => total + getRolePermissionCount(role), 0);
};

export const validateRoleName = (name) => {
  if (!name || !name.trim()) {
    return { valid: false, message: 'Role name is required' };
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < 2) {
    return { valid: false, message: 'Role name must be at least 2 characters long' };
  }
  
  if (trimmedName.length > 50) {
    return { valid: false, message: 'Role name cannot exceed 50 characters' };
  }
  
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
    return { valid: false, message: 'Role name can only contain letters, numbers, spaces, hyphens, and underscores' };
  }
  
  return { valid: true };
};

export const validatePermissionName = (name) => {
  if (!name || !name.trim()) {
    return { valid: false, message: 'Permission name is required' };
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < 2) {
    return { valid: false, message: 'Permission name must be at least 2 characters long' };
  }
  
  if (trimmedName.length > 50) {
    return { valid: false, message: 'Permission name cannot exceed 50 characters' };
  }
  
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
    return { valid: false, message: 'Permission name can only contain letters, numbers, spaces, hyphens, and underscores' };
  }
  
  return { valid: true };
};

export const validateDescription = (description) => {
  if (description && description.length > 500) {
    return { valid: false, message: 'Description cannot exceed 500 characters' };
  }
  
  return { valid: true };
};

export const sanitizeFormData = (formData) => {
  return {
    name: formData.name?.trim() || '',
    description: formData.description?.trim() || null
  };
};

export const getEmptyStateMessage = (type) => {
  const messages = {
    roles: {
      title: 'No roles found',
      description: 'Create your first role to get started',
      action: 'Create Role'
    },
    permissions: {
      title: 'No permissions assigned',
      description: 'This role doesn\'t have any permissions yet',
      action: 'Add Permissions'
    }
  };
  
  return messages[type] || messages.roles;
};
