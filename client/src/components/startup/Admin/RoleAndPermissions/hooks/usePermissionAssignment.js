import { useState } from 'react';

export const usePermissionAssignment = (roles) => {
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleRoleChange = (roleId) => {
    setSelectedRoleId(roleId);
    setSelectedPermissions([]);
    
    if (roleId) {
      const selectedRole = roles.find(role => role.id === parseInt(roleId));
      if (selectedRole && selectedRole.permissions) {
        setSelectedPermissions(selectedRole.permissions.map(p => p.id));
      }
    }
  };

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const validateSelection = () => {
    if (!selectedRoleId) {
      return { valid: false, message: 'Please select a role' };
    }
    
    if (selectedPermissions.length === 0) {
      return { valid: false, message: 'Please select at least one permission' };
    }
    
    return { valid: true };
  };

  const resetSelection = () => {
    setSelectedRoleId('');
    setSelectedPermissions([]);
  };

  return {
    // State
    selectedRoleId,
    selectedPermissions,
    submitting,
    
    // Actions
    handleRoleChange,
    handlePermissionToggle,
    validateSelection,
    resetSelection,
    
    // Setters
    setSubmitting
  };
};
